const notificationsService = require("./notifications.service");

exports.listNotifications = async (req, res, next) => {
    try {
        const result = await notificationsService.listAdminNotifications(req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

exports.getStats = async (req, res, next) => {
    try {
        const stats = await notificationsService.getAdminNotificationStats();
        res.json({ success: true, stats });
    } catch (err) {
        next(err);
    }
};

exports.listFailed = async (req, res, next) => {
    try {
        const result = await notificationsService.listFailedNotifications(req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

exports.retryNotification = async (req, res, next) => {
    try {
        const outbox = await notificationsService.retryFailedNotification(req.params.id);
        res.json({ success: true, message: "Notification queued for retry", outbox });
    } catch (err) {
        next(err);
    }
};

