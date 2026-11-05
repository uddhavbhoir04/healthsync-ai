const doctorService = require("./doctors.service");

// PUBLIC CONTROLLERS
exports.listPublicDoctors = async (req, res, next) => {
    try {
        const result = await doctorService.listDoctors(req.validatedQuery || req.query, false);
        res.json({
            success: true,
            data: result.doctors,
            doctors: result.doctors,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getDoctorSpecializations = async (req, res, next) => {
    try {
        const specializations = await doctorService.getDoctorSpecializations();
        res.json({
            success: true,
            data: specializations,
            specializations
        });
    } catch (error) {
        next(error);
    }
};

exports.getPublicDoctorById = async (req, res, next) => {
    try {
        const doctor = await doctorService.getDoctorById(req.params.id, false);
        res.json({
            success: true,
            data: doctor,
            doctor
        });
    } catch (error) {
        next(error);
    }
};

exports.getPublicDoctorAvailability = async (req, res, next) => {
    try {
        const availability = await doctorService.getDoctorAvailability(req.params.id);
        res.json({
            success: true,
            data: availability,
            availability
        });
    } catch (error) {
        next(error);
    }
};

exports.getDoctorSlots = async (req, res, next) => {
    try {
        const appointmentsService = require("../appointments/appointments.service");
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Query parameter 'date' (YYYY-MM-DD) is required"
            });
        }
        const result = await appointmentsService.getAvailableSlots(req.params.id, date);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};


// ADMIN CONTROLLERS
exports.listAdminDoctors = async (req, res, next) => {
    try {
        const result = await doctorService.listDoctors(req.validatedQuery || req.query, true);
        res.json({
            success: true,
            data: result.doctors,
            doctors: result.doctors,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getAdminDoctorById = async (req, res, next) => {
    try {
        const doctor = await doctorService.getDoctorById(req.params.id, true);
        res.json({
            success: true,
            data: doctor,
            doctor
        });
    } catch (error) {
        next(error);
    }
};

exports.createDoctor = async (req, res, next) => {
    try {
        const doctor = await doctorService.createDoctor(req.body);
        res.status(201).json({
            success: true,
            message: "Doctor created successfully",
            data: doctor,
            doctor
        });
    } catch (error) {
        next(error);
    }
};

exports.updateDoctor = async (req, res, next) => {
    try {
        const doctor = await doctorService.updateDoctor(req.params.id, req.body);
        res.json({
            success: true,
            message: "Doctor updated successfully",
            data: doctor,
            doctor
        });
    } catch (error) {
        next(error);
    }
};

exports.updateDoctorStatus = async (req, res, next) => {
    try {
        const doctor = await doctorService.updateDoctorStatus(req.params.id, req.body.status);
        res.json({
            success: true,
            message: `Doctor status updated to ${doctor.status ? "active" : "inactive"}`,
            data: doctor,
            doctor
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteDoctor = async (req, res, next) => {
    try {
        const result = await doctorService.deleteDoctor(req.params.id);
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

// AVAILABILITY CONTROLLERS
exports.addDoctorAvailability = async (req, res, next) => {
    try {
        const slot = await doctorService.addDoctorAvailability(req.params.id, req.body);
        res.status(201).json({
            success: true,
            message: "Availability slot created",
            data: slot,
            slot
        });
    } catch (error) {
        next(error);
    }
};

exports.updateDoctorAvailability = async (req, res, next) => {
    try {
        const slot = await doctorService.updateDoctorAvailability(
            req.params.id,
            req.params.availabilityId,
            req.body
        );
        res.json({
            success: true,
            message: "Availability slot updated",
            data: slot,
            slot
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteDoctorAvailability = async (req, res, next) => {
    try {
        const result = await doctorService.deleteDoctorAvailability(
            req.params.id,
            req.params.availabilityId
        );
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

