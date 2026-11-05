const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/role.middleware");
const controller = require("./admin-bookings.controller");
const {
    adminQueryBookingsSchema,
    adminUpdateStatusSchema,
    cancelBookingSchema
} = require("./bookings.validation");

const router = express.Router();

const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.flatten()
        });
    }
    req.body = result.data;
    next();
};

const validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid query parameters",
            errors: result.error.flatten()
        });
    }
    req.validatedQuery = result.data;
    next();
};

// All admin booking routes require auth & ADMIN role
router.use(authMiddleware);
router.use(allowRoles("ADMIN"));

router.get("/", validateQuery(adminQueryBookingsSchema), controller.listAllBookings);
router.get("/:id", controller.getAdminBookingById);
router.patch("/:id/status", validateBody(adminUpdateStatusSchema), controller.updateBookingStatus);
router.patch("/:id/cancel", validateBody(cancelBookingSchema), controller.adminCancelBooking);

module.exports = router;

