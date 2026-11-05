const { z } = require("zod");

const createOrderSchema = z.object({
    bookingId: z.coerce.number({ invalid_type_error: "Booking ID must be a number" }).positive("Booking ID is required"),
    idempotencyKey: z.string().trim().max(100).optional()
});

const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string().trim().min(1, "razorpay_order_id is required"),
    razorpay_payment_id: z.string().trim().min(1, "razorpay_payment_id is required"),
    razorpay_signature: z.string().trim().min(1, "razorpay_signature is required")
});

const retryPaymentSchema = z.object({
    bookingId: z.coerce.number({ invalid_type_error: "Booking ID must be a number" }).positive("Booking ID is required")
});

const payOnCollectionSchema = z.object({
    bookingId: z.coerce.number({ invalid_type_error: "Booking ID must be a number" }).positive("Booking ID is required"),
    paymentMethod: z.string().trim().default("PAY_ON_COLLECTION")
});

const refundPaymentSchema = z.object({
    amount: z.coerce.number().positive("Refund amount must be positive").optional(),
    reason: z.string().trim().max(500).optional()
});

const queryPaymentsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum([
        "CREATED",
        "PENDING",
        "SUCCESS",
        "FAILED",
        "REFUND_PENDING",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
        "all"
    ]).optional(),
    bookingNumber: z.string().trim().optional(),
    paymentMethod: z.string().trim().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD").optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD").optional(),
    search: z.string().trim().optional()
});

module.exports = {
    createOrderSchema,
    verifyPaymentSchema,
    retryPaymentSchema,
    payOnCollectionSchema,
    refundPaymentSchema,
    queryPaymentsSchema
};

