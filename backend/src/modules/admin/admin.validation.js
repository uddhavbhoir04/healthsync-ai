const { z } = require("zod");

const listUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).optional(),
    status: z
        .enum(["true", "false", "all"])
        .optional()
        .transform((val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return undefined;
        }),
    sortBy: z.enum(["createdAt", "name", "email", "role"]).default("createdAt"),
    sortOrder: z.enum(["ASC", "DESC", "asc", "desc"]).default("DESC")
});

const updateUserStatusSchema = z.object({
    status: z.boolean({ required_error: "Status boolean is required" })
});

const updateUserRoleSchema = z.object({
    role: z.enum(["PATIENT", "DOCTOR", "ADMIN"], {
        errorMap: () => ({ message: "Role must be PATIENT, DOCTOR, or ADMIN" })
    })
});

module.exports = {
    listUsersQuerySchema,
    updateUserStatusSchema,
    updateUserRoleSchema
};

