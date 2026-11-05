/**
 * HealthSync AI - Central Notification Service
 * Orchestrates Outbox events, In-App notifications, Email delivery,
 * Web Push, SMS, and BullMQ background job queues.
 */

const crypto = require("crypto");
const { Op } = require("sequelize");
const {
    Notification,
    NotificationPreference,
    PushSubscription,
    NotificationOutbox,
    User,
    Booking,
    DoctorAppointment,
    LabCollectionDetail
} = require("../../models");
const { EVENT_TYPES, CHANNELS, NOTIFICATION_STATUS, OUTBOX_STATUS, QUEUE_NAMES } = require("./notification.constants");
const { renderTemplate } = require("./templates/email.templates");
const { sendEmail } = require("./providers/email.provider");
const { sendPushNotification } = require("./providers/push.provider");
const { sendSMS } = require("./providers/sms.provider");
const { addJob } = require("./queue");

const hashEndpoint = (endpoint) => crypto.createHash("sha256").update(endpoint).digest("hex");

// ==========================================
// 1. PREFERENCES MANAGEMENT
// ==========================================

async function getOrCreatePreferences(userId) {
    let prefs = await NotificationPreference.findOne({ where: { userId } });
    if (!prefs) {
        prefs = await NotificationPreference.create({
            userId,
            emailEnabled: true,
            pushEnabled: true,
            smsEnabled: false,
            appointmentReminders: true,
            bookingUpdates: true,
            paymentUpdates: true,
            reportUpdates: true
        });
    }
    return prefs;
}

async function updatePreferences(userId, updates) {
    const prefs = await getOrCreatePreferences(userId);
    const allowed = [
        "emailEnabled",
        "pushEnabled",
        "smsEnabled",
        "appointmentReminders",
        "bookingUpdates",
        "paymentUpdates",
        "reportUpdates"
    ];

    const patch = {};
    for (const key of allowed) {
        if (typeof updates[key] === "boolean") {
            patch[key] = updates[key];
        }
    }

    await prefs.update(patch);
    return prefs;
}

// ==========================================
// 2. PUSH SUBSCRIPTIONS
// ==========================================

async function savePushSubscription(userId, { endpoint, keys, deviceName }) {
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error("Invalid push subscription payload");
    }

    const endpointHash = hashEndpoint(endpoint);
    const [sub, created] = await PushSubscription.findOrCreate({
        where: { userId, endpointHash },
        defaults: {
            userId,
            endpoint,
            endpointHash,
            p256dh: keys.p256dh,
            auth: keys.auth,
            deviceName: deviceName || "Browser",
            isActive: true
        }
    });

    if (!created) {
        await sub.update({
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            deviceName: deviceName || sub.deviceName,
            isActive: true
        });
    }

    return sub;
}

async function removePushSubscription(userId, endpoint) {
    if (!endpoint) return false;
    const endpointHash = hashEndpoint(endpoint);
    const count = await PushSubscription.destroy({
        where: { userId, endpointHash }
    });
    return count > 0;
}

// ==========================================
// 3. IN-APP NOTIFICATIONS & LISTING
// ==========================================

async function listNotifications(userId, { page = 1, limit = 20, isRead, type, channel }) {
    const where = { userId };

    if (isRead !== undefined && isRead !== "") {
        where.isRead = isRead === "true" || isRead === true;
    }
    if (type) {
        where.notificationType = type;
    }
    if (channel) {
        where.channel = channel;
    }

    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const { count, rows } = await Notification.findAndCountAll({
        where,
        order: [["created_at", "DESC"]],
        limit: Number(limit),
        offset
    });

    return {
        notifications: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit))
        }
    };
}

async function getUnreadCount(userId) {
    return await Notification.count({
        where: { userId, isRead: false }
    });
}

async function markAsRead(userId, notificationId) {
    const notif = await Notification.findOne({
        where: { id: notificationId, userId }
    });
    if (!notif) {
        throw new Error("Notification not found");
    }
    await notif.update({ isRead: true, status: NOTIFICATION_STATUS.READ });
    return notif;
}

async function markAllAsRead(userId) {
    const [updatedCount] = await Notification.update(
        { isRead: true, status: NOTIFICATION_STATUS.READ },
        { where: { userId, isRead: false } }
    );
    return { updatedCount };
}

async function deleteNotification(userId, notificationId) {
    const count = await Notification.destroy({
        where: { id: notificationId, userId }
    });
    if (count === 0) {
        throw new Error("Notification not found");
    }
    return true;
}

// ==========================================
// 4. DATABASE OUTBOX & DISPATCHER
// ==========================================

/**
 * Create an outbox event within a transaction (or standalone).
 * Guarantees zero loss if server restarts right after transaction commits.
 */
async function createOutboxEvent(eventType, eventPayload, transaction = null) {
    const opts = transaction ? { transaction } : {};
    const outbox = await NotificationOutbox.create(
        {
            eventType,
            eventPayload,
            status: OUTBOX_STATUS.PENDING,
            attempts: 0,
            availableAt: new Date()
        },
        opts
    );
    return outbox;
}

/**
 * Dispatch an outbox event asynchronously to BullMQ queue or direct processor fallback.
 */
async function dispatchOutboxEvent(outboxId) {
    const outbox = await NotificationOutbox.findByPk(outboxId);
    if (!outbox || outbox.status === OUTBOX_STATUS.COMPLETED) return;

    // Try queueing via BullMQ
    const job = await addJob(QUEUE_NAMES.EMAIL, `outbox-${outbox.id}`, { outboxId: outbox.id });
    if (job) {
        await outbox.update({ status: OUTBOX_STATUS.PROCESSING });
    } else {
        // Direct resilient fallback when Redis is offline in local dev
        setImmediate(async () => {
            try {
                await processOutboxEvent(outbox.id);
            } catch (err) {
                console.error(`[Outbox Fallback Error #${outbox.id}]:`, err.message);
            }
        });
    }
}

/**
 * Process an Outbox Event: checks user preferences and delivers via requested channels.
 */
async function processOutboxEvent(outboxId) {
    const outbox = await NotificationOutbox.findByPk(outboxId);
    if (!outbox || outbox.status === OUTBOX_STATUS.COMPLETED) return;

    const { eventType, eventPayload } = outbox;
    const userId = eventPayload.userId;

    await outbox.update({
        attempts: outbox.attempts + 1,
        status: OUTBOX_STATUS.PROCESSING
    });

    try {
        const user = userId ? await User.findByPk(userId) : null;
        const prefs = userId ? await getOrCreatePreferences(userId) : null;

        // Determine if preference allows this notification type
        const isReminder = eventType.includes("REMINDER");
        const isBooking = eventType.includes("BOOKING");
        const isPayment = eventType.includes("PAYMENT") || eventType.includes("REFUND");
        const isReport = eventType.includes("REPORT");

        const allowEmail = !prefs || (prefs.emailEnabled && (
            (isReminder && prefs.appointmentReminders) ||
            (isBooking && prefs.bookingUpdates) ||
            (isPayment && prefs.paymentUpdates) ||
            (isReport && prefs.reportUpdates) ||
            eventType === EVENT_TYPES.WELCOME ||
            eventType === EVENT_TYPES.ADMIN_BOOKING_ALERT
        ));

        const allowPush = !prefs || (prefs.pushEnabled && (
            (isReminder && prefs.appointmentReminders) ||
            (isBooking && prefs.bookingUpdates) ||
            (isPayment && prefs.paymentUpdates) ||
            (isReport && prefs.reportUpdates)
        ));

        // 1. In-App Notification (Always stored in user's Notification Center)
        if (userId) {
            let inAppTitle = eventPayload.title;
            let inAppMessage = eventPayload.message;

            if (!inAppTitle || !inAppMessage) {
                const templ = renderTemplate(eventType, eventPayload);
                inAppTitle = templ.subject;
                inAppMessage = templ.text.split("\n\n")[0] || templ.subject;
            }

            await Notification.create({
                userId,
                notificationType: eventType,
                title: inAppTitle,
                message: inAppMessage,
                channel: CHANNELS.IN_APP,
                referenceType: eventPayload.referenceType || (isBooking ? "BOOKING" : isPayment ? "PAYMENT" : isReport ? "AI_REPORT" : null),
                referenceId: eventPayload.referenceId || eventPayload.bookingId || null,
                status: NOTIFICATION_STATUS.SENT,
                isRead: false,
                sentAt: new Date()
            });
        }

        // 2. Transactional Email Delivery
        const recipientEmail = eventPayload.email || user?.email;
        if (allowEmail && recipientEmail) {
            const template = renderTemplate(eventType, {
                ...eventPayload,
                userName: eventPayload.userName || user?.name || "Patient",
                email: recipientEmail
            });

            await sendEmail({
                to: recipientEmail,
                subject: template.subject,
                html: template.html,
                text: template.text
            });
        }

        // 3. Web Push Delivery
        if (allowPush && userId) {
            const subscriptions = await PushSubscription.findAll({
                where: { userId, isActive: true }
            });

            for (const sub of subscriptions) {
                try {
                    const result = await sendPushNotification(sub, {
                        title: eventPayload.title || "HealthSync AI Update",
                        body: eventPayload.message || "You have a new healthcare update.",
                        url: eventPayload.url || "/dashboard/notifications",
                        tag: `healthsync-${eventType.toLowerCase()}`
                    });

                    if (result?.expired) {
                        await sub.update({ isActive: false });
                    }
                } catch (pushErr) {
                    console.warn(`Push to endpoint failed for user ${userId}:`, pushErr.message);
                }
            }
        }

        // 4. Optional SMS Delivery
        if (prefs?.smsEnabled && (eventPayload.phone || user?.phone)) {
            await sendSMS({
                to: eventPayload.phone || user.phone,
                message: eventPayload.message || `HealthSync AI: Update on booking #${eventPayload.bookingNumber}`
            });
        }

        // Mark outbox completed
        await outbox.update({
            status: OUTBOX_STATUS.COMPLETED,
            processedAt: new Date(),
            lastError: null
        });
    } catch (err) {
        console.error(`✗ Error processing outbox event #${outbox.id}:`, err.message);
        await outbox.update({
            status: outbox.attempts >= 5 ? OUTBOX_STATUS.FAILED : OUTBOX_STATUS.PENDING,
            lastError: err.message
        });
        throw err;
    }
}

// ==========================================
// 5. SCHEDULED DELAYED REMINDERS
// ==========================================

async function scheduleAppointmentReminder(appointmentId) {
    const appt = await DoctorAppointment.findByPk(appointmentId, {
        include: [
            { model: Booking, as: "booking", include: [{ model: User, as: "user" }] }
        ]
    });
    if (!appt || !appt.booking || appt.appointmentStatus === "CANCELLED") return null;

    const appointmentDateTime = new Date(`${appt.appointmentDate}T${appt.startTime}`);
    const reminderHours = Number(process.env.APPOINTMENT_REMINDER_HOURS || 24);
    const reminderTime = new Date(appointmentDateTime.getTime() - reminderHours * 60 * 60 * 1000);
    const delayMs = Math.max(0, reminderTime.getTime() - Date.now());

    return await addJob(
        QUEUE_NAMES.REMINDERS,
        `reminder-appt-${appt.id}`,
        {
            type: "APPOINTMENT_REMINDER",
            appointmentId: appt.id
        },
        {
            delay: delayMs,
            jobId: `appt-remind-${appt.id}`
        }
    );
}

async function scheduleLabReminder(collectionId) {
    const col = await LabCollectionDetail.findByPk(collectionId, {
        include: [
            { model: Booking, as: "booking", include: [{ model: User, as: "user" }] }
        ]
    });
    if (!col || !col.booking || col.sampleStatus === "CANCELLED") return null;

    const collectionDate = col.collectionDate;
    const timeSlotStr = col.timeSlot ? col.timeSlot.split("-")[0].trim() : "08:00";
    const collectionDateTime = new Date(`${collectionDate}T${timeSlotStr}:00`);

    const reminderHours = Number(process.env.LAB_REMINDER_HOURS || 12);
    const reminderTime = new Date(collectionDateTime.getTime() - reminderHours * 60 * 60 * 1000);
    const delayMs = Math.max(0, reminderTime.getTime() - Date.now());

    return await addJob(
        QUEUE_NAMES.REMINDERS,
        `reminder-lab-${col.id}`,
        {
            type: "LAB_COLLECTION_REMINDER",
            collectionId: col.id
        },
        {
            delay: delayMs,
            jobId: `lab-remind-${col.id}`
        }
    );
}

// ==========================================
// 6. ADMIN MONITORING & STATS
// ==========================================

async function listAdminNotifications({ page = 1, limit = 20, status, channel, eventType, search }) {
    const where = {};
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (eventType) where.notificationType = eventType;
    if (search) {
        where[Op.or] = [
            { title: { [Op.like]: `%${search}%` } },
            { message: { [Op.like]: `%${search}%` } }
        ];
    }

    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const { count, rows } = await Notification.findAndCountAll({
        where,
        include: [{ model: User, as: "user", attributes: ["id", "name", "email"] }],
        order: [["created_at", "DESC"]],
        limit: Number(limit),
        offset
    });

    return {
        notifications: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit))
        }
    };
}

async function getAdminNotificationStats() {
    const total = await Notification.count();
    const sent = await Notification.count({ where: { status: NOTIFICATION_STATUS.SENT } });
    const read = await Notification.count({ where: { isRead: true } });
    const failed = await Notification.count({ where: { status: NOTIFICATION_STATUS.FAILED } });

    const failedOutboxCount = await NotificationOutbox.count({
        where: { status: OUTBOX_STATUS.FAILED }
    });

    const pendingOutboxCount = await NotificationOutbox.count({
        where: { status: OUTBOX_STATUS.PENDING }
    });

    // Count by channel
    const inAppCount = await Notification.count({ where: { channel: CHANNELS.IN_APP } });
    const emailCount = await Notification.count({ where: { channel: CHANNELS.EMAIL } });
    const pushCount = await Notification.count({ where: { channel: CHANNELS.PUSH } });

    return {
        total,
        sent,
        read,
        failed,
        failedOutboxCount,
        pendingOutboxCount,
        channels: {
            inApp: inAppCount,
            email: emailCount,
            push: pushCount
        },
        deliveryRate: total > 0 ? ((sent / total) * 100).toFixed(1) : "100.0"
    };
}

async function listFailedNotifications({ page = 1, limit = 20 }) {
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const { count, rows } = await NotificationOutbox.findAndCountAll({
        where: { status: OUTBOX_STATUS.FAILED },
        order: [["updated_at", "DESC"]],
        limit: Number(limit),
        offset
    });

    return {
        failedEvents: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit))
        }
    };
}

async function retryFailedNotification(outboxId) {
    const outbox = await NotificationOutbox.findByPk(outboxId);
    if (!outbox) {
        throw new Error("Outbox event not found");
    }

    await outbox.update({
        status: OUTBOX_STATUS.PENDING,
        attempts: 0,
        lastError: null,
        availableAt: new Date()
    });

    await dispatchOutboxEvent(outbox.id);
    return outbox;
}

module.exports = {
    getOrCreatePreferences,
    updatePreferences,
    savePushSubscription,
    removePushSubscription,
    listNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createOutboxEvent,
    dispatchOutboxEvent,
    processOutboxEvent,
    scheduleAppointmentReminder,
    scheduleLabReminder,
    listAdminNotifications,
    getAdminNotificationStats,
    listFailedNotifications,
    retryFailedNotification
};

