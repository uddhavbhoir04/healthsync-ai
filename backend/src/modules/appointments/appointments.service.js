const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const {
    Booking,
    BookingItem,
    DoctorAppointment,
    Doctor,
    DoctorAvailability,
    User
} = require("../../models");
const notificationsService = require("../notifications/notifications.service");
const { EVENT_TYPES } = require("../notifications/notification.constants");

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function minutesToTime(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function getDayOfWeek(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return dayNames[dateObj.getDay()];
}

function getTodayDateStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCurrentTimeStr() {
    const now = new Date();
    const hrs = now.getHours().toString().padStart(2, "0");
    const mins = now.getMinutes().toString().padStart(2, "0");
    return `${hrs}:${mins}`;
}

async function getAvailableSlots(doctorId, dateStr) {
    const todayStr = getTodayDateStr();
    if (dateStr < todayStr) {
        const error = new Error("Cannot view or book slots for past dates");
        error.status = 400;
        throw error;
    }

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor || !doctor.status) {
        const error = new Error("Doctor not found or inactive");
        error.status = 404;
        throw error;
    }

    const dayOfWeek = getDayOfWeek(dateStr);

    const availabilities = await DoctorAvailability.findAll({
        where: {
            doctorId,
            dayOfWeek,
            isAvailable: true
        }
    });

    if (!availabilities || availabilities.length === 0) {
        return {
            doctor: {
                id: doctor.id,
                doctorName: doctor.doctorName,
                specialization: doctor.specialization,
                consultationFee: doctor.consultationFee
            },
            date: dateStr,
            dayOfWeek,
            totalSlots: 0,
            availableSlotsCount: 0,
            slots: []
        };
    }

    // Existing active appointments for this doctor on this date
    const bookedAppointments = await DoctorAppointment.findAll({
        where: {
            doctorId,
            appointmentDate: dateStr,
            appointmentStatus: {
                [Op.ne]: "CANCELLED"
            }
        }
    });

    const isToday = dateStr === todayStr;
    const currentTimeMinutes = isToday ? timeToMinutes(getCurrentTimeStr()) : -1;

    const allSlots = [];

    for (const avail of availabilities) {
        const startMin = timeToMinutes(avail.startTime);
        const endMin = timeToMinutes(avail.endTime);
        const duration = avail.slotDuration || 30;

        let cur = startMin;
        while (cur + duration <= endMin) {
            const slotStartMin = cur;
            const slotEndMin = cur + duration;
            const slotStartTime = minutesToTime(slotStartMin);
            const slotEndTime = minutesToTime(slotEndMin);

            // Check if slot overlaps with any active appointment
            const hasConflict = bookedAppointments.some(appt => {
                const apptStartMin = timeToMinutes(appt.startTime);
                const apptEndMin = timeToMinutes(appt.endTime);
                return apptStartMin < slotEndMin && apptEndMin > slotStartMin;
            });

            const isPast = isToday && slotStartMin <= currentTimeMinutes;

            let isAvailable = true;
            let unavailableReason = null;

            if (isPast) {
                isAvailable = false;
                unavailableReason = "Past slot";
            } else if (hasConflict) {
                isAvailable = false;
                unavailableReason = "Booked";
            }

            allSlots.push({
                startTime: slotStartTime,
                endTime: slotEndTime,
                isAvailable,
                unavailableReason
            });

            cur += duration;
        }
    }

    // Sort slots by start time
    allSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    return {
        doctor: {
            id: doctor.id,
            doctorName: doctor.doctorName,
            specialization: doctor.specialization,
            consultationFee: doctor.consultationFee
        },
        date: dateStr,
        dayOfWeek,
        totalSlots: allSlots.length,
        availableSlotsCount: allSlots.filter(s => s.isAvailable).length,
        slots: allSlots
    };
}

async function createAppointment(userId, data) {
    const {
        doctorId,
        appointmentDate,
        startTime,
        endTime,
        consultationType = "IN_PERSON",
        patientName,
        patientPhone,
        patientGender,
        patientAge,
        notes
    } = data;

    const todayStr = getTodayDateStr();
    if (appointmentDate < todayStr) {
        const error = new Error("Cannot book appointments for past dates");
        error.status = 400;
        throw error;
    }

    if (appointmentDate === todayStr) {
        const startMin = timeToMinutes(startTime);
        const nowMin = timeToMinutes(getCurrentTimeStr());
        if (startMin <= nowMin) {
            const error = new Error("Cannot book past time slots for today");
            error.status = 400;
            throw error;
        }
    }

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor || !doctor.status) {
        const error = new Error("Doctor not found or inactive");
        error.status = 404;
        throw error;
    }

    const t = await sequelize.transaction();

    try {
        // Enforce transaction row lock and overlap check
        const normalizedStart = startTime.length === 5 ? `${startTime}:00` : startTime;
        const normalizedEnd = endTime.length === 5 ? `${endTime}:00` : endTime;

        const conflictingAppointment = await DoctorAppointment.findOne({
            where: {
                doctorId,
                appointmentDate,
                appointmentStatus: {
                    [Op.ne]: "CANCELLED"
                },
                [Op.and]: [
                    { startTime: { [Op.lt]: normalizedEnd } },
                    { endTime: { [Op.gt]: normalizedStart } }
                ]
            },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (conflictingAppointment) {
            const error = new Error("This doctor slot has already been booked. Please select another slot.");
            error.status = 409;
            throw error;
        }

        const bookingNumber = `HS-DOC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const booking = await Booking.create(
            {
                bookingNumber,
                userId,
                bookingType: "DOCTOR",
                bookingStatus: "CONFIRMED",
                paymentStatus: "PENDING",
                subtotal: doctor.consultationFee,
                discountAmount: 0.00,
                totalAmount: doctor.consultationFee,
                bookingDate: appointmentDate,
                notes: notes || null
            },
            { transaction: t }
        );

        await BookingItem.create(
            {
                bookingId: booking.id,
                itemType: "DOCTOR_CONSULTATION",
                itemId: doctor.id,
                itemName: `Dr. ${doctor.doctorName} - ${doctor.specialization} Consultation (${consultationType})`,
                unitPrice: doctor.consultationFee,
                quantity: 1,
                totalPrice: doctor.consultationFee
            },
            { transaction: t }
        );

        const appointment = await DoctorAppointment.create(
            {
                bookingId: booking.id,
                doctorId: doctor.id,
                patientName,
                patientPhone,
                patientGender: patientGender || null,
                patientAge: patientAge || null,
                appointmentDate,
                startTime: normalizedStart,
                endTime: normalizedEnd,
                consultationType,
                appointmentStatus: "SCHEDULED"
            },
            { transaction: t }
        );

        await t.commit();

        const fullAppointment = await getAppointmentById(appointment.id, userId);

        // Phase 7: Trigger Confirmation Notification & Schedule Appointment Reminder
        try {
            const outbox = await notificationsService.createOutboxEvent(EVENT_TYPES.BOOKING_CONFIRMED, {
                userId,
                userName: fullAppointment.booking?.user?.name,
                email: fullAppointment.booking?.user?.email,
                phone: fullAppointment.patientPhone || fullAppointment.booking?.user?.phone,
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                serviceName: `Dr. ${doctor.doctorName} Consultation`,
                doctorName: doctor.doctorName,
                date: appointmentDate,
                timeSlot: `${normalizedStart} - ${normalizedEnd}`,
                consultationType,
                bookingUrl: `/dashboard/bookings/${booking.id}`
            });
            await notificationsService.dispatchOutboxEvent(outbox.id);
            await notificationsService.scheduleAppointmentReminder(appointment.id);
        } catch (notifErr) {
            console.warn("Appointment notification dispatch notice:", notifErr.message);
        }

        return fullAppointment;
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

async function getAppointmentById(appointmentId, userId = null, isAdmin = false) {
    const appointment = await DoctorAppointment.findByPk(appointmentId, {
        include: [
            {
                model: Booking,
                as: "booking",
                include: [
                    {
                        model: BookingItem,
                        as: "items"
                    },
                    {
                        model: User,
                        as: "user",
                        attributes: ["id", "name", "email", "phone"]
                    }
                ]
            },
            {
                model: Doctor,
                as: "doctor",
                attributes: ["id", "doctorName", "specialization", "qualification", "consultationFee", "profileImage", "city"]
            }
        ]
    });

    if (!appointment) {
        const error = new Error("Appointment not found");
        error.status = 404;
        throw error;
    }

    if (!isAdmin && userId && Number(appointment.booking.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to access this appointment");
        error.status = 403;
        throw error;
    }

    return appointment;
}

async function getMyAppointments(userId, query = {}) {
    const { page = 1, limit = 10, status } = query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status && status !== "all") {
        where.appointmentStatus = status;
    }

    const { count, rows } = await DoctorAppointment.findAndCountAll({
        where,
        order: [
            ["appointmentDate", "DESC"],
            ["startTime", "DESC"]
        ],
        offset,
        limit,
        include: [
            {
                model: Booking,
                as: "booking",
                where: { userId },
                required: true,
                include: [
                    {
                        model: BookingItem,
                        as: "items"
                    }
                ]
            },
            {
                model: Doctor,
                as: "doctor",
                attributes: ["id", "doctorName", "specialization", "consultationFee", "profileImage", "city"]
            }
        ]
    });

    return {
        appointments: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit) || 1
        }
    };
}

async function cancelAppointment(appointmentId, userId, reason = "", isAdmin = false) {
    const appointment = await DoctorAppointment.findByPk(appointmentId, {
        include: [{ model: Booking, as: "booking" }]
    });

    if (!appointment) {
        const error = new Error("Appointment not found");
        error.status = 404;
        throw error;
    }

    if (!isAdmin && Number(appointment.booking.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to cancel this appointment");
        error.status = 403;
        throw error;
    }

    if (appointment.appointmentStatus === "CANCELLED") {
        const error = new Error("Appointment is already cancelled");
        error.status = 400;
        throw error;
    }

    if (appointment.appointmentStatus === "COMPLETED") {
        const error = new Error("Completed appointments cannot be cancelled");
        error.status = 400;
        throw error;
    }

    const t = await sequelize.transaction();
    try {
        await appointment.update(
            {
                appointmentStatus: "CANCELLED",
                cancellationReason: reason || "Cancelled by patient"
            },
            { transaction: t }
        );

        await appointment.booking.update(
            {
                bookingStatus: "CANCELLED"
            },
            { transaction: t }
        );

        await t.commit();

        try {
            const user = await User.findByPk(appointment.booking.userId);
            const outbox = await notificationsService.createOutboxEvent(EVENT_TYPES.BOOKING_CANCELLED, {
                userId: appointment.booking.userId,
                userName: user?.name,
                email: user?.email,
                bookingId: appointment.bookingId,
                bookingNumber: appointment.booking.bookingNumber,
                reason: reason || "Cancelled by patient",
                dashboardUrl: `/dashboard/bookings`
            });
            await notificationsService.dispatchOutboxEvent(outbox.id);
        } catch (notifErr) {
            console.warn("Appointment cancellation notification notice:", notifErr.message);
        }

        return appointment;
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

async function rescheduleAppointment(appointmentId, userId, newDate, newStartTime, newEndTime, isAdmin = false) {
    const todayStr = getTodayDateStr();
    if (newDate < todayStr) {
        const error = new Error("Cannot reschedule to past dates");
        error.status = 400;
        throw error;
    }

    if (newDate === todayStr) {
        const startMin = timeToMinutes(newStartTime);
        const nowMin = timeToMinutes(getCurrentTimeStr());
        if (startMin <= nowMin) {
            const error = new Error("Cannot reschedule to past time slots for today");
            error.status = 400;
            throw error;
        }
    }

    const appointment = await DoctorAppointment.findByPk(appointmentId, {
        include: [{ model: Booking, as: "booking" }]
    });

    if (!appointment) {
        const error = new Error("Appointment not found");
        error.status = 404;
        throw error;
    }

    if (!isAdmin && Number(appointment.booking.userId) !== Number(userId)) {
        const error = new Error("Unauthorized to reschedule this appointment");
        error.status = 403;
        throw error;
    }

    if (appointment.appointmentStatus === "CANCELLED" || appointment.appointmentStatus === "COMPLETED") {
        const error = new Error(`Cannot reschedule an appointment that is ${appointment.appointmentStatus.toLowerCase()}`);
        error.status = 400;
        throw error;
    }

    const normalizedStart = newStartTime.length === 5 ? `${newStartTime}:00` : newStartTime;
    const normalizedEnd = newEndTime.length === 5 ? `${newEndTime}:00` : newEndTime;

    const t = await sequelize.transaction();
    try {
        const conflict = await DoctorAppointment.findOne({
            where: {
                id: { [Op.ne]: appointment.id },
                doctorId: appointment.doctorId,
                appointmentDate: newDate,
                appointmentStatus: { [Op.ne]: "CANCELLED" },
                [Op.and]: [
                    { startTime: { [Op.lt]: normalizedEnd } },
                    { endTime: { [Op.gt]: normalizedStart } }
                ]
            },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (conflict) {
            const error = new Error("The selected time slot is already booked. Please choose a different slot.");
            error.status = 409;
            throw error;
        }

        await appointment.update(
            {
                appointmentDate: newDate,
                startTime: normalizedStart,
                endTime: normalizedEnd,
                appointmentStatus: "RESCHEDULED"
            },
            { transaction: t }
        );

        await appointment.booking.update(
            {
                bookingDate: newDate,
                bookingStatus: "RESCHEDULED"
            },
            { transaction: t }
        );

        await t.commit();
        const fullAppointment = await getAppointmentById(appointment.id, userId, isAdmin);

        try {
            const outbox = await notificationsService.createOutboxEvent(EVENT_TYPES.BOOKING_RESCHEDULED, {
                userId: fullAppointment.booking.userId,
                userName: fullAppointment.booking?.user?.name,
                email: fullAppointment.booking?.user?.email,
                bookingId: fullAppointment.bookingId,
                bookingNumber: fullAppointment.booking.bookingNumber,
                doctorName: fullAppointment.doctor?.doctorName,
                newDate,
                newSlot: `${normalizedStart} - ${normalizedEnd}`,
                bookingUrl: `/dashboard/bookings/${fullAppointment.bookingId}`
            });
            await notificationsService.dispatchOutboxEvent(outbox.id);
            await notificationsService.scheduleAppointmentReminder(fullAppointment.id);
        } catch (notifErr) {
            console.warn("Reschedule notification dispatch notice:", notifErr.message);
        }

        return fullAppointment;
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

module.exports = {
    getAvailableSlots,
    createAppointment,
    getAppointmentById,
    getMyAppointments,
    cancelAppointment,
    rescheduleAppointment
};

