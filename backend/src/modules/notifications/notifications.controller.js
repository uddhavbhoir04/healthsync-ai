const notificationsService = require("./notifications.service");
const { getVapidPublicKey } = require("./providers/push.provider");

exports.listNotifications = async (req, res, next) => {
    try {
        const result = await notificationsService.listNotifications(req.user.id, req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

exports.getUnreadCount = async (req, res, next) => {
    try {
        const count = await notificationsService.getUnreadCount(req.user.id);
        res.json({ success: true, count });
    } catch (err) {
        next(err);
    }
};

exports.markAsRead = async (req, res, next) => {
    try {
        const notification = await notificationsService.markAsRead(req.user.id, req.params.id);
        res.json({ success: true, message: "Notification marked as read", notification });
    } catch (err) {
        next(err);
    }
};

exports.markAllAsRead = async (req, res, next) => {
    try {
        const result = await notificationsService.markAllAsRead(req.user.id);
        res.json({ success: true, message: "All notifications marked as read", ...result });
    } catch (err) {
        next(err);
    }
};

exports.deleteNotification = async (req, res, next) => {
    try {
        await notificationsService.deleteNotification(req.user.id, req.params.id);
        res.json({ success: true, message: "Notification deleted" });
    } catch (err) {
        next(err);
    }
};

exports.getPreferences = async (req, res, next) => {
    try {
        const preferences = await notificationsService.getOrCreatePreferences(req.user.id);
        res.json({ success: true, preferences });
    } catch (err) {
        next(err);
    }
};

exports.updatePreferences = async (req, res, next) => {
    try {
        const preferences = await notificationsService.updatePreferences(req.user.id, req.body);
        res.json({ success: true, message: "Preferences updated", preferences });
    } catch (err) {
        next(err);
    }
};

exports.getVapidPublicKey = (req, res) => {
    const key = getVapidPublicKey();
    res.json({ success: true, publicKey: key });
};

exports.subscribePush = async (req, res, next) => {
    try {
        const subscription = await notificationsService.savePushSubscription(req.user.id, req.body);
        res.json({ success: true, message: "Push subscription registered", subscriptionId: subscription.id });
    } catch (err) {
        next(err);
    }
};

exports.unsubscribePush = async (req, res, next) => {
    try {
        await notificationsService.removePushSubscription(req.user.id, req.body.endpoint);
        res.json({ success: true, message: "Push subscription unregistered" });
    } catch (err) {
        next(err);
    }
};

