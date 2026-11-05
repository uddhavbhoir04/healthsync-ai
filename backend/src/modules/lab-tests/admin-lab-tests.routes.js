const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/role.middleware");
const controller = require("./lab-tests.controller");
const {
    createLabTestSchema,
    updateLabTestSchema,
    updateLabTestStatusSchema,
    queryLabTestSchema
} = require("./lab-tests.validation");

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

// Admin protection
router.use(authMiddleware);
router.use(allowRoles("ADMIN"));

router.get("/", validateQuery(queryLabTestSchema), controller.listAdminLabTests);
router.post("/", validateBody(createLabTestSchema), controller.createLabTest);
router.get("/:id", controller.getAdminLabTestById);
router.put("/:id", validateBody(updateLabTestSchema), controller.updateLabTest);
router.patch("/:id/status", validateBody(updateLabTestStatusSchema), controller.updateLabTestStatus);
router.delete("/:id", controller.deleteLabTest);

module.exports = router;

