const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const {
    PaymentTransaction,
    RefundTransaction,
    WebhookEvent,
    Booking,
    BookingItem,
    DoctorAppointment,
    LabCollectionDetail,
    User
} = require("../../models");
const notificationsService = require("../notifications/notifications.service");
const { EVENT_TYPES } = require("../notifications/notification.constants");

const {
    amountToPaise,
    createRazorpayOrder,
    verifyCheckoutSignature,
    verifyWebhookSignature,
    createRazorpayRefund,
    fetchRazorpayPayment,
    RAZORPAY_KEY_ID
} = require("../../utils/razorpay");

/**
 * 1. Create a Payment Order for a Booking
 */
async function createPaymentOrder(userId, { bookingId, idempotencyKey }) {
    const booking = await Booking.findByPk(bookingId, {
        include: [
            { model: BookingItem, as: "items" },
            { model: User, as: "user", attributes: ["id", "name", "email", "phone"] }
        ]
    });

    if (!booking) {
        const error = new Error("Booking not found");
        error.status = 404;
        throw error;
    }

    if (Number(booking.userId) !== Number(userId)) {
        const error = new Error("Unauthorized: You do not own this booking");
        error.status = 403;
        throw error;
    }

    if (booking.bookingStatus === "CANCELLED") {
        const error = new Error("Cannot make payment for a cancelled booking");
        error.status = 400;
        throw error;
    }

    if (booking.paymentStatus === "PAID") {
        const error = new Error("This booking has already been paid successfully");
        error.status = 400;
        throw error;
    }

    const amount = parseFloat(booking.totalAmount);
    if (isNaN(amount) || amount <= 0) {
        const error = new Error("Invalid booking total amount for payment processing");
        error.status = 400;
        throw error;
    }

    // Check for existing active payment with the provided idempotency key
    if (idempotencyKey) {
        const existingTx = await PaymentTransaction.findOne({
            where: {
                idempotencyKey,
                bookingId: booking.id,
                userId,
                paymentStatus: { [Op.in]: ["CREATED", "PENDING"] }
            }
        });

        if (existingTx) {
            return {
                paymentTransactionId: existingTx.id,
                razorpayOrderId: existingTx.gatewayOrderId,
                razorpayKeyId: RAZORPAY_KEY_ID,
                amount: amountToPaise(existingTx.amount),
                currency: existingTx.currency,
                bookingNumber: booking.bookingNumber,
                isReused: true
            };
        }
    }

    const effectiveIdempotencyKey = idempotencyKey || `PAY_BK_${booking.id}_${Date.now()}`;

    // Call Razorpay Orders API
    const razorpayOrder = await createRazorpayOrder({
        amount,
        currency: "INR",
        receipt: booking.bookingNumber,
        notes: {
            bookingId: booking.id,
            userId,
            bookingNumber: booking.bookingNumber
        }
    });

    // Record Payment Transaction inside database
    const paymentTransaction = await PaymentTransaction.create({
        bookingId: booking.id,
        userId,
        gateway: "RAZORPAY",
        gatewayOrderId: razorpayOrder.id,
        idempotencyKey: effectiveIdempotencyKey,
        amount,
        currency: "INR",
        paymentStatus: "CREATED"
    });

    return {
        paymentTransactionId: paymentTransaction.id,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: razorpayOrder.keyId || RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        bookingNumber: booking.bookingNumber
    };
}

/**
 * 2. Verify Payment Signature & Update Booking
 */
async function verifyPayment(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    // Cryptographic HMAC SHA256 Signature Verification
    const isSignatureValid = verifyCheckoutSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    );

    const transaction = await PaymentTransaction.findOne({
        where: { gatewayOrderId: razorpay_order_id },
        include: [{ model: Booking, as: "booking" }]
    });

    if (!transaction) {
        const error = new Error("Payment transaction record not found for this order ID");
        error.status = 404;
        throw error;
    }

    if (Number(transaction.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to verify payment for this transaction");
        error.status = 403;
        throw error;
    }

    if (!isSignatureValid) {
        // Record failure for audit
        await transaction.update({
            paymentStatus: "FAILED",
            gatewayPaymentId: razorpay_payment_id,
            gatewaySignature: razorpay_signature,
            errorCode: "BAD_SIGNATURE",
            errorDescription: "Client payment signature verification failed"
        });

        const error = new Error("Invalid Razorpay payment signature. Payment cannot be verified.");
        error.status = 400;
        throw error;
    }

    // Idempotent success: If already verified as SUCCESS, return safely
    if (transaction.paymentStatus === "SUCCESS") {
        return {
            verified: true,
            paymentStatus: "SUCCESS",
            bookingNumber: transaction.booking?.bookingNumber,
            transactionId: transaction.id,
            message: "Payment was already verified successfully"
        };
    }

    const t = await sequelize.transaction();

    try {
        await transaction.update(
            {
                gatewayPaymentId: razorpay_payment_id,
                gatewaySignature: razorpay_signature,
                paymentStatus: "SUCCESS",
                paidAt: new Date()
            },
            { transaction: t }
        );

        if (transaction.booking) {
            const bookingUpdates = {
                paymentStatus: "PAID"
            };

            // If booking was PENDING confirmation, confirm it now
            if (transaction.booking.bookingStatus === "PENDING") {
                bookingUpdates.bookingStatus = "CONFIRMED";
            }

            await transaction.booking.update(bookingUpdates, { transaction: t });
        }

        await t.commit();

        // Phase 7: Trigger Payment Success Notification
        try {
            const user = await User.findByPk(transaction.userId);
            const outbox = await notificationsService.createOutboxEvent(EVENT_TYPES.PAYMENT_SUCCESS, {
                userId: transaction.userId,
                userName: user?.name,
                email: user?.email,
                bookingId: transaction.bookingId,
                bookingNumber: transaction.booking?.bookingNumber,
                amount: Math.round(parseFloat(transaction.amount) * 100),
                paymentId: razorpay_payment_id,
                date: new Date().toLocaleDateString(),
                receiptUrl: `/dashboard/payments/${transaction.id}`
            });
            await notificationsService.dispatchOutboxEvent(outbox.id);
        } catch (notifErr) {
            console.warn("Payment success notification notice:", notifErr.message);
        }

        return {
            verified: true,
            paymentStatus: "SUCCESS",
            bookingNumber: transaction.booking?.bookingNumber,
            transactionId: transaction.id,
            amount: transaction.amount,
            currency: transaction.currency,
            paidAt: transaction.paidAt
        };
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

/**
 * 3. Payment Retry
 */
async function retryPayment(userId, { bookingId }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
        const error = new Error("Booking not found");
        error.status = 404;
        throw error;
    }

    if (Number(booking.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to retry payment for this booking");
        error.status = 403;
        throw error;
    }

    if (booking.bookingStatus === "CANCELLED") {
        const error = new Error("Cannot retry payment for a cancelled booking");
        error.status = 400;
        throw error;
    }

    if (booking.paymentStatus === "PAID") {
        const error = new Error("Booking has already been paid successfully. Retry is not permitted.");
        error.status = 400;
        throw error;
    }

    // Generate distinct idempotency key for this retry attempt
    const retryKey = `RETRY_BK_${booking.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return createPaymentOrder(userId, { bookingId: booking.id, idempotencyKey: retryKey });
}

/**
 * 4. Process Inbound Webhook Event from Razorpay
 */
async function processWebhookEvent(rawBody, signature, event) {
    // 1. Verify Webhook Signature
    const isWebhookValid = verifyWebhookSignature(rawBody, signature);
    if (!isWebhookValid) {
        const error = new Error("Invalid Razorpay webhook signature");
        error.status = 400;
        throw error;
    }

    const eventId = event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventType = event.event;

    // 2. Check for duplicate event (Idempotency protection)
    const existingEvent = await WebhookEvent.findOne({ where: { eventId } });
    if (existingEvent && existingEvent.status === "PROCESSED") {
        return {
            success: true,
            idempotent: true,
            message: `Event ${eventId} (${eventType}) was already processed.`
        };
    }

    const t = await sequelize.transaction();

    try {
        let recordedEvent = existingEvent;
        if (!recordedEvent) {
            recordedEvent = await WebhookEvent.create(
                {
                    eventId,
                    eventType,
                    payload: event,
                    status: "PENDING"
                },
                { transaction: t }
            );
        }

        // 3. Process Event Types
        if (eventType === "payment.captured" || eventType === "order.paid") {
            const paymentEntity = event.payload?.payment?.entity;
            const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;

            if (orderId) {
                const tx = await PaymentTransaction.findOne({
                    where: { gatewayOrderId: orderId },
                    include: [{ model: Booking, as: "booking" }],
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (tx) {
                    if (tx.paymentStatus !== "SUCCESS") {
                        await tx.update(
                            {
                                gatewayPaymentId: paymentEntity?.id || tx.gatewayPaymentId,
                                paymentStatus: "SUCCESS",
                                paymentMethod: paymentEntity?.method || tx.paymentMethod,
                                paidAt: new Date()
                            },
                            { transaction: t }
                        );

                        if (tx.booking && tx.booking.bookingStatus !== "CANCELLED") {
                            await tx.booking.update(
                                {
                                    paymentStatus: "PAID",
                                    bookingStatus: tx.booking.bookingStatus === "PENDING" ? "CONFIRMED" : tx.booking.bookingStatus
                                },
                                { transaction: t }
                            );
                        }
                    }
                }
            }
        } else if (eventType === "payment.failed") {
            const paymentEntity = event.payload?.payment?.entity;
            const orderId = paymentEntity?.order_id;

            if (orderId) {
                const tx = await PaymentTransaction.findOne({
                    where: { gatewayOrderId: orderId },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                // Out-of-order safety: Never downgrade an already successful payment to FAILED
                if (tx && tx.paymentStatus !== "SUCCESS") {
                    await tx.update(
                        {
                            gatewayPaymentId: paymentEntity.id || tx.gatewayPaymentId,
                            paymentStatus: "FAILED",
                            errorCode: paymentEntity.error_code || "PAYMENT_FAILED",
                            errorDescription: paymentEntity.error_description || "Payment failed via gateway"
                        },
                        { transaction: t }
                    );
                }
            }
        } else if (eventType === "refund.processed" || eventType === "refund.created") {
            const refundEntity = event.payload?.refund?.entity;
            const paymentId = refundEntity?.payment_id;

            if (paymentId) {
                const tx = await PaymentTransaction.findOne({
                    where: { gatewayPaymentId: paymentId },
                    include: [{ model: Booking, as: "booking" }],
                    transaction: t
                });

                if (tx) {
                    const refundAmount = parseFloat(refundEntity.amount ? (refundEntity.amount / 100).toFixed(2) : 0);

                    // Check if refund record exists
                    let refundTx = await RefundTransaction.findOne({
                        where: { gatewayRefundId: refundEntity.id },
                        transaction: t
                    });

                    if (!refundTx) {
                        await RefundTransaction.create(
                            {
                                paymentTransactionId: tx.id,
                                bookingId: tx.bookingId,
                                userId: tx.userId,
                                gatewayRefundId: refundEntity.id,
                                amount: refundAmount,
                                currency: refundEntity.currency || "INR",
                                refundStatus: "PROCESSED",
                                reason: refundEntity.notes?.reason || "Webhook processed refund",
                                processedAt: new Date()
                            },
                            { transaction: t }
                        );
                    } else if (refundTx.refundStatus !== "PROCESSED") {
                        await refundTx.update(
                            {
                                refundStatus: "PROCESSED",
                                processedAt: new Date()
                            },
                            { transaction: t }
                        );
                    }

                    // Re-calculate total refunded
                    const allRefunds = await RefundTransaction.findAll({
                        where: { paymentTransactionId: tx.id, refundStatus: "PROCESSED" },
                        transaction: t
                    });
                    const totalRefunded = allRefunds.reduce((acc, r) => acc + parseFloat(r.amount), 0);
                    const isFullRefund = totalRefunded >= parseFloat(tx.amount);

                    const newStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";
                    await tx.update({ paymentStatus: newStatus }, { transaction: t });

                    if (tx.booking) {
                        await tx.booking.update({ paymentStatus: newStatus }, { transaction: t });
                    }
                }
            }
        }

        await recordedEvent.update({ status: "PROCESSED" }, { transaction: t });
        await t.commit();

        return {
            success: true,
            eventId,
            eventType,
            status: "PROCESSED"
        };
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

/**
 * 5. Admin Initiate Refund
 */
async function adminInitiateRefund(paymentId, { amount, reason }) {
    const payment = await PaymentTransaction.findByPk(paymentId, {
        include: [
            { model: Booking, as: "booking" },
            { model: RefundTransaction, as: "refunds" }
        ]
    });

    if (!payment) {
        const error = new Error("Payment transaction not found");
        error.status = 404;
        throw error;
    }

    if (payment.paymentStatus !== "SUCCESS" && payment.paymentStatus !== "PARTIALLY_REFUNDED") {
        const error = new Error(`Only captured SUCCESS or PARTIALLY_REFUNDED payments can be refunded. Current status: ${payment.paymentStatus}`);
        error.status = 400;
        throw error;
    }

    if (!payment.gatewayPaymentId) {
        const error = new Error("Cannot refund a transaction without a verified gateway payment ID");
        error.status = 400;
        throw error;
    }

    const capturedAmount = parseFloat(payment.amount);
    const existingRefunds = payment.refunds || [];
    const existingRefundedAmount = existingRefunds
        .filter((r) => r.refundStatus === "PROCESSED" || r.refundStatus === "PENDING")
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    const maxRefundable = parseFloat((capturedAmount - existingRefundedAmount).toFixed(2));

    if (maxRefundable <= 0) {
        const error = new Error("This payment transaction has already been fully refunded");
        error.status = 400;
        throw error;
    }

    const refundAmount = amount ? parseFloat(amount) : maxRefundable;

    if (isNaN(refundAmount) || refundAmount <= 0) {
        const error = new Error("Refund amount must be a positive number");
        error.status = 400;
        throw error;
    }

    if (refundAmount > maxRefundable) {
        const error = new Error(
            `Refund amount ($${refundAmount.toFixed(2)}) exceeds maximum remaining refundable balance ($${maxRefundable.toFixed(2)})`
        );
        error.status = 400;
        throw error;
    }

    // Call Razorpay Refund API
    const razorpayRefund = await createRazorpayRefund(payment.gatewayPaymentId, {
        amount: refundAmount,
        notes: {
            reason: reason || "Admin requested refund",
            paymentTransactionId: payment.id,
            bookingId: payment.bookingId
        }
    });

    const t = await sequelize.transaction();

    try {
        const refundRecord = await RefundTransaction.create(
            {
                paymentTransactionId: payment.id,
                bookingId: payment.bookingId,
                userId: payment.userId,
                gatewayRefundId: razorpayRefund.id,
                amount: refundAmount,
                currency: payment.currency,
                refundStatus: razorpayRefund.status || "PROCESSED",
                reason: reason || "Administrative refund",
                processedAt: new Date()
            },
            { transaction: t }
        );

        const newTotalRefunded = existingRefundedAmount + refundAmount;
        const isFullRefund = newTotalRefunded >= capturedAmount;
        const newPaymentStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

        await payment.update({ paymentStatus: newPaymentStatus }, { transaction: t });

        if (payment.booking) {
            await payment.booking.update({ paymentStatus: newPaymentStatus }, { transaction: t });
        }

        await t.commit();

        // Phase 7: Trigger Refund Notification
        try {
            const user = await User.findByPk(payment.userId);
            const outbox = await notificationsService.createOutboxEvent(EVENT_TYPES.REFUND_PROCESSED, {
                userId: payment.userId,
                userName: user?.name,
                email: user?.email,
                bookingId: payment.bookingId,
                bookingNumber: payment.booking?.bookingNumber,
                amount: Math.round(refundAmount * 100),
                refundId: razorpayRefund.id,
                dashboardUrl: `/dashboard/payments`
            });
            await notificationsService.dispatchOutboxEvent(outbox.id);
        } catch (notifErr) {
            console.warn("Refund notification notice:", notifErr.message);
        }

        return refundRecord;
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

/**
 * 6. List User Payment History
 */
async function listUserPayments(userId, query = {}) {
    const {
        page = 1,
        limit = 10,
        status,
        bookingNumber,
        paymentMethod,
        startDate,
        endDate
    } = query;

    const offset = (page - 1) * limit;
    const where = { userId };

    if (status && status !== "all") {
        where.paymentStatus = status;
    }
    if (paymentMethod && paymentMethod !== "all") {
        where.paymentMethod = paymentMethod;
    }
    if (startDate && endDate) {
        where.createdAt = {
            [Op.between]: [new Date(`${startDate}T00:00:00Z`), new Date(`${endDate}T23:59:59Z`)]
        };
    }

    const bookingWhere = {};
    if (bookingNumber) {
        bookingWhere.bookingNumber = { [Op.like]: `%${bookingNumber.trim()}%` };
    }

    const { count, rows } = await PaymentTransaction.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        offset,
        limit,
        include: [
            {
                model: Booking,
                as: "booking",
                where: Object.keys(bookingWhere).length > 0 ? bookingWhere : undefined,
                required: Object.keys(bookingWhere).length > 0,
                attributes: ["id", "bookingNumber", "bookingType", "bookingStatus", "totalAmount"]
            },
            {
                model: RefundTransaction,
                as: "refunds"
            }
        ]
    });

    return {
        payments: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit) || 1
        }
    };
}

/**
 * 7. Get Single Payment Details
 */
async function getPaymentById(paymentId, userId = null, isAdmin = false) {
    const payment = await PaymentTransaction.findByPk(paymentId, {
        include: [
            {
                model: Booking,
                as: "booking",
                include: [
                    { model: BookingItem, as: "items" },
                    { model: DoctorAppointment, as: "appointment" },
                    { model: LabCollectionDetail, as: "labCollection" }
                ]
            },
            {
                model: User,
                as: "user",
                attributes: ["id", "name", "email", "phone"]
            },
            {
                model: RefundTransaction,
                as: "refunds"
            }
        ]
    });

    if (!payment) {
        const error = new Error("Payment transaction not found");
        error.status = 404;
        throw error;
    }

    if (!isAdmin && userId && Number(payment.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to access this payment transaction");
        error.status = 403;
        throw error;
    }

    return payment;
}

/**
 * 8. Get Payments for a Booking
 */
async function getPaymentsByBookingId(bookingId, userId = null, isAdmin = false) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
        const error = new Error("Booking not found");
        error.status = 404;
        throw error;
    }

    if (!isAdmin && userId && Number(booking.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to access payments for this booking");
        error.status = 403;
        throw error;
    }

    const payments = await PaymentTransaction.findAll({
        where: { bookingId },
        order: [["createdAt", "DESC"]],
        include: [{ model: RefundTransaction, as: "refunds" }]
    });

    return payments;
}

/**
 * 9. Admin List All Platform Payments
 */
async function adminListPayments(query = {}) {
    const {
        page = 1,
        limit = 10,
        status,
        search,
        startDate,
        endDate
    } = query;

    const offset = (page - 1) * limit;
    const where = {};

    if (status && status !== "all") {
        where.paymentStatus = status;
    }

    if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        where[Op.or] = [
            { gatewayOrderId: { [Op.like]: q } },
            { gatewayPaymentId: { [Op.like]: q } },
            { idempotencyKey: { [Op.like]: q } }
        ];
    }

    if (startDate && endDate) {
        where.createdAt = {
            [Op.between]: [new Date(`${startDate}T00:00:00Z`), new Date(`${endDate}T23:59:59Z`)]
        };
    }

    const { count, rows } = await PaymentTransaction.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        offset,
        limit,
        include: [
            {
                model: User,
                as: "user",
                attributes: ["id", "name", "email", "phone"]
            },
            {
                model: Booking,
                as: "booking",
                attributes: ["id", "bookingNumber", "bookingType", "bookingStatus", "totalAmount"]
            },
            {
                model: RefundTransaction,
                as: "refunds"
            }
        ]
    });

    return {
        payments: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit) || 1
        }
    };
}

/**
 * 10. Get Refund History for a Payment
 */
async function getRefundsByPaymentId(paymentId, userId = null, isAdmin = false) {
    const payment = await PaymentTransaction.findByPk(paymentId);
    if (!payment) {
        const error = new Error("Payment transaction not found");
        error.status = 404;
        throw error;
    }

    if (!isAdmin && userId && Number(payment.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to access refunds for this transaction");
        error.status = 403;
        throw error;
    }

    const refunds = await RefundTransaction.findAll({
        where: { paymentTransactionId: paymentId },
        order: [["createdAt", "DESC"]]
    });

    return refunds;
}

/**
 * 11. Choose Pay on Collection / Clinic Visit
 */
async function choosePayOnCollection(userId, { bookingId, paymentMethod = "PAY_ON_COLLECTION" }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
        const error = new Error("Booking not found");
        error.status = 404;
        throw error;
    }

    if (Number(booking.userId) !== Number(userId)) {
        const error = new Error("Unauthorized: You do not own this booking");
        error.status = 403;
        throw error;
    }

    if (booking.bookingStatus === "CANCELLED") {
        const error = new Error("Cannot select payment method for a cancelled booking");
        error.status = 400;
        throw error;
    }

    if (booking.paymentStatus === "PAID") {
        const error = new Error("This booking has already been paid");
        error.status = 400;
        throw error;
    }

    // Check if an existing transaction exists or create one
    let transaction = await PaymentTransaction.findOne({
        where: { bookingId: booking.id, userId },
        order: [["createdAt", "DESC"]]
    });

    if (transaction && transaction.paymentStatus === "CREATED") {
        await transaction.update({
            paymentMethod: "PAY_ON_COLLECTION",
            paymentStatus: "PENDING",
            errorDescription: "Patient selected Pay at Collection / Clinic Visit"
        });
    } else {
        transaction = await PaymentTransaction.create({
            bookingId: booking.id,
            userId,
            gateway: "RAZORPAY",
            gatewayOrderId: `order_poc_${booking.id}_${Date.now()}`,
            amount: booking.totalAmount,
            currency: "INR",
            paymentStatus: "PENDING",
            paymentMethod: "PAY_ON_COLLECTION",
            errorDescription: "Patient selected Pay at Collection / Clinic Visit"
        });
    }

    return {
        success: true,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        bookingType: booking.bookingType,
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
        paymentMethod: "PAY_ON_COLLECTION",
        message: "Pay on collection recorded. You may pay at the time of visit/sample collection, or complete payment online anytime from your dashboard."
    };
}

module.exports = {
    createPaymentOrder,
    verifyPayment,
    retryPayment,
    choosePayOnCollection,
    processWebhookEvent,
    adminInitiateRefund,
    listUserPayments,
    getPaymentById,
    getPaymentsByBookingId,
    adminListPayments,
    getRefundsByPaymentId
};

