const { z } = require("zod");

const createBookingSchema = z
    .object({
        bookingType: z.enum(["LAB_TEST", "PACKAGE"], {
            required_error: "Booking type must be LAB_TEST or PACKAGE"
        }),
        items: z
            .array(
                z.object({
                    id: z.number({ required_error: "Item ID is required" }).positive(),
                    quantity: z.number().int().positive().default(1)
                })
            )
            .min(1, "At least one item must be booked"),
        collectionType: z.enum(["HOME", "LAB_VISIT"]).default("HOME"),
        addressId: z.number().positive().optional().nullable(),
        preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Preferred date must be in YYYY-MM-DD format"),
        preferredTimeSlot: z.string().min(1, "Preferred time slot is required"),
        notes: z.string().trim().max(1000).optional().nullable()
    })
    .refine(
        (data) => {
            if (data.collectionType === "HOME" && !data.addressId) {
                return false;
            }
            return true;
        },
        {
            message: "Address is required for home sample collection",
            path: ["addressId"]
        }
    );

const queryBookingsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    type: z.enum(["DOCTOR", "LAB_TEST", "PACKAGE", "all"]).optional(),
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "RESCHEDULED", "NO_SHOW", "all"]).optional()
});

const adminQueryBookingsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    type: z.enum(["DOCTOR", "LAB_TEST", "PACKAGE", "all"]).optional(),
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "RESCHEDULED", "NO_SHOW", "all"]).optional(),
    search: z.string().optional()
});

const adminUpdateStatusSchema = z.object({
    bookingStatus: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "RESCHEDULED", "NO_SHOW"]).optional(),
    paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
    sampleStatus: z.enum(["PENDING", "COLLECTED", "IN_TRANSIT", "RECEIVED", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
    appointmentStatus: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED", "NO_SHOW"]).optional()
});

const cancelBookingSchema = z.object({
    reason: z.string().trim().max(500).optional()
});

module.exports = {
    createBookingSchema,
    queryBookingsSchema,
    adminQueryBookingsSchema,
    adminUpdateStatusSchema,
    cancelBookingSchema
};

