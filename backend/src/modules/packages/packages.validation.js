const { z } = require("zod");

const createPackageSchema = z.object({
    packageName: z.string().trim().min(2, "Package name is required").max(150),
    packageCode: z.string().trim().min(2, "Package code is required").max(50),
    description: z.string().trim().optional().nullable().or(z.literal("")),
    image: z.string().trim().url("Must be a valid image URL").optional().nullable().or(z.literal("")),
    originalPrice: z.coerce.number().min(0, "Original price cannot be negative"),
    offerPrice: z.coerce.number().min(0, "Offer price cannot be negative"),
    status: z.boolean().optional().default(true),
    testIds: z.array(z.coerce.number().int().positive()).optional().default([])
}).refine((data) => {
    return Number(data.offerPrice) <= Number(data.originalPrice);
}, {
    message: "Offer price cannot exceed original price",
    path: ["offerPrice"]
});

const updatePackageSchema = z.object({
    packageName: z.string().trim().min(2).max(150).optional(),
    packageCode: z.string().trim().min(2).max(50).optional(),
    description: z.string().trim().optional().nullable().or(z.literal("")),
    image: z.string().trim().url().optional().nullable().or(z.literal("")),
    originalPrice: z.coerce.number().min(0).optional(),
    offerPrice: z.coerce.number().min(0).optional(),
    status: z.boolean().optional(),
    testIds: z.array(z.coerce.number().int().positive()).optional()
}).refine((data) => {
    if (data.offerPrice !== undefined && data.originalPrice !== undefined) {
        return Number(data.offerPrice) <= Number(data.originalPrice);
    }
    return true;
}, {
    message: "Offer price cannot exceed original price",
    path: ["offerPrice"]
});

const updatePackageStatusSchema = z.object({
    status: z.boolean({ required_error: "Status boolean is required" })
});

const queryPackageSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sortBy: z.enum(["offer_price", "package_name", "createdAt"]).default("createdAt"),
    sortOrder: z.enum(["ASC", "DESC", "asc", "desc"]).default("DESC")
});

module.exports = {
    createPackageSchema,
    updatePackageSchema,
    updatePackageStatusSchema,
    queryPackageSchema
};

