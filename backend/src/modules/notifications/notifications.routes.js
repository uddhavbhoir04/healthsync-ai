const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const controller = require("./notifications.controller");

const router = express.Router();

router.use(authMiddleware);

// In-App Notifications
router.get("/", controller.listNotifications);
router.get("/unread-count", controller.getUnreadCount);
router.patch("/read-all", controller.markAllAsRead);
router.patch("/:id/read", controller.markAsRead);
router.delete("/:id", controller.deleteNotification);

// Notification Preferences
router.get("/preferences", controller.getPreferences);
router.put("/preferences", controller.updatePreferences);

// Web Push Registration
router.get("/push/vapid-public-key", controller.getVapidPublicKey);
router.post("/push/subscribe", controller.subscribePush);
router.delete("/push/unsubscribe", controller.unsubscribePush);

module.exports = router;

