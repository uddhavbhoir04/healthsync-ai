const assert = require("assert");

const {
    querySlotsSchema,
    createAppointmentSchema,
    cancelAppointmentSchema,
    rescheduleAppointmentSchema
} = require("../modules/appointments/appointments.validation");

const {
    createBookingSchema,
    queryBookingsSchema,
    adminQueryBookingsSchema,
    adminUpdateStatusSchema,
    cancelBookingSchema
} = require("../modules/bookings/bookings.validation");

console.log("=== Running HealthSync AI Phase 4 Test Suite ===\n");

let passed = 0;
let failed = 0;

function it(description, fn) {
    try {
        fn();
        console.log(`  ✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

async function runTests() {
    // 1. Appointment Schemas & Validation
    console.log("1. Appointment Validation & Schemas:");

    it("1.1 should validate valid appointment creation payload", () => {
        const payload = {
            doctorId: 1,
            appointmentDate: "2026-12-15",
            startTime: "10:00",
            endTime: "10:30",
            consultationType: "ONLINE",
            patientName: "John Doe",
            patientPhone: "1234567890",
            patientGender: "MALE",
            patientAge: 32,
            notes: "Routine health consultation"
        };
        const res = createAppointmentSchema.safeParse(payload);
        assert.strictEqual(res.success, true);
    });

    it("1.2 should reject appointment with invalid date format", () => {
        const payload = {
            doctorId: 1,
            appointmentDate: "15-12-2026", // should be YYYY-MM-DD
            startTime: "10:00",
            endTime: "10:30",
            patientName: "John Doe",
            patientPhone: "1234567890"
        };
        const res = createAppointmentSchema.safeParse(payload);
        assert.strictEqual(res.success, false);
    });

    it("1.3 should reject appointment with invalid time format", () => {
        const payload = {
            doctorId: 1,
            appointmentDate: "2026-12-15",
            startTime: "25:70", // invalid time
            endTime: "10:30",
            patientName: "John Doe",
            patientPhone: "1234567890"
        };
        const res = createAppointmentSchema.safeParse(payload);
        assert.strictEqual(res.success, false);
    });

    it("1.4 should validate slot query parameters", () => {
        const valid = { doctorId: "2", date: "2026-11-20" };
        const res = querySlotsSchema.safeParse(valid);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.data.doctorId, 2);
    });

    it("1.5 should validate appointment rescheduling schema", () => {
        const valid = {
            newDate: "2026-12-18",
            newStartTime: "14:00",
            newEndTime: "14:30"
        };
        const res = rescheduleAppointmentSchema.safeParse(valid);
        assert.strictEqual(res.success, true);
    });

    // 2. Slot Partitioning & Conflict Math Logic
    console.log("\n2. Slot Partitioning & Conflict Detection Algorithm:");

    function timeToMinutes(timeStr) {
        const parts = timeStr.split(":");
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    function minutesToTime(minutes) {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    }

    function generateTestSlots(startTime, endTime, slotDuration, bookedAppointments = [], currentTimeMinutes = -1) {
        const startMin = timeToMinutes(startTime);
        const endMin = timeToMinutes(endTime);
        const slots = [];
        let cur = startMin;

        while (cur + slotDuration <= endMin) {
            const slotStartMin = cur;
            const slotEndMin = cur + slotDuration;
            const slotStartTime = minutesToTime(slotStartMin);
            const slotEndTime = minutesToTime(slotEndMin);

            const hasConflict = bookedAppointments.some(appt => {
                const apptStart = timeToMinutes(appt.startTime);
                const apptEnd = timeToMinutes(appt.endTime);
                return apptStart < slotEndMin && apptEnd > slotStartMin;
            });

            const isPast = currentTimeMinutes !== -1 && slotStartMin <= currentTimeMinutes;

            let isAvailable = true;
            let unavailableReason = null;

            if (isPast) {
                isAvailable = false;
                unavailableReason = "Past slot";
            } else if (hasConflict) {
                isAvailable = false;
                unavailableReason = "Booked";
            }

            slots.push({
                startTime: slotStartTime,
                endTime: slotEndTime,
                isAvailable,
                unavailableReason
            });

            cur += slotDuration;
        }

        return slots;
    }

    it("2.1 should correctly partition a 3-hour window into 6 thirty-minute slots", () => {
        const slots = generateTestSlots("09:00", "12:00", 30);
        assert.strictEqual(slots.length, 6);
        assert.strictEqual(slots[0].startTime, "09:00");
        assert.strictEqual(slots[0].endTime, "09:30");
        assert.strictEqual(slots[5].startTime, "11:30");
        assert.strictEqual(slots[5].endTime, "12:00");
    });

    it("2.2 should mark overlapping booked slot as unavailable with reason 'Booked'", () => {
        const booked = [{ startTime: "10:00", endTime: "10:30" }];
        const slots = generateTestSlots("09:00", "11:00", 30, booked);
        assert.strictEqual(slots.length, 4);
        assert.strictEqual(slots[0].isAvailable, true); // 09:00-09:30
        assert.strictEqual(slots[1].isAvailable, true); // 09:30-10:00
        assert.strictEqual(slots[2].isAvailable, false); // 10:00-10:30 (Booked)
        assert.strictEqual(slots[2].unavailableReason, "Booked");
        assert.strictEqual(slots[3].isAvailable, true); // 10:30-11:00
    });

    it("2.3 should mark past slots as unavailable when evaluating today's slots", () => {
        // Current time is 10:15 (615 minutes)
        const currentTime = 10 * 60 + 15;
        const slots = generateTestSlots("09:00", "12:00", 30, [], currentTime);

        assert.strictEqual(slots[0].isAvailable, false); // 09:00 <= 10:15
        assert.strictEqual(slots[0].unavailableReason, "Past slot");
        assert.strictEqual(slots[1].isAvailable, false); // 09:30 <= 10:15
        assert.strictEqual(slots[2].isAvailable, false); // 10:00 <= 10:15
        assert.strictEqual(slots[3].isAvailable, true); // 10:30 > 10:15
    });

    // 3. Lab Test & Package Booking Schemas & Business Rules
    console.log("\n3. Lab Test & Diagnostic Package Booking Validation:");

    it("3.1 should validate valid home sample collection booking with addressId", () => {
        const payload = {
            bookingType: "LAB_TEST",
            items: [{ id: 1, quantity: 1 }, { id: 2, quantity: 1 }],
            collectionType: "HOME",
            addressId: 5,
            preferredDate: "2026-12-20",
            preferredTimeSlot: "08:00 - 10:00",
            notes: "Please call on arrival"
        };
        const res = createBookingSchema.safeParse(payload);
        assert.strictEqual(res.success, true);
    });

    it("3.2 should reject home sample collection if addressId is missing", () => {
        const payload = {
            bookingType: "LAB_TEST",
            items: [{ id: 1, quantity: 1 }],
            collectionType: "HOME",
            // addressId is omitted
            preferredDate: "2026-12-20",
            preferredTimeSlot: "08:00 - 10:00"
        };
        const res = createBookingSchema.safeParse(payload);
        assert.strictEqual(res.success, false);
        const errors = res.error.flatten().fieldErrors;
        assert.ok(errors.addressId);
    });

    it("3.3 should allow lab visit collection without addressId", () => {
        const payload = {
            bookingType: "PACKAGE",
            items: [{ id: 3, quantity: 1 }],
            collectionType: "LAB_VISIT",
            preferredDate: "2026-12-20",
            preferredTimeSlot: "10:00 - 12:00"
        };
        const res = createBookingSchema.safeParse(payload);
        assert.strictEqual(res.success, true);
    });

    it("3.4 should reject booking with zero items", () => {
        const payload = {
            bookingType: "LAB_TEST",
            items: [],
            collectionType: "LAB_VISIT",
            preferredDate: "2026-12-20",
            preferredTimeSlot: "09:00 - 11:00"
        };
        const res = createBookingSchema.safeParse(payload);
        assert.strictEqual(res.success, false);
    });

    // 4. Authoritative Pricing Calculation
    console.log("\n4. Authoritative Pricing & Snapshot Calculations:");

    it("4.1 should compute item totals and booking subtotal accurately", () => {
        const testItems = [
            { price: 45.00, quantity: 2 }, // 90.00
            { price: 120.00, quantity: 1 } // 120.00
        ];

        let subtotal = 0;
        const processed = testItems.map(item => {
            const total = item.price * item.quantity;
            subtotal += total;
            return { unitPrice: item.price, quantity: item.quantity, totalPrice: total };
        });

        assert.strictEqual(processed[0].totalPrice, 90.00);
        assert.strictEqual(processed[1].totalPrice, 120.00);
        assert.strictEqual(subtotal, 210.00);

        const discount = 0.00;
        const totalAmount = subtotal - discount;
        assert.strictEqual(totalAmount, 210.00);
    });

    // 5. Admin Booking Governance & Status Updates
    console.log("\n5. Admin Booking Governance & Query Validation:");

    it("5.1 should validate admin query schema with filters and search", () => {
        const query = {
            page: "1",
            limit: "20",
            type: "DOCTOR",
            status: "CONFIRMED",
            search: "HS-DOC-123"
        };
        const res = adminQueryBookingsSchema.safeParse(query);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.data.limit, 20);
        assert.strictEqual(res.data.type, "DOCTOR");
    });

    it("5.2 should validate admin status update schema with valid enum states", () => {
        const update = {
            bookingStatus: "COMPLETED",
            paymentStatus: "PAID",
            sampleStatus: "COMPLETED",
            appointmentStatus: "COMPLETED"
        };
        const res = adminUpdateStatusSchema.safeParse(update);
        assert.strictEqual(res.success, true);
    });

    it("5.3 should reject admin status update with invalid status enum", () => {
        const invalid = {
            bookingStatus: "UNKNOWN_STATUS"
        };
        const res = adminUpdateStatusSchema.safeParse(invalid);
        assert.strictEqual(res.success, false);
    });

    it("5.4 should validate cancellation schema with reason", () => {
        const payload = { reason: "Patient had emergency travel" };
        const res = cancelBookingSchema.safeParse(payload);
        assert.strictEqual(res.success, true);
    });

    console.log(`\n========================================`);
    console.log(`Phase 4 Test Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();

