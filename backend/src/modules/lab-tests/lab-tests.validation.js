const { z } = require("zod");

const createLabTestSchema = z.object({
    testName: z.string().trim().min(2, "Test name is required").max(150),
    testCode: z.string().trim().min(2, "Test code is required").max(50),
    description: z.string().trim().optional().nullable().or(z.literal("")),
    category: z.string().trim().min(2, "Category is required").max(100),
    sampleType: z.string().trim().min(2, "Sample type is required").max(100).default("Blood"),
    fastingRequired: z.boolean().optional().default(false),
    preparationInstructions: z.string().trim().optional().nullable().or(z.literal("")),
    price: z.coerce.number().min(0, "Price cannot be negative"),
    status: z.boolean().optional().default(true)
});

const updateLabTestSchema = createLabTestSchema.partial();

const updateLabTestStatusSchema = z.object({
    status: z.boolean({ required_error: "Status boolean is required" })
});

const queryLabTestSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    fastingRequired: z
        .enum(["true", "false", "all"])
        .optional()
        .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sortBy: z.enum(["price", "test_name", "createdAt"]).default("createdAt"),
    sortOrder: z.enum(["ASC", "DESC", "asc", "desc"]).default("DESC")
});

module.exports = {
    createLabTestSchema,
    updateLabTestSchema,
    updateLabTestStatusSchema,
    queryLabTestSchema
};

