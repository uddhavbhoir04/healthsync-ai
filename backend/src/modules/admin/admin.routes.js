const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/role.middleware");
const controller = require("./admin.controller");
const {
    listUsersQuerySchema,
    updateUserStatusSchema,
    updateUserRoleSchema
} = require("./admin.validation");

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

// All admin routes require valid JWT AND ADMIN role
router.use(authMiddleware);
router.use(allowRoles("ADMIN"));

router.get("/users", validateQuery(listUsersQuerySchema), controller.listUsers);
router.get("/users/:id", controller.getUserById);
router.patch("/users/:id/status", validateBody(updateUserStatusSchema), controller.updateUserStatus);
router.patch("/users/:id/role", validateBody(updateUserRoleSchema), controller.updateUserRole);

module.exports = router;

