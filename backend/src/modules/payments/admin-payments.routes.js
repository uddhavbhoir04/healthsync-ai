const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/role.middleware");
const controller = require("./payments.controller");
const {
    queryPaymentsSchema,
    refundPaymentSchema
} = require("./payments.validation");

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
router.use(allowRoles("ADMIN"));

router.get("/", validateQuery(queryPaymentsSchema), controller.adminListPayments);
router.get("/:id", controller.getPaymentById);
router.post("/:id/refund", validateBody(refundPaymentSchema), controller.adminInitiateRefund);
router.get("/:id/refunds", controller.adminGetRefunds);

module.exports = router;

