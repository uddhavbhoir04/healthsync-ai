const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const controller = require("./appointments.controller");
const {
    querySlotsSchema,
    createAppointmentSchema,
    cancelAppointmentSchema,
    rescheduleAppointmentSchema
} = require("./appointments.validation");

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

// Slot query can be accessed publicly or authenticated
router.get("/slots", validateQuery(querySlotsSchema), controller.getSlots);

// Protected appointment actions
router.use(authMiddleware);

router.post("/", validateBody(createAppointmentSchema), controller.createAppointment);
router.get("/my", controller.getMyAppointments);
router.get("/:id", controller.getAppointmentById);
router.patch("/:id/cancel", validateBody(cancelAppointmentSchema), controller.cancelAppointment);
router.patch("/:id/reschedule", validateBody(rescheduleAppointmentSchema), controller.rescheduleAppointment);

module.exports = router;

