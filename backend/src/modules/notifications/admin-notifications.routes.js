const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/role.middleware");
const controller = require("./admin-notifications.controller");

const router = express.Router();

router.use(authMiddleware);
router.use(allowRoles("ADMIN"));

router.get("/", controller.listNotifications);
router.get("/stats", controller.getStats);
router.get("/failed", controller.listFailed);
router.post("/:id/retry", controller.retryNotification);

module.exports = router;

