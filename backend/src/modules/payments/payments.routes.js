const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const controller = require("./payments.controller");
const {
    createOrderSchema,
    verifyPaymentSchema,
    retryPaymentSchema,
    payOnCollectionSchema,
    queryPaymentsSchema
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

router.post(["/create-order", "/orders"], validateBody(createOrderSchema), controller.createOrder);
router.post("/verify", validateBody(verifyPaymentSchema), controller.verifyPayment);
router.post("/retry", validateBody(retryPaymentSchema), controller.retryPayment);
router.post("/pay-on-collection", validateBody(payOnCollectionSchema), controller.payOnCollection);
router.get("/", validateQuery(queryPaymentsSchema), controller.listMyPayments);
router.get("/booking/:bookingId", controller.getPaymentsForBooking);
router.get("/:id/refunds", controller.getMyRefunds);
router.get("/:id", controller.getPaymentById);

module.exports = router;

