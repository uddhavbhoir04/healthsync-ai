const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/role.middleware");
const controller = require("./doctors.controller");
const {
    createDoctorSchema,
    updateDoctorSchema,
    updateDoctorStatusSchema,
    availabilitySchema,
    updateAvailabilitySchema,
    queryDoctorSchema
} = require("./doctors.validation");

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

// Guard all admin doctor routes
router.use(authMiddleware);
router.use(allowRoles("ADMIN"));

// Doctors CRUD
router.get("/", validateQuery(queryDoctorSchema), controller.listAdminDoctors);
router.post("/", validateBody(createDoctorSchema), controller.createDoctor);
router.get("/:id", controller.getAdminDoctorById);
router.put("/:id", validateBody(updateDoctorSchema), controller.updateDoctor);
router.patch("/:id/status", validateBody(updateDoctorStatusSchema), controller.updateDoctorStatus);
router.delete("/:id", controller.deleteDoctor);

// Availability CRUD
router.post("/:id/availability", validateBody(availabilitySchema), controller.addDoctorAvailability);
router.put("/:id/availability/:availabilityId", validateBody(updateAvailabilitySchema), controller.updateDoctorAvailability);
router.delete("/:id/availability/:availabilityId", controller.deleteDoctorAvailability);

module.exports = router;

