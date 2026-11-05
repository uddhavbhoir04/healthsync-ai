const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/role.middleware");
const controller = require("./packages.controller");
const {
    createPackageSchema,
    updatePackageSchema,
    updatePackageStatusSchema,
    queryPackageSchema
} = require("./packages.validation");

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

router.get("/", validateQuery(queryPackageSchema), controller.listAdminPackages);
router.post("/", validateBody(createPackageSchema), controller.createPackage);
router.get("/:id", controller.getAdminPackageById);
router.put("/:id", validateBody(updatePackageSchema), controller.updatePackage);
router.patch("/:id/status", validateBody(updatePackageStatusSchema), controller.updatePackageStatus);
router.delete("/:id", controller.deletePackage);

module.exports = router;

