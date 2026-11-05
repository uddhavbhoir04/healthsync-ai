const appointmentsService = require("./appointments.service");

exports.getSlots = async (req, res, next) => {
    try {
        const { doctorId, date } = req.validatedQuery || req.query;
        const result = await appointmentsService.getAvailableSlots(doctorId, date);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

exports.createAppointment = async (req, res, next) => {
    try {
        const appointment = await appointmentsService.createAppointment(req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: "Doctor appointment booked successfully",
            data: appointment
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyAppointments = async (req, res, next) => {
    try {
        const result = await appointmentsService.getMyAppointments(req.user.id, req.query);
        res.json({
            success: true,
            data: result.appointments,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getAppointmentById = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === "ADMIN";
        const appointment = await appointmentsService.getAppointmentById(req.params.id, req.user.id, isAdmin);
        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        next(error);
    }
};

exports.cancelAppointment = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === "ADMIN";
        const appointment = await appointmentsService.cancelAppointment(
            req.params.id,
            req.user.id,
            req.body?.cancellationReason,
            isAdmin
        );
        res.json({
            success: true,
            message: "Appointment cancelled successfully",
            data: appointment
        });
    } catch (error) {
        next(error);
    }
};

exports.rescheduleAppointment = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === "ADMIN";
        const { newDate, newStartTime, newEndTime } = req.body;
        const appointment = await appointmentsService.rescheduleAppointment(
            req.params.id,
            req.user.id,
            newDate,
            newStartTime,
            newEndTime,
            isAdmin
        );
        res.json({
            success: true,
            message: "Appointment rescheduled successfully",
            data: appointment
        });
    } catch (error) {
        next(error);
    }
};

