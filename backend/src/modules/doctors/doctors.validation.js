const { z } = require("zod");

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createDoctorSchema = z.object({
    doctorName: z.string().trim().min(2, "Doctor name is required").max(100),
    specialization: z.string().trim().min(2, "Specialization is required").max(100),
    qualification: z.string().trim().min(2, "Qualification is required").max(100),
    experienceYears: z.coerce.number().int().min(0).max(70).default(0),
    consultationFee: z.coerce.number().min(0, "Consultation fee cannot be negative"),
    about: z.string().trim().optional().nullable().or(z.literal("")),
    profileImage: z.string().trim().url("Must be a valid image URL").optional().nullable().or(z.literal("")),
    city: z.string().trim().min(2, "City is required").max(100),
    pincode: z.string().trim().min(3, "Pincode is required").max(20),
    status: z.boolean().optional().default(true),
    userId: z.coerce.number().optional().nullable()
});

const updateDoctorSchema = createDoctorSchema.partial();

const updateDoctorStatusSchema = z.object({
    status: z.boolean({ required_error: "Status boolean is required" })
});

const baseAvailabilitySchema = z.object({
    dayOfWeek: z.enum([
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY"
    ]),
    startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format (24h)"),
    endTime: z.string().regex(timeRegex, "End time must be in HH:MM format (24h)"),
    slotDuration: z.coerce.number().int().min(10).max(120).default(30),
    isAvailable: z.boolean().optional().default(true)
});

const availabilitySchema = baseAvailabilitySchema.refine((data) => {
    return data.startTime < data.endTime;
}, {
    message: "End time must be later than start time",
    path: ["endTime"]
});

const updateAvailabilitySchema = baseAvailabilitySchema.partial().refine((data) => {
    if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
    }
    return true;
}, {
    message: "End time must be later than start time",
    path: ["endTime"]
});

const queryDoctorSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    city: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
    minExperience: z.coerce.number().min(0).optional(),
    maxFee: z.coerce.number().min(0).optional(),
    minFee: z.coerce.number().min(0).optional(),
    sortBy: z.enum(["experience_years", "consultation_fee", "doctor_name", "createdAt"]).default("experience_years"),
    sortOrder: z.enum(["ASC", "DESC", "asc", "desc"]).default("DESC")
});

module.exports = {
    createDoctorSchema,
    updateDoctorSchema,
    updateDoctorStatusSchema,
    availabilitySchema,
    updateAvailabilitySchema,
    queryDoctorSchema
};
