/**
 * HealthSync AI - Background Workers & Queue Processors
 * Listens to BullMQ queues and handles delayed reminders.
 */

const { registerWorker, QUEUE_NAMES } = require("./queue");
const { processOutboxEvent, createOutboxEvent, dispatchOutboxEvent } = require("./notifications.service");
const { DoctorAppointment, LabCollectionDetail, Booking, User, NotificationOutbox } = require("../../models");
const { EVENT_TYPES, OUTBOX_STATUS } = require("./notification.constants");
const { Op } = require("sequelize");

let outboxInterval = null;

function initNotificationWorkers() {
    console.log("Initializing HealthSync AI background notification workers...");

    // 1. Worker for Email / General Outbox Events
    registerWorker(QUEUE_NAMES.EMAIL, async (job) => {
        const { outboxId } = job.data;
        if (!outboxId) return;
        await processOutboxEvent(outboxId);
    });

    // 2. Worker for Delayed Appointment & Lab Reminders
    registerWorker(QUEUE_NAMES.REMINDERS, async (job) => {
        const { type, appointmentId, collectionId } = job.data;

        if (type === "APPOINTMENT_REMINDER" && appointmentId) {
            const appt = await DoctorAppointment.findByPk(appointmentId, {
                include: [
                    { model: Booking, as: "booking", include: [{ model: User, as: "user" }] }
                ]
            });

            // Recheck state: Never send reminders for cancelled appointments
            if (!appt || appt.appointmentStatus === "CANCELLED" || appt.booking?.bookingStatus === "CANCELLED") {
                console.log(`[REMINDER SKIPPED] Appointment #${appointmentId} was cancelled.`);
                return;
            }

            const outbox = await createOutboxEvent(EVENT_TYPES.APPOINTMENT_REMINDER, {
                userId: appt.booking.userId,
                userName: appt.booking.user?.name,
                email: appt.booking.user?.email,
                phone: appt.booking.user?.phone,
                bookingNumber: appt.booking.bookingNumber,
                doctorName: appt.doctor?.doctorName,
                date: appt.appointmentDate,
                timeSlot: `${appt.startTime} - ${appt.endTime}`,
                consultationType: appt.consultationType,
                bookingUrl: `/dashboard/bookings/${appt.booking.id}`
            });
            await dispatchOutboxEvent(outbox.id);
        }

        if (type === "LAB_COLLECTION_REMINDER" && collectionId) {
            const col = await LabCollectionDetail.findByPk(collectionId, {
                include: [
                    { model: Booking, as: "booking", include: [{ model: User, as: "user" }] }
                ]
            });

            // Recheck state: Never send reminders for cancelled collections
            if (!col || col.sampleStatus === "CANCELLED" || col.booking?.bookingStatus === "CANCELLED") {
                console.log(`[REMINDER SKIPPED] Collection #${collectionId} was cancelled.`);
                return;
            }

            const outbox = await createOutboxEvent(EVENT_TYPES.LAB_COLLECTION_REMINDER, {
                userId: col.booking.userId,
                userName: col.booking.user?.name,
                email: col.booking.user?.email,
                phone: col.booking.user?.phone,
                bookingNumber: col.booking.bookingNumber,
                date: col.collectionDate,
                timeSlot: col.timeSlot,
                fastingRequired: col.booking.bookingType === "LAB_TEST" || col.booking.bookingType === "PACKAGE",
                address: col.address?.addressLine1,
                bookingUrl: `/dashboard/bookings/${col.booking.id}`
            });
            await dispatchOutboxEvent(outbox.id);
        }
    });

    // 3. Periodic Outbox Sweeper (Guarantees at-least-once delivery even if Redis drops temporarily)
    if (!outboxInterval) {
        outboxInterval = setInterval(async () => {
            try {
                const pendingEvents = await NotificationOutbox.findAll({
                    where: {
                        status: OUTBOX_STATUS.PENDING,
                        attempts: { [Op.lt]: 5 },
                        availableAt: { [Op.lte]: new Date() }
                    },
                    limit: 10
                });

                for (const ev of pendingEvents) {
                    await dispatchOutboxEvent(ev.id);
                }
            } catch (err) {
                // Silently handle if DB is reconnecting
            }
        }, 60000);
    }
}

function stopNotificationWorkers() {
    if (outboxInterval) {
        clearInterval(outboxInterval);
        outboxInterval = null;
    }
}

module.exports = {
    initNotificationWorkers,
    stopNotificationWorkers
};

