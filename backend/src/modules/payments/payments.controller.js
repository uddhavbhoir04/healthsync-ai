const paymentsService = require("./payments.service");

// --- Patient Payment Endpoints ---

exports.createOrder = async (req, res, next) => {
    try {
        const orderData = await paymentsService.createPaymentOrder(req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: "Payment order initiated successfully",
            data: orderData
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const verificationResult = await paymentsService.verifyPayment(req.user.id, req.body);
        res.json({
            success: true,
            message: "Payment verified successfully",
            data: verificationResult
        });
    } catch (error) {
        next(error);
    }
};

exports.retryPayment = async (req, res, next) => {
    try {
        const retryData = await paymentsService.retryPayment(req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: "Payment retry order created successfully",
            data: retryData
        });
    } catch (error) {
        next(error);
    }
};

exports.payOnCollection = async (req, res, next) => {
    try {
        const result = await paymentsService.choosePayOnCollection(req.user.id, req.body);
        res.json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

exports.listMyPayments = async (req, res, next) => {
    try {
        const result = await paymentsService.listUserPayments(req.user.id, req.validatedQuery || req.query);
        res.json({
            success: true,
            data: result.payments,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getPaymentById = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === "ADMIN";
        const payment = await paymentsService.getPaymentById(req.params.id, req.user.id, isAdmin);
        res.json({
            success: true,
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

exports.getPaymentsForBooking = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === "ADMIN";
        const payments = await paymentsService.getPaymentsByBookingId(req.params.bookingId, req.user.id, isAdmin);
        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyRefunds = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === "ADMIN";
        const refunds = await paymentsService.getRefundsByPaymentId(req.params.id, req.user.id, isAdmin);
        res.json({
            success: true,
            data: refunds
        });
    } catch (error) {
        next(error);
    }
};

// --- Admin Payment Governance ---

exports.adminListPayments = async (req, res, next) => {
    try {
        const result = await paymentsService.adminListPayments(req.validatedQuery || req.query);
        res.json({
            success: true,
            data: result.payments,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.adminInitiateRefund = async (req, res, next) => {
    try {
        const refund = await paymentsService.adminInitiateRefund(req.params.id, req.body);
        res.status(201).json({
            success: true,
            message: "Refund processed successfully",
            data: refund
        });
    } catch (error) {
        next(error);
    }
};

exports.adminGetRefunds = async (req, res, next) => {
    try {
        const refunds = await paymentsService.getRefundsByPaymentId(req.params.id, null, true);
        res.json({
            success: true,
            data: refunds
        });
    } catch (error) {
        next(error);
    }
};

// --- Webhook Processing ---

exports.handleRazorpayWebhook = async (req, res, next) => {
    try {
        const signature = req.headers["x-razorpay-signature"];
        if (!signature) {
            return res.status(400).json({
                success: false,
                message: "Missing 'x-razorpay-signature' header"
            });
        }

        const rawBody = req.rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
        const eventPayload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

        const result = await paymentsService.processWebhookEvent(rawBody, signature, eventPayload);
        res.status(200).json({
            status: "ok",
            data: result
        });
    } catch (error) {
        console.error("Webhook processing error:", error.message);
        res.status(error.status || 400).json({
            success: false,
            message: error.message || "Webhook processing failed"
        });
    }
};

