const { z } = require("zod");

const updateProfileSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
    phone: z
        .string()
        .trim()
        .regex(/^[+]?[0-9\s\-()]{7,20}$/, "Invalid phone number format")
        .optional()
        .nullable()
        .or(z.literal("")),
    dateOfBirth: z
        .string()
        .refine(
            (val) => {
                if (!val) return true;
                const date = new Date(val);
                if (isNaN(date.getTime())) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
            },
            { message: "Date of birth must be a valid date in the past" }
        )
        .optional()
        .nullable()
        .or(z.literal("")),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable().or(z.literal("")),
    profileImageUrl: z
        .string()
        .url("Profile image URL must be a valid URL")
        .max(500)
        .optional()
        .nullable()
        .or(z.literal(""))
});

const addressSchema = z.object({
    addressType: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
    phone: z
        .string()
        .trim()
        .regex(/^[+]?[0-9\s\-()]{7,20}$/, "Invalid phone number format"),
    addressLine1: z.string().trim().min(3, "Address line 1 is required").max(255),
    addressLine2: z.string().trim().max(255).optional().nullable().or(z.literal("")),
    city: z.string().trim().min(2, "City is required").max(100),
    state: z.string().trim().min(2, "State is required").max(100),
    pincode: z.string().trim().min(3, "Pincode is required").max(20),
    landmark: z.string().trim().max(255).optional().nullable().or(z.literal("")),
    isDefault: z.boolean().optional().default(false)
});

const updateAddressSchema = addressSchema.partial();

module.exports = {
    updateProfileSchema,
    addressSchema,
    updateAddressSchema
};

