const express = require("express");
const controller = require("./doctors.controller");
const { queryDoctorSchema } = require("./doctors.validation");

const router = express.Router();

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

router.get("/specializations", controller.getDoctorSpecializations);
router.get("/:id/availability", controller.getPublicDoctorAvailability);
router.get("/:id/slots", controller.getDoctorSlots);
router.get("/:id", controller.getPublicDoctorById);
router.get("/", validateQuery(queryDoctorSchema), controller.listPublicDoctors);

module.exports = router;

