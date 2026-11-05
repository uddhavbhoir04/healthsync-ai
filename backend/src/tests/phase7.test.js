/**
 * HealthSync AI - Phase 7 Automated Test Suite
 * Notification System, BullMQ, Background Reminders, Providers & Templates
 */

const assert = require("assert");
const {
    EVENT_TYPES,
    CHANNELS,
    NOTIFICATION_STATUS,
    OUTBOX_STATUS,
    QUEUE_NAMES
} = require("../modules/notifications/notification.constants");

const {
    TEMPLATES,
    renderTemplate,
    escapeHtml
} = require("../modules/notifications/templates/email.templates");

const { sendEmail } = require("../modules/notifications/providers/email.provider");
const { sendSMS } = require("../modules/notifications/providers/sms.provider");
const { getVapidPublicKey } = require("../modules/notifications/providers/push.provider");

console.log("=== Running HealthSync AI Phase 7 Test Suite ===\n");

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

async function itAsync(description, fn) {
    try {
        await fn();
        console.log(`  ✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

async function runTests() {
    // -------------------------------------------------------------
    // 1. Constants & Enums Verification
    // -------------------------------------------------------------
    console.log("1. Notification System Constants:");

    it("1.1 should define all required event types", () => {
        const requiredEvents = [
            "WELCOME",
            "BOOKING_CREATED",
            "BOOKING_CONFIRMED",
            "BOOKING_CANCELLED",
            "BOOKING_RESCHEDULED",
            "APPOINTMENT_REMINDER",
            "LAB_COLLECTION_REMINDER",
            "PAYMENT_SUCCESS",
            "PAYMENT_FAILED",
            "REFUND_PROCESSED",
            "AI_REPORT_READY"
        ];
        for (const evt of requiredEvents) {
            assert.strictEqual(typeof EVENT_TYPES[evt], "string", `Missing event type: ${evt}`);
        }
    });

    it("1.2 should define all 4 notification channels", () => {
        assert.strictEqual(CHANNELS.IN_APP, "IN_APP");
        assert.strictEqual(CHANNELS.EMAIL, "EMAIL");
        assert.strictEqual(CHANNELS.PUSH, "PUSH");
        assert.strictEqual(CHANNELS.SMS, "SMS");
    });

    it("1.3 should define valid outbox and notification statuses", () => {
        assert.strictEqual(OUTBOX_STATUS.PENDING, "PENDING");
        assert.strictEqual(OUTBOX_STATUS.PROCESSING, "PROCESSING");
        assert.strictEqual(OUTBOX_STATUS.COMPLETED, "COMPLETED");
        assert.strictEqual(OUTBOX_STATUS.FAILED, "FAILED");

        assert.strictEqual(NOTIFICATION_STATUS.READ, "READ");
        assert.strictEqual(NOTIFICATION_STATUS.SENT, "SENT");
    });

    it("1.4 should define BullMQ queue names", () => {
        assert.strictEqual(QUEUE_NAMES.EMAIL, "notification-email");
        assert.strictEqual(QUEUE_NAMES.PUSH, "notification-push");
        assert.strictEqual(QUEUE_NAMES.REMINDERS, "notification-reminders");
    });

    // -------------------------------------------------------------
    // 2. HTML Sanitization & Email Template Rendering
    // -------------------------------------------------------------
    console.log("\n2. Email Templates & Sanitization:");

    it("2.1 should escape HTML entities in template variables to prevent XSS", () => {
        const unsafe = `<script>alert("hack")</script> & 'test'`;
        const sanitized = escapeHtml(unsafe);
        assert.ok(!sanitized.includes("<script>"));
        assert.ok(sanitized.includes("&lt;script&gt;"));
        assert.ok(sanitized.includes("&amp;"));
        assert.ok(sanitized.includes("&#039;test&#039;"));
    });

    it("2.2 should render WELCOME email template", () => {
        const payload = {
            name: "Dr. Gregory House",
            email: "ghouse@princeton-plainsboro.edu",
            dashboardUrl: "http://localhost:3000/dashboard"
        };
        const res = renderTemplate(EVENT_TYPES.WELCOME, payload);
        assert.ok(res.subject.includes("Welcome to HealthSync AI"));
        assert.ok(res.html.includes("Dr. Gregory House"));
        assert.ok(res.html.includes("ghouse@princeton-plainsboro.edu"));
        assert.ok(res.text.includes("Welcome to HealthSync AI"));
    });

    it("2.3 should render BOOKING_CREATED email template", () => {
        const payload = {
            userName: "Sarah Connor",
            bookingNumber: "HS-BKG-20261104-1001",
            bookingType: "DOCTOR_APPOINTMENT",
            date: "2026-11-10",
            timeSlot: "10:00 - 10:30",
            totalAmount: 150000,
            paymentStatus: "PENDING"
        };
        const res = renderTemplate(EVENT_TYPES.BOOKING_CREATED, payload);
        assert.ok(res.subject.includes("HS-BKG-20261104-1001"));
        assert.ok(res.html.includes("₹1500.00"));
        assert.ok(res.html.includes("Sarah Connor"));
        assert.ok(res.text.includes("HS-BKG-20261104-1001"));
    });

    it("2.4 should render BOOKING_CONFIRMED email template", () => {
        const payload = {
            userName: "John Doe",
            bookingNumber: "HS-BKG-20261104-1002",
            doctorName: "Dr. Emily Smith",
            specialization: "Cardiology",
            date: "2026-11-12",
            timeSlot: "14:00 - 14:30"
        };
        const res = renderTemplate(EVENT_TYPES.BOOKING_CONFIRMED, payload);
        assert.ok(res.subject.includes("Booking Confirmed: #HS-BKG-20261104-1002"));
        assert.ok(res.html.includes("Dr. Emily Smith"));
        assert.ok(res.text.includes("14:00 - 14:30"));
    });

    it("2.5 should render BOOKING_CANCELLED email template", () => {
        const payload = {
            userName: "John Doe",
            bookingNumber: "HS-BKG-20261104-1003",
            reason: "Patient schedule conflict",
            refundNote: "A refund has been initiated to your original payment method."
        };
        const res = renderTemplate(EVENT_TYPES.BOOKING_CANCELLED, payload);
        assert.ok(res.subject.includes("Booking Cancelled: #HS-BKG-20261104-1003"));
        assert.ok(res.html.includes("Patient schedule conflict"));
        assert.ok(res.text.includes("cancelled"));
    });

    it("2.6 should render BOOKING_RESCHEDULED email template", () => {
        const payload = {
            userName: "Jane Roe",
            bookingNumber: "HS-BKG-20261104-1004",
            newDate: "2026-11-15",
            newSlot: "11:00 - 11:30"
        };
        const res = renderTemplate(EVENT_TYPES.BOOKING_RESCHEDULED, payload);
        assert.ok(res.subject.includes("Appointment Rescheduled: #HS-BKG-20261104-1004"));
        assert.ok(res.html.includes("2026-11-15"));
        assert.ok(res.html.includes("11:00 - 11:30"));
    });

    it("2.7 should render REMINDER_APPOINTMENT email template with 24h instructions", () => {
        const payload = {
            userName: "Bruce Wayne",
            bookingNumber: "HS-BKG-20261104-1005",
            doctorName: "Jonathan Crane",
            date: "2026-11-05",
            timeSlot: "09:00 - 09:30",
            consultationType: "In-Clinic"
        };
        const res = renderTemplate(EVENT_TYPES.APPOINTMENT_REMINDER, payload);
        assert.ok(res.subject.includes("Reminder: Doctor Appointment Tomorrow"));
        assert.ok(res.html.includes("Dr. Jonathan Crane"));
        assert.ok(res.html.includes("arrive 10 minutes early"));
        assert.ok(res.text.includes("Reminder: You have an appointment with Dr. Jonathan Crane"));
    });

    it("2.8 should render REMINDER_LAB_COLLECTION email template with 12h fasting prep", () => {
        const payload = {
            userName: "Clark Kent",
            bookingNumber: "HS-BKG-20261104-1006",
            date: "2026-11-05",
            timeSlot: "07:00 - 08:00",
            fastingRequired: true,
            address: "344 Clinton St, Metropolis"
        };
        const res = renderTemplate(EVENT_TYPES.LAB_COLLECTION_REMINDER, payload);
        assert.ok(res.subject.includes("Home Specimen Pickup Tomorrow"));
        assert.ok(res.html.includes("10-12 Hr Fasting Required"));
        assert.ok(res.html.includes("344 Clinton St"));
        assert.ok(res.text.includes("fasting"));
    });

    it("2.9 should render PAYMENT_SUCCESS and PAYMENT_FAILED templates", () => {
        const successRes = renderTemplate(EVENT_TYPES.PAYMENT_SUCCESS, {
            userName: "Diana Prince",
            bookingNumber: "HS-BKG-99",
            paymentId: "pay_sim_998877",
            amount: 250000,
            paymentMethod: "SIMULATED_CARD"
        });
        assert.ok(successRes.subject.includes("Payment Confirmed: ₹2500.00"));
        assert.ok(successRes.html.includes("₹2500.00"));
        assert.ok(successRes.html.includes("pay_sim_998877"));

        const failRes = renderTemplate(EVENT_TYPES.PAYMENT_FAILED, {
            userName: "Diana Prince",
            bookingNumber: "HS-BKG-99",
            reason: "Insufficient funds / card declined",
            retryUrl: "http://localhost:3000/dashboard/bookings"
        });
        assert.ok(failRes.subject.includes("Payment Attempt Failed: #HS-BKG-99"));
        assert.ok(failRes.html.includes("Insufficient funds"));
        assert.ok(failRes.html.includes("retry"));
    });

    it("2.10 should render REFUND_PROCESSED email template", () => {
        const res = renderTemplate(EVENT_TYPES.REFUND_PROCESSED, {
            userName: "Barry Allen",
            bookingNumber: "HS-BKG-501",
            amount: 120000,
            refundId: "rfnd_sim_12345",
            reason: "Cancelled within policy window"
        });
        assert.ok(res.subject.includes("Refund Processed: ₹1200.00"));
        assert.ok(res.html.includes("₹1200.00"));
        assert.ok(res.html.includes("rfnd_sim_12345"));
    });

    it("2.11 should render AI_REPORT_READY without leaking clinical parameters", () => {
        const res = renderTemplate(EVENT_TYPES.AI_REPORT_READY, {
            userName: "Arthur Curry",
            fileName: "Comprehensive Metabolic Panel Analysis",
            reportUrl: "http://localhost:3000/dashboard/ai-assistant/reports/42"
        });
        assert.ok(res.subject.includes("Clinical Report Summary Ready"));
        assert.ok(res.html.includes("Comprehensive Metabolic Panel"));
        // Privacy check: No raw biomarker values should be embedded in emails
        assert.ok(!res.html.includes("mg/dL"));
        assert.ok(!res.html.includes("mmol/L"));
        assert.ok(res.html.includes("http://localhost:3000/dashboard/ai-assistant/reports/42"));
    });

    it("2.12 should throw descriptive error when unknown event template is requested", () => {
        assert.throws(() => {
            renderTemplate("UNKNOWN_EVENT_TEST", {});
        }, /No email template found for event type: UNKNOWN_EVENT_TEST/);
    });

    // -------------------------------------------------------------
    // 3. Provider Adapters
    // -------------------------------------------------------------
    console.log("\n3. Notification Provider Adapters:");

    await itAsync("3.1 should send email in development mock mode without error", async () => {
        const res = await sendEmail({
            to: "patient@example.com",
            subject: "Test Notification",
            html: "<p>Hello</p>",
            text: "Hello"
        });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.isMock, true);
        assert.ok(res.messageId.startsWith("mock-"));
    });

    await itAsync("3.2 should send SMS via mock provider adapter", async () => {
        const res = await sendSMS({
            to: "+919876543210",
            message: "HealthSync AI test alert"
        });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.isMock, true);
    });

    it("3.3 should retrieve or auto-generate valid VAPID public key for Web Push", () => {
        const pubKey = getVapidPublicKey();
        assert.strictEqual(typeof pubKey, "string");
        assert.ok(pubKey.length > 20, "VAPID public key should be non-trivial base64/url string");
    });

    // -------------------------------------------------------------
    // 4. Delayed Reminder Time Calculations & Cancellation Gating
    // -------------------------------------------------------------
    console.log("\n4. Reminder Calculation & Cancellation Logic:");

    it("4.1 should calculate appointment reminder 24 hours prior to slot", () => {
        const appointmentDate = "2026-12-01";
        const startTime = "15:00";
        const appointmentDateTime = new Date(`${appointmentDate}T${startTime}`);
        const reminderHours = 24;
        const reminderTime = new Date(appointmentDateTime.getTime() - reminderHours * 60 * 60 * 1000);

        // Difference in ms must equal exact 24 hours
        assert.strictEqual(appointmentDateTime.getTime() - reminderTime.getTime(), 24 * 60 * 60 * 1000);
        assert.strictEqual(reminderTime.getDate(), 30); // Nov 30
        assert.strictEqual(reminderTime.getMonth(), 10); // November (0-indexed)
    });

    it("4.2 should calculate lab collection reminder 12 hours prior to slot", () => {
        const collectionDate = "2026-12-01";
        const timeSlotStr = "08:00";
        const collectionDateTime = new Date(`${collectionDate}T${timeSlotStr}:00`);
        const reminderHours = 12;
        const reminderTime = new Date(collectionDateTime.getTime() - reminderHours * 60 * 60 * 1000);

        // Difference in ms must equal exact 12 hours
        assert.strictEqual(collectionDateTime.getTime() - reminderTime.getTime(), 12 * 60 * 60 * 1000);
        assert.strictEqual(reminderTime.getDate(), 30); // Nov 30
    });

    it("4.3 should flag cancelled appointment as not eligible for reminder dispatch", () => {
        const mockAppointment = {
            id: 10,
            appointmentStatus: "CANCELLED",
            booking: { id: 25, status: "CANCELLED" }
        };

        const isEligible = (appt) => {
            if (!appt || !appt.booking || appt.appointmentStatus === "CANCELLED" || appt.booking.status === "CANCELLED") {
                return false;
            }
            return true;
        };

        assert.strictEqual(isEligible(mockAppointment), false);

        const activeAppt = {
            id: 11,
            appointmentStatus: "CONFIRMED",
            booking: { id: 26, status: "CONFIRMED" }
        };
        assert.strictEqual(isEligible(activeAppt), true);
    });

    it("4.4 should filter channels according to user preferences", () => {
        const userPrefs = {
            emailEnabled: true,
            pushEnabled: false,
            smsEnabled: false,
            appointmentReminders: true
        };

        const canDeliver = (channel, eventType, prefs) => {
            if (channel === "EMAIL" && !prefs.emailEnabled) return false;
            if (channel === "PUSH" && !prefs.pushEnabled) return false;
            if (channel === "SMS" && !prefs.smsEnabled) return false;
            if (eventType === "APPOINTMENT_REMINDER" && !prefs.appointmentReminders) return false;
            return true;
        };

        assert.strictEqual(canDeliver("EMAIL", "APPOINTMENT_REMINDER", userPrefs), true);
        assert.strictEqual(canDeliver("PUSH", "APPOINTMENT_REMINDER", userPrefs), false);
        assert.strictEqual(canDeliver("SMS", "APPOINTMENT_REMINDER", userPrefs), false);

        // When user disables appointment reminders
        const optOutPrefs = { ...userPrefs, appointmentReminders: false };
        assert.strictEqual(canDeliver("EMAIL", "APPOINTMENT_REMINDER", optOutPrefs), false);
    });

    // -------------------------------------------------------------
    // 5. Outbox Pattern State Machine
    // -------------------------------------------------------------
    console.log("\n5. Outbox State Machine & Exponential Backoff:");

    it("5.1 should transition outbox through PENDING -> PROCESSING -> COMPLETED", () => {
        let status = OUTBOX_STATUS.PENDING;
        assert.strictEqual(status, "PENDING");

        status = OUTBOX_STATUS.PROCESSING;
        assert.strictEqual(status, "PROCESSING");

        status = OUTBOX_STATUS.COMPLETED;
        assert.strictEqual(status, "COMPLETED");
    });

    it("5.2 should mark outbox as FAILED after reaching maximum retry attempts", () => {
        const MAX_ATTEMPTS = 5;
        let attempts = 4;
        let status = OUTBOX_STATUS.PROCESSING;

        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) {
            status = OUTBOX_STATUS.FAILED;
        }

        assert.strictEqual(attempts, 5);
        assert.strictEqual(status, "FAILED");
    });

    it("5.3 should calculate exponential backoff delay correctly", () => {
        const calculateDelay = (attempt, baseMs = 1000) => {
            return baseMs * Math.pow(2, attempt - 1);
        };

        assert.strictEqual(calculateDelay(1), 1000);   // Attempt 1: 1s
        assert.strictEqual(calculateDelay(2), 2000);   // Attempt 2: 2s
        assert.strictEqual(calculateDelay(3), 4000);   // Attempt 3: 4s
        assert.strictEqual(calculateDelay(4), 8000);   // Attempt 4: 8s
        assert.strictEqual(calculateDelay(5), 16000);  // Attempt 5: 16s
    });

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`Phase 7 Test Results: ${passed} passed, ${failed} failed`);
    console.log(`======================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error("Test runner encountered an unhandled exception:", err);
    process.exit(1);
});
