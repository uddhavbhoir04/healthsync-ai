const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const {
    Booking,
    BookingItem,
    DoctorAppointment,
    LabCollectionDetail,
    Doctor,
    LabTest,
    DiagnosticPackage,
    User,
    UserAddress
} = require("../../models");
const notificationsService = require("../notifications/notifications.service");
const { EVENT_TYPES } = require("../notifications/notification.constants");

function getTodayDateStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
}

async function createBooking(userId, data) {
    const {
        bookingType,
        items,
        collectionType = "HOME",
        addressId,
        preferredDate,
        preferredTimeSlot,
        notes
    } = data;

    const todayStr = getTodayDateStr();
    if (preferredDate < todayStr) {
        const error = new Error("Preferred date cannot be in the past");
        error.status = 400;
        throw error;
    }

    // Verify address if home collection
    let verifiedAddress = null;
    if (collectionType === "HOME") {
        if (!addressId) {
            const error = new Error("Address is required for home sample collection");
            error.status = 400;
            throw error;
        }

        verifiedAddress = await UserAddress.findOne({
            where: { id: addressId, userId }
        });

        if (!verifiedAddress) {
            const error = new Error("Selected address not found or does not belong to you");
            error.status = 400;
            throw error;
        }
    }

    // Authoritative pricing: Look up items in the database
    const itemIds = items.map((i) => i.id);
    let resolvedItems = [];
    let subtotal = 0;

    if (bookingType === "LAB_TEST") {
        const dbTests = await LabTest.findAll({
            where: {
                id: { [Op.in]: itemIds },
                status: true
            }
        });

        if (dbTests.length !== itemIds.length) {
            const error = new Error("One or more selected lab tests are invalid or no longer available");
            error.status = 400;
            throw error;
        }

        const testMap = new Map(dbTests.map((t) => [t.id, t]));
        resolvedItems = items.map((reqItem) => {
            const test = testMap.get(reqItem.id);
            const qty = reqItem.quantity || 1;
            const price = parseFloat(test.price);
            const total = price * qty;
            subtotal += total;

            return {
                itemType: "LAB_TEST",
                itemId: test.id,
                itemName: test.testName,
                unitPrice: price,
                quantity: qty,
                totalPrice: total
            };
        });
    } else if (bookingType === "PACKAGE") {
        const dbPackages = await DiagnosticPackage.findAll({
            where: {
                id: { [Op.in]: itemIds },
                status: true
            }
        });

        if (dbPackages.length !== itemIds.length) {
            const error = new Error("One or more selected packages are invalid or no longer available");
            error.status = 400;
            throw error;
        }

        const pkgMap = new Map(dbPackages.map((p) => [p.id, p]));
        resolvedItems = items.map((reqItem) => {
            const pkg = pkgMap.get(reqItem.id);
            const qty = reqItem.quantity || 1;
            const price = parseFloat(pkg.offerPrice || pkg.originalPrice || pkg.price || 0);
            const total = price * qty;
            subtotal += total;

            return {
                itemType: "DIAGNOSTIC_PACKAGE",
                itemId: pkg.id,
                itemName: pkg.packageName,
                unitPrice: price,
                quantity: qty,
                totalPrice: total
            };
        });
    } else {
        const error = new Error("Invalid booking type for this endpoint");
        error.status = 400;
        throw error;
    }

    const discountAmount = 0.00;
    const totalAmount = subtotal - discountAmount;
    const prefix = bookingType === "LAB_TEST" ? "HS-LAB" : "HS-PKG";
    const bookingNumber = `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const t = await sequelize.transaction();

    try {
        const booking = await Booking.create(
            {
                bookingNumber,
                userId,
                bookingType,
                bookingStatus: "CONFIRMED",
                paymentStatus: "PENDING",
                subtotal,
                discountAmount,
                totalAmount,
                addressId: collectionType === "HOME" ? addressId : null,
                bookingDate: preferredDate,
                notes: notes || null
            },
            { transaction: t }
        );

        for (const item of resolvedItems) {
            await BookingItem.create(
                {
                    bookingId: booking.id,
                    ...item
                },
                { transaction: t }
            );
        }

        const collectionDetail = await LabCollectionDetail.create(
            {
                bookingId: booking.id,
                collectionType,
                addressId: collectionType === "HOME" ? addressId : null,
                preferredDate,
                preferredTimeSlot,
                sampleStatus: "PENDING",
                notes: notes || null
            },
            { transaction: t }
        );

        await t.commit();

        const fullBooking = await getBookingById(booking.id, userId, false);

        // Phase 7: Trigger Booking Created Notification & Schedule Lab Reminder
        try {
            const outbox = await notificationsService.createOutboxEvent(EVENT_TYPES.BOOKING_CREATED, {
                userId,
                userName: fullBooking.user?.name,
                email: fullBooking.user?.email,
                phone: fullBooking.user?.phone,
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                bookingType: booking.bookingType,
                totalAmount: booking.totalAmount,
                paymentStatus: booking.paymentStatus,
                date: preferredDate,
                timeSlot: preferredTimeSlot,
                bookingUrl: `/dashboard/bookings/${booking.id}`
            });
            await notificationsService.dispatchOutboxEvent(outbox.id);

            if (collectionDetail) {
                await notificationsService.scheduleLabReminder(collectionDetail.id);
            }
        } catch (notifErr) {
            console.warn("Booking notification dispatch notice:", notifErr.message);
        }

        return fullBooking;
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

async function listBookings(params, userId = null, isAdmin = false) {
    const {
        page = 1,
        limit = 10,
        type,
        status,
        search
    } = params;

    const offset = (page - 1) * limit;
    const where = {};

    if (!isAdmin && userId) {
        where.userId = userId;
    } else if (userId) {
        where.userId = userId;
    }

    if (type && type !== "all") {
        where.bookingType = type;
    }

    if (status && status !== "all") {
        where.bookingStatus = status;
    }

    if (search && search.trim()) {
        const query = `%${search.trim()}%`;
        where[Op.or] = [
            { bookingNumber: { [Op.like]: query } },
            { notes: { [Op.like]: query } }
        ];
    }

    const { count, rows } = await Booking.findAndCountAll({
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
                model: UserAddress,
                as: "address"
            },
            {
                model: BookingItem,
                as: "items"
            },
            {
                model: DoctorAppointment,
                as: "appointment",
                include: [
                    {
                        model: Doctor,
                        as: "doctor",
                        attributes: ["id", "doctorName", "specialization", "consultationFee", "profileImage", "city"]
                    }
                ]
            },
            {
                model: LabCollectionDetail,
                as: "labCollection",
                include: [
                    {
                        model: UserAddress,
                        as: "address"
                    }
                ]
            }
        ]
    });

    return {
        bookings: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit) || 1
        }
    };
}

async function getBookingById(bookingId, userId = null, isAdmin = false) {
    const booking = await Booking.findByPk(bookingId, {
        include: [
            {
                model: User,
                as: "user",
                attributes: ["id", "name", "email", "phone"]
            },
            {
                model: UserAddress,
                as: "address"
            },
            {
                model: BookingItem,
                as: "items"
            },
            {
                model: DoctorAppointment,
                as: "appointment",
                include: [
                    {
                        model: Doctor,
                        as: "doctor",
                        attributes: ["id", "doctorName", "specialization", "qualification", "consultationFee", "profileImage", "city"]
                    }
                ]
            },
            {
                model: LabCollectionDetail,
                as: "labCollection",
                include: [
                    {
                        model: UserAddress,
                        as: "address"
                    }
                ]
            }
        ]
    });

    if (!booking) {
        const error = new Error("Booking not found");
        error.status = 404;
        throw error;
    }

    if (!isAdmin && userId && Number(booking.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to access this booking");
        error.status = 403;
        throw error;
    }

    return booking;
}

async function cancelBooking(bookingId, userId = null, reason = "", isAdmin = false) {
    const booking = await Booking.findByPk(bookingId, {
        include: [
            { model: DoctorAppointment, as: "appointment" },
            { model: LabCollectionDetail, as: "labCollection" }
        ]
    });

    if (!booking) {
        const error = new Error("Booking not found");
        error.status = 404;
        throw error;
    }

    if (!isAdmin && userId && Number(booking.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to cancel this booking");
        error.status = 403;
        throw error;
    }

    if (booking.bookingStatus === "CANCELLED") {
        const error = new Error("Booking is already cancelled");
        error.status = 400;
        throw error;
    }

    if (booking.bookingStatus === "COMPLETED") {
        const error = new Error("Completed bookings cannot be cancelled");
        error.status = 400;
        throw error;
    }

    const t = await sequelize.transaction();

    try {
        await booking.update(
            { bookingStatus: "CANCELLED" },
            { transaction: t }
        );

        if (booking.appointment) {
            await booking.appointment.update(
                {
                    appointmentStatus: "CANCELLED",
                    cancellationReason: reason || "Cancelled by user"
                },
                { transaction: t }
            );
        }

        if (booking.labCollection) {
            await booking.labCollection.update(
                {
                    sampleStatus: "CANCELLED"
                },
                { transaction: t }
            );
        }

        await t.commit();
        const fullBooking = await getBookingById(booking.id, userId, isAdmin);

        // Phase 7: Trigger Booking Cancelled Notification
        try {
            const outbox = await notificationsService.createOutboxEvent(EVENT_TYPES.BOOKING_CANCELLED, {
                userId: booking.userId,
                userName: fullBooking.user?.name,
                email: fullBooking.user?.email,
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                reason: reason || "Cancelled by user",
                dashboardUrl: `/dashboard/bookings`
            });
            await notificationsService.dispatchOutboxEvent(outbox.id);
        } catch (notifErr) {
            console.warn("Cancellation notification dispatch notice:", notifErr.message);
        }

        return fullBooking;
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

async function adminUpdateBookingStatus(bookingId, statusData) {
    const booking = await Booking.findByPk(bookingId, {
        include: [
            { model: DoctorAppointment, as: "appointment" },
            { model: LabCollectionDetail, as: "labCollection" }
        ]
    });

    if (!booking) {
        const error = new Error("Booking not found");
        error.status = 404;
        throw error;
    }

    const t = await sequelize.transaction();

    try {
        const bookingUpdates = {};
        if (statusData.bookingStatus) bookingUpdates.bookingStatus = statusData.bookingStatus;
        if (statusData.paymentStatus) bookingUpdates.paymentStatus = statusData.paymentStatus;

        if (Object.keys(bookingUpdates).length > 0) {
            await booking.update(bookingUpdates, { transaction: t });
        }

        if (statusData.sampleStatus && booking.labCollection) {
            await booking.labCollection.update(
                { sampleStatus: statusData.sampleStatus },
                { transaction: t }
            );
        }

        if (statusData.appointmentStatus && booking.appointment) {
            await booking.appointment.update(
                { appointmentStatus: statusData.appointmentStatus },
                { transaction: t }
            );
        }

        await t.commit();
        return getBookingById(booking.id, null, true);
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

module.exports = {
    createBooking,
    listBookings,
    getBookingById,
    cancelBooking,
    adminUpdateBookingStatus
};

