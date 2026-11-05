const { z } = require("zod");

const querySlotsSchema = z.object({
    doctorId: z.coerce.number({ invalid_type_error: "Doctor ID must be a number" }).positive("Doctor ID is required"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
});

const createAppointmentSchema = z.object({
    doctorId: z.number({ required_error: "Doctor ID is required" }).positive(),
    appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Invalid start time format (HH:mm)"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Invalid end time format (HH:mm)"),
    consultationType: z.enum(["ONLINE", "IN_PERSON"]).default("IN_PERSON"),
    patientName: z.string().trim().min(2, "Patient name must be at least 2 characters").max(100),
    patientPhone: z.string().trim().min(10, "Phone number must be at least 10 digits").max(20),
    patientGender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    patientAge: z.number().int().min(0).max(150).optional(),
    notes: z.string().trim().max(1000).optional().nullable()
});

const cancelAppointmentSchema = z.object({
    cancellationReason: z.string().trim().max(500).optional()
});

const rescheduleAppointmentSchema = z.object({
    newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "New date must be in YYYY-MM-DD format"),
    newStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Invalid new start time format (HH:mm)"),
    newEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Invalid new end time format (HH:mm)")
});

module.exports = {
    querySlotsSchema,
    createAppointmentSchema,
    cancelAppointmentSchema,
    rescheduleAppointmentSchema
};

