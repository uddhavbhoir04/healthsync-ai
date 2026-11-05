const { Op } = require("sequelize");
const { Doctor, DoctorAvailability } = require("../../models");
const { getCache, setCache, invalidatePattern } = require("../../utils/cache");

async function listDoctors(params, isAdmin = false) {
    const {
        page = 1,
        limit = 10,
        search,
        specialization,
        city,
        pincode,
        minExperience,
        minFee,
        maxFee,
        sortBy = "experience_years",
        sortOrder = "DESC"
    } = params;

    // Cache key for public queries
    const cacheKey = !isAdmin
        ? `doctors:list:${JSON.stringify(params)}`
        : null;

    if (cacheKey) {
        const cached = await getCache(cacheKey);
        if (cached) return cached;
    }

    const where = {};

    // Only active doctors for public users
    if (!isAdmin) {
        where.status = true;
    } else if (params.status !== undefined && params.status !== "all") {
        where.status = params.status === "true" || params.status === true;
    }

    if (search && search.trim() !== "") {
        const sanitized = `%${search.trim()}%`;
        where[Op.or] = [
            { doctorName: { [Op.like]: sanitized } },
            { specialization: { [Op.like]: sanitized } },
            { city: { [Op.like]: sanitized } },
            { about: { [Op.like]: sanitized } }
        ];
    }

    if (specialization && specialization !== "all") {
        where.specialization = specialization;
    }

    if (city && city !== "all") {
        where.city = city;
    }

    if (pincode) {
        where.pincode = pincode;
    }

    if (minExperience !== undefined) {
        where.experienceYears = { [Op.gte]: Number(minExperience) };
    }

    if (minFee !== undefined || maxFee !== undefined) {
        where.consultationFee = {};
        if (minFee !== undefined) where.consultationFee[Op.gte] = Number(minFee);
        if (maxFee !== undefined) where.consultationFee[Op.lte] = Number(maxFee);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Doctor.findAndCountAll({
        where,
        order: [[sortBy, sortOrder.toUpperCase()]],
        offset,
        limit,
        include: [
            {
                model: DoctorAvailability,
                as: "availability",
                where: { isAvailable: true },
                required: false
            }
        ]
    });

    const result = {
        doctors: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit) || 1
        }
    };

    if (cacheKey) {
        await setCache(cacheKey, result, 300); // 5 min TTL
    }

    return result;
}

async function getDoctorSpecializations() {
    const cacheKey = "doctors:specializations";
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const specializations = await Doctor.findAll({
        attributes: ["specialization"],
        where: { status: true },
        group: ["specialization"],
        order: [["specialization", "ASC"]]
    });

    const result = specializations.map((s) => s.specialization);
    await setCache(cacheKey, result, 600);
    return result;
}

async function getDoctorById(id, isAdmin = false) {
    const where = { id };
    if (!isAdmin) {
        where.status = true;
    }

    const doctor = await Doctor.findOne({
        where,
        include: [
            {
                model: DoctorAvailability,
                as: "availability"
            }
        ]
    });

    if (!doctor) {
        const error = new Error("Doctor not found");
        error.status = 404;
        throw error;
    }

    return doctor;
}

async function createDoctor(payload) {
    const doctor = await Doctor.create(payload);
    await invalidatePattern("doctors:");
    await invalidatePattern("search:");
    return doctor;
}

async function updateDoctor(id, payload) {
    const doctor = await Doctor.findByPk(id);
    if (!doctor) {
        const error = new Error("Doctor not found");
        error.status = 404;
        throw error;
    }

    await doctor.update(payload);
    await invalidatePattern("doctors:");
    await invalidatePattern("search:");
    return getDoctorById(id, true);
}

async function updateDoctorStatus(id, status) {
    const doctor = await Doctor.findByPk(id);
    if (!doctor) {
        const error = new Error("Doctor not found");
        error.status = 404;
        throw error;
    }

    await doctor.update({ status });
    await invalidatePattern("doctors:");
    await invalidatePattern("search:");
    return doctor;
}

async function deleteDoctor(id) {
    const doctor = await Doctor.findByPk(id);
    if (!doctor) {
        const error = new Error("Doctor not found");
        error.status = 404;
        throw error;
    }

    // Soft delete by deactivating or destroy
    await doctor.update({ status: false });
    await invalidatePattern("doctors:");
    await invalidatePattern("search:");
    return { id, message: "Doctor deactivated successfully" };
}

// AVAILABILITY METHODS
async function getDoctorAvailability(doctorId) {
    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor || !doctor.status) {
        const error = new Error("Doctor not found or inactive");
        error.status = 404;
        throw error;
    }

    const availability = await DoctorAvailability.findAll({
        where: { doctorId, isAvailable: true },
        order: [
            ["dayOfWeek", "ASC"],
            ["startTime", "ASC"]
        ]
    });

    return availability;
}

async function addDoctorAvailability(doctorId, payload) {
    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
        const error = new Error("Doctor not found");
        error.status = 404;
        throw error;
    }

    // Check for overlapping window on the same day
    const existing = await DoctorAvailability.findAll({
        where: {
            doctorId,
            dayOfWeek: payload.dayOfWeek,
            isAvailable: true
        }
    });

    for (const slot of existing) {
        // Overlap condition: (newStart < existingEnd) && (newEnd > existingStart)
        if (payload.startTime < slot.endTime && payload.endTime > slot.startTime) {
            const error = new Error(
                `Overlapping availability slot already exists for ${payload.dayOfWeek} (${slot.startTime} - ${slot.endTime})`
            );
            error.status = 400;
            throw error;
        }
    }

    const newSlot = await DoctorAvailability.create({
        doctorId,
        ...payload
    });

    await invalidatePattern("doctors:");
    return newSlot;
}

async function updateDoctorAvailability(doctorId, availabilityId, payload) {
    const slot = await DoctorAvailability.findOne({
        where: { id: availabilityId, doctorId }
    });

    if (!slot) {
        const error = new Error("Availability slot not found");
        error.status = 404;
        throw error;
    }

    const targetDay = payload.dayOfWeek || slot.dayOfWeek;
    const targetStart = payload.startTime || slot.startTime;
    const targetEnd = payload.endTime || slot.endTime;

    if (targetStart >= targetEnd) {
        const error = new Error("End time must be later than start time");
        error.status = 400;
        throw error;
    }

    // Check overlaps excluding current slot
    const existing = await DoctorAvailability.findAll({
        where: {
            doctorId,
            dayOfWeek: targetDay,
            id: { [Op.ne]: availabilityId },
            isAvailable: true
        }
    });

    for (const other of existing) {
        if (targetStart < other.endTime && targetEnd > other.startTime) {
            const error = new Error(
                `Overlapping availability slot exists for ${targetDay} (${other.startTime} - ${other.endTime})`
            );
            error.status = 400;
            throw error;
        }
    }

    await slot.update(payload);
    await invalidatePattern("doctors:");
    return slot;
}

async function deleteDoctorAvailability(doctorId, availabilityId) {
    const slot = await DoctorAvailability.findOne({
        where: { id: availabilityId, doctorId }
    });

    if (!slot) {
        const error = new Error("Availability slot not found");
        error.status = 404;
        throw error;
    }

    await slot.destroy();
    await invalidatePattern("doctors:");
    return { id: availabilityId, message: "Availability slot deleted" };
}

module.exports = {
    listDoctors,
    getDoctorSpecializations,
    getDoctorById,
    createDoctor,
    updateDoctor,
    updateDoctorStatus,
    deleteDoctor,
    getDoctorAvailability,
    addDoctorAvailability,
    updateDoctorAvailability,
    deleteDoctorAvailability
};

