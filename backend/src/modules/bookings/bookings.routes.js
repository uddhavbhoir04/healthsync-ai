const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const controller = require("./bookings.controller");
const {
    createBookingSchema,
    queryBookingsSchema,
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

router.use(authMiddleware);

router.post("/", validateBody(createBookingSchema), controller.createBooking);
router.get("/", validateQuery(queryBookingsSchema), controller.listMyBookings);
router.get("/:id", controller.getBookingById);
router.patch("/:id/cancel", validateBody(cancelBookingSchema), controller.cancelBooking);

module.exports = router;

