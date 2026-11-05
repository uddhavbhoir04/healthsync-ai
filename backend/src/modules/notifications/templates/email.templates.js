/**
 * HealthSync AI - Responsive Transactional Email Templates & Plain-Text Fallbacks
 */

const APP_NAME = "HealthSync AI";
const PRIMARY_COLOR = "#0d9488"; // Teal-600

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function baseLayout({ title, previewText, contentHtml }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding: 32px 0; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
        .body { padding: 32px 28px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; }
        .row:last-child { border-bottom: none; }
        .row-label { color: #64748b; font-size: 13px; font-weight: 500; }
        .row-val { color: #0f172a; font-size: 13px; font-weight: 600; text-align: right; }
        .btn { display: inline-block; background-color: #0d9488; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 26px; border-radius: 10px; margin-top: 20px; text-align: center; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #dcfce7; color: #15803d; }
        .badge-warning { background: #fef9c3; color: #854d0e; }
        .badge-info { background: #e0f2fe; color: #0369a1; }
    </style>
</head>
<body>
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${escapeHtml(previewText || title)}
    </div>
    <table class="wrapper" role="presentation" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <div class="container">
                    <div class="header">
                        <h1>${APP_NAME}</h1>
                        <p>${escapeHtml(title)}</p>
                    </div>
                    <div class="body">
                        ${contentHtml}
                    </div>
                    <div class="footer">
                        <p style="margin: 0 0 6px;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
                        <p style="margin: 0;">This is an automated clinical platform notification. Please do not reply directly to this email.</p>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

const TEMPLATES = {
    WELCOME: {
        subject: () => `Welcome to ${APP_NAME}! Your Healthcare Journey Begins`,
        render: (p) => {
            const name = escapeHtml(p.name || "Patient");
            const html = `
                <p>Hello <strong>${name}</strong>,</p>
                <p>Thank you for creating an account with <strong>${APP_NAME}</strong>. We are committed to unifying your diagnostic ordering, doctor appointments, and medical report intelligence under one secure, seamless platform.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Account Name</span><span class="row-val">${name}</span></div>
                    <div class="row"><span class="row-label">Registered Email</span><span class="row-val">${escapeHtml(p.email)}</span></div>
                    <div class="row"><span class="row-label">Security</span><span class="row-val"><span class="badge badge-success">Active & Verified</span></span></div>
                </div>
                <p>You can now book specialist consultations, order pathology assays with home collection, and access clinical report summaries.</p>
                <a href="${escapeHtml(p.dashboardUrl || "http://localhost:3000/dashboard")}" class="btn">Go to Dashboard &rarr;</a>
            `;
            const text = `Hello ${name},\n\nWelcome to ${APP_NAME}! Your account (${p.email}) has been created.\nVisit your dashboard: ${p.dashboardUrl || "http://localhost:3000/dashboard"}\n\n- The ${APP_NAME} Team`;
            return {
                html: baseLayout({ title: "Welcome to HealthSync AI", previewText: `Welcome ${name}! Your account is ready.`, contentHtml: html }),
                text
            };
        }
    },

    BOOKING_CREATED: {
        subject: (p) => `Booking Received: #${p.bookingNumber || "Order"}`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const total = `₹${((p.totalAmount || 0) / 100).toFixed(2)}`;
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>We have received your booking request. Our logistics and scheduling team are currently preparing your details.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">Booking Type</span><span class="row-val">${escapeHtml(p.bookingType || "Healthcare Service")}</span></div>
                    <div class="row"><span class="row-label">Scheduled Date</span><span class="row-val">${escapeHtml(p.date || "Scheduled")}</span></div>
                    ${p.timeSlot ? `<div class="row"><span class="row-label">Time Window</span><span class="row-val">${escapeHtml(p.timeSlot)}</span></div>` : ""}
                    <div class="row"><span class="row-label">Total Amount</span><span class="row-val">${total}</span></div>
                    <div class="row"><span class="row-label">Payment Status</span><span class="row-val"><span class="badge badge-warning">${escapeHtml(p.paymentStatus || "PENDING")}</span></span></div>
                </div>
                <a href="${escapeHtml(p.bookingUrl || "http://localhost:3000/dashboard/bookings")}" class="btn">View Booking Details</a>
            `;
            const text = `Hello ${p.userName || "Patient"},\n\nYour booking #${p.bookingNumber} has been received for ${p.date || ""}.\nTotal: ${total}\nPayment Status: ${p.paymentStatus}\nView details: ${p.bookingUrl || "http://localhost:3000/dashboard/bookings"}`;
            return {
                html: baseLayout({ title: `Booking #${num} Received`, previewText: `Your booking #${num} has been received.`, contentHtml: html }),
                text
            };
        }
    },

    BOOKING_CONFIRMED: {
        subject: (p) => `Booking Confirmed: #${p.bookingNumber || "Order"}`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>Your healthcare booking has been <strong>confirmed</strong>. Your service is scheduled as detailed below.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">Service</span><span class="row-val">${escapeHtml(p.serviceName || p.bookingType || "Consultation / Test")}</span></div>
                    <div class="row"><span class="row-label">Appointment / Pickup Date</span><span class="row-val">${escapeHtml(p.date || "Scheduled")}</span></div>
                    ${p.timeSlot ? `<div class="row"><span class="row-label">Slot</span><span class="row-val">${escapeHtml(p.timeSlot)}</span></div>` : ""}
                    ${p.doctorName ? `<div class="row"><span class="row-label">Specialist</span><span class="row-val">Dr. ${escapeHtml(p.doctorName)}</span></div>` : ""}
                    ${p.address ? `<div class="row"><span class="row-label">Location / Address</span><span class="row-val">${escapeHtml(p.address)}</span></div>` : ""}
                    <div class="row"><span class="row-label">Status</span><span class="row-val"><span class="badge badge-success">CONFIRMED</span></span></div>
                </div>
                <p style="font-size: 13px; color: #64748b;">Please have your booking reference handy. If fasting is required, follow the preparation instructions provided in your portal.</p>
                <a href="${escapeHtml(p.bookingUrl || "http://localhost:3000/dashboard/bookings")}" class="btn">Manage Booking</a>
            `;
            const text = `Hello ${p.userName || "Patient"},\n\nYour booking #${p.bookingNumber} is confirmed for ${p.date || ""} (${p.timeSlot || ""}).\nService: ${p.serviceName || ""}\nStatus: CONFIRMED\nManage: ${p.bookingUrl || "http://localhost:3000/dashboard/bookings"}`;
            return {
                html: baseLayout({ title: `Booking #${num} Confirmed`, previewText: `Your booking #${num} is confirmed for ${p.date}.`, contentHtml: html }),
                text
            };
        }
    },

    BOOKING_CANCELLED: {
        subject: (p) => `Booking Cancelled: #${p.bookingNumber || "Order"}`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>Your booking <strong>#${num}</strong> has been cancelled.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">Status</span><span class="row-val"><span class="badge" style="background:#fee2e2;color:#b91c1c;">CANCELLED</span></span></div>
                    ${p.reason ? `<div class="row"><span class="row-label">Cancellation Reason</span><span class="row-val">${escapeHtml(p.reason)}</span></div>` : ""}
                </div>
                <p>If you paid online, any eligible refund is initiated automatically per our cancellation policy.</p>
                <a href="${escapeHtml(p.dashboardUrl || "http://localhost:3000/dashboard/bookings")}" class="btn">View Bookings</a>
            `;
            const text = `Hello ${p.userName || "Patient"},\n\nYour booking #${p.bookingNumber} has been cancelled.\nReason: ${p.reason || "N/A"}\nView bookings: ${p.dashboardUrl || "http://localhost:3000/dashboard/bookings"}`;
            return {
                html: baseLayout({ title: `Booking #${num} Cancelled`, previewText: `Booking #${num} has been cancelled.`, contentHtml: html }),
                text
            };
        }
    },

    BOOKING_RESCHEDULED: {
        subject: (p) => `Appointment Rescheduled: #${p.bookingNumber || "Appointment"}`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>Your appointment has been successfully rescheduled to a new date and time.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">New Date</span><span class="row-val">${escapeHtml(p.newDate)}</span></div>
                    <div class="row"><span class="row-label">New Time Slot</span><span class="row-val">${escapeHtml(p.newSlot)}</span></div>
                    ${p.doctorName ? `<div class="row"><span class="row-label">Doctor</span><span class="row-val">Dr. ${escapeHtml(p.doctorName)}</span></div>` : ""}
                    <div class="row"><span class="row-label">Status</span><span class="row-val"><span class="badge badge-info">RESCHEDULED</span></span></div>
                </div>
                <a href="${escapeHtml(p.bookingUrl || "http://localhost:3000/dashboard/bookings")}" class="btn">View Updated Details</a>
            `;
            const text = `Hello ${p.userName || "Patient"},\n\nYour appointment #${p.bookingNumber} has been rescheduled to ${p.newDate} at ${p.newSlot}.\nView: ${p.bookingUrl || "http://localhost:3000/dashboard/bookings"}`;
            return {
                html: baseLayout({ title: `Appointment #${num} Rescheduled`, previewText: `Your appointment #${num} is moved to ${p.newDate}.`, contentHtml: html }),
                text
            };
        }
    },

    APPOINTMENT_REMINDER: {
        subject: (p) => `Reminder: Doctor Appointment Tomorrow (#${p.bookingNumber || "Appointment"})`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>This is a friendly reminder of your upcoming doctor appointment scheduled for tomorrow.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">Doctor</span><span class="row-val">Dr. ${escapeHtml(p.doctorName || "Specialist")}</span></div>
                    <div class="row"><span class="row-label">Date</span><span class="row-val">${escapeHtml(p.date)}</span></div>
                    <div class="row"><span class="row-label">Time</span><span class="row-val">${escapeHtml(p.timeSlot)}</span></div>
                    <div class="row"><span class="row-label">Type</span><span class="row-val">${escapeHtml(p.consultationType || "IN_PERSON")}</span></div>
                </div>
                <p style="font-size: 13px; color: #64748b;">Please arrive 10 minutes early or ensure your internet connection is stable if joining a teleconsultation.</p>
                <a href="${escapeHtml(p.bookingUrl || "http://localhost:3000/dashboard/bookings")}" class="btn">View Appointment</a>
            `;
            const text = `Reminder: You have an appointment with Dr. ${p.doctorName || "Specialist"} on ${p.date} at ${p.timeSlot} (#${p.bookingNumber}).\nView: ${p.bookingUrl || "http://localhost:3000/dashboard/bookings"}`;
            return {
                html: baseLayout({ title: "Upcoming Appointment Reminder", previewText: `Reminder: Appointment with Dr. ${p.doctorName} on ${p.date}`, contentHtml: html }),
                text
            };
        }
    },

    LAB_COLLECTION_REMINDER: {
        subject: (p) => `Reminder: Home Specimen Pickup Tomorrow (#${p.bookingNumber || "Lab Order"})`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>Your certified phlebotomist is scheduled for specimen collection tomorrow.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">Collection Date</span><span class="row-val">${escapeHtml(p.date)}</span></div>
                    <div class="row"><span class="row-label">Time Window</span><span class="row-val">${escapeHtml(p.timeSlot)}</span></div>
                    ${p.fastingRequired ? `<div class="row"><span class="row-label">Fasting Directive</span><span class="row-val"><span class="badge badge-warning">10-12 Hr Fasting Required</span></span></div>` : ""}
                    ${p.address ? `<div class="row"><span class="row-label">Address</span><span class="row-val">${escapeHtml(p.address)}</span></div>` : ""}
                </div>
                ${p.fastingRequired ? `<p style="font-size: 13px; color: #b45309; font-weight: 600;">⚠️ Important: Avoid food, sweetened drinks, tea and coffee during your fast. Plain water is permitted and encouraged for hydration.</p>` : ""}
                <a href="${escapeHtml(p.bookingUrl || "http://localhost:3000/dashboard/bookings")}" class="btn">Review Collection Details</a>
            `;
            const text = `Reminder: Home specimen pickup is scheduled for ${p.date} (${p.timeSlot}) for booking #${p.bookingNumber}.${p.fastingRequired ? "\nFasting: 10-12 hours fasting required (water only)." : ""}\nView: ${p.bookingUrl || "http://localhost:3000/dashboard/bookings"}`;
            return {
                html: baseLayout({ title: "Home Specimen Pickup Reminder", previewText: `Reminder: Sample pickup scheduled for ${p.date}`, contentHtml: html }),
                text
            };
        }
    },

    PAYMENT_SUCCESS: {
        subject: (p) => `Payment Confirmed: ₹${((p.amount || 0) / 100).toFixed(2)} for #${p.bookingNumber || "Booking"}`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const amountStr = `₹${((p.amount || 0) / 100).toFixed(2)}`;
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>Your payment has been successfully processed and verified. Thank you!</p>
                <div class="card">
                    <div class="row"><span class="row-label">Amount Paid</span><span class="row-val">${amountStr}</span></div>
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">Payment ID</span><span class="row-val">${escapeHtml(p.paymentId || "Online Payment")}</span></div>
                    <div class="row"><span class="row-label">Date</span><span class="row-val">${escapeHtml(p.date || new Date().toLocaleDateString())}</span></div>
                    <div class="row"><span class="row-label">Payment Status</span><span class="row-val"><span class="badge badge-success">PAID</span></span></div>
                </div>
                <a href="${escapeHtml(p.receiptUrl || "http://localhost:3000/dashboard/payments")}" class="btn">View Transaction Dossier</a>
            `;
            const text = `Payment Confirmed: ${amountStr} for booking #${p.bookingNumber}.\nPayment ID: ${p.paymentId || ""}\nStatus: PAID\nView: ${p.receiptUrl || "http://localhost:3000/dashboard/payments"}`;
            return {
                html: baseLayout({ title: "Payment Verified Successfully", previewText: `Payment confirmed: ${amountStr} for #${num}`, contentHtml: html }),
                text
            };
        }
    },

    PAYMENT_FAILED: {
        subject: (p) => `Payment Attempt Failed: #${p.bookingNumber || "Booking"}`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>We could not complete your payment attempt for booking <strong>#${num}</strong>.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">Status</span><span class="row-val"><span class="badge" style="background:#fee2e2;color:#b91c1c;">PAYMENT_FAILED</span></span></div>
                    ${p.reason ? `<div class="row"><span class="row-label">Reason</span><span class="row-val">${escapeHtml(p.reason)}</span></div>` : ""}
                </div>
                <p>No funds were deducted. You can safely retry payment from your dashboard.</p>
                <a href="${escapeHtml(p.retryUrl || "http://localhost:3000/dashboard/bookings")}" class="btn">Retry Payment Now</a>
            `;
            const text = `Payment failed for booking #${p.bookingNumber}.\nReason: ${p.reason || "Payment was rejected or cancelled"}\nRetry: ${p.retryUrl || "http://localhost:3000/dashboard/bookings"}`;
            return {
                html: baseLayout({ title: `Payment Failed for #${num}`, previewText: `Your payment attempt for #${num} was unsuccessful.`, contentHtml: html }),
                text
            };
        }
    },

    REFUND_PROCESSED: {
        subject: (p) => `Refund Processed: ₹${((p.amount || 0) / 100).toFixed(2)} for #${p.bookingNumber || "Booking"}`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const amountStr = `₹${((p.amount || 0) / 100).toFixed(2)}`;
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>A refund has been processed for your booking <strong>#${num}</strong>.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Refund Amount</span><span class="row-val">${amountStr}</span></div>
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">Refund ID</span><span class="row-val">${escapeHtml(p.refundId || "Processed")}</span></div>
                    <div class="row"><span class="row-label">Status</span><span class="row-val"><span class="badge badge-success">PROCESSED</span></span></div>
                </div>
                <p style="font-size: 13px; color: #64748b;">Depending on your issuing bank, the credit typically reflects in your original payment source within 5 to 7 business days.</p>
                <a href="${escapeHtml(p.dashboardUrl || "http://localhost:3000/dashboard/payments")}" class="btn">View Refund History</a>
            `;
            const text = `Refund Processed: ${amountStr} for booking #${p.bookingNumber}.\nRefund ID: ${p.refundId || ""}\nCredits reflect within 5-7 business days.`;
            return {
                html: baseLayout({ title: `Refund Processed: ${amountStr}`, previewText: `A refund of ${amountStr} has been processed for #${num}.`, contentHtml: html }),
                text
            };
        }
    },

    AI_REPORT_READY: {
        subject: () => `Clinical Report Summary Ready: ${APP_NAME}`,
        render: (p) => {
            const html = `
                <p>Hello <strong>${escapeHtml(p.userName || "Patient")}</strong>,</p>
                <p>Your uploaded laboratory report <strong>${escapeHtml(p.fileName || "Medical Document")}</strong> has been analyzed by our clinical intelligence assistant.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Document Name</span><span class="row-val">${escapeHtml(p.fileName || "Report")}</span></div>
                    <div class="row"><span class="row-label">Observations Extracted</span><span class="row-val">${p.observationCount || "Completed"}</span></div>
                    <div class="row"><span class="row-label">Status</span><span class="row-val"><span class="badge badge-success">ANALYSIS READY</span></span></div>
                </div>
                <p>You can now inspect your plain-language biomarker overview, reference ranges, and doctor discussion points in your secure portal.</p>
                <p style="font-size: 12px; color: #64748b; font-style: italic;">Note: HealthSync AI summaries are for informational context and never replace evaluation by a qualified medical practitioner.</p>
                <a href="${escapeHtml(p.reportUrl || "http://localhost:3000/dashboard/ai-assistant/reports")}" class="btn">Inspect Report Dossier</a>
            `;
            const text = `Hello ${p.userName || "Patient"},\n\nYour clinical report summary for "${p.fileName || "Report"}" is ready.\nInspect your dossier: ${p.reportUrl || "http://localhost:3000/dashboard/ai-assistant/reports"}\n\nDisclaimer: Not a medical diagnosis. Consult your physician.`;
            return {
                html: baseLayout({ title: "Medical Report Analysis Ready", previewText: `Your report analysis for ${p.fileName} is ready.`, contentHtml: html }),
                text
            };
        }
    },

    ADMIN_BOOKING_ALERT: {
        subject: (p) => `[Admin Alert] High Priority Booking #${p.bookingNumber || "Order"}`,
        render: (p) => {
            const num = escapeHtml(p.bookingNumber);
            const html = `
                <p>Hello Administrator,</p>
                <p>A new booking requiring administrative oversight has been registered on HealthSync AI.</p>
                <div class="card">
                    <div class="row"><span class="row-label">Booking Number</span><span class="row-val">${num}</span></div>
                    <div class="row"><span class="row-label">Type</span><span class="row-val">${escapeHtml(p.bookingType || "Service")}</span></div>
                    <div class="row"><span class="row-label">User</span><span class="row-val">${escapeHtml(p.userName || "User ID: " + p.userId)}</span></div>
                    <div class="row"><span class="row-label">Total Amount</span><span class="row-val">₹${((p.totalAmount || 0) / 100).toFixed(2)}</span></div>
                </div>
                <a href="${escapeHtml(p.adminUrl || "http://localhost:3000/dashboard/admin/bookings")}" class="btn">Open Admin Console</a>
            `;
            const text = `Admin Alert: Booking #${p.bookingNumber} (${p.bookingType}) by ${p.userName || p.userId}.\nAdmin URL: ${p.adminUrl || "http://localhost:3000/dashboard/admin/bookings"}`;
            return {
                html: baseLayout({ title: `Admin Alert: Booking #${num}`, previewText: `New booking #${num} needs oversight.`, contentHtml: html }),
                text
            };
        }
    }
};

function renderTemplate(eventType, payload) {
    const template = TEMPLATES[eventType];
    if (!template) {
        throw new Error(`No email template found for event type: ${eventType}`);
    }
    const subject = template.subject(payload);
    const { html, text } = template.render(payload);
    return { subject, html, text };
}

module.exports = {
    TEMPLATES,
    renderTemplate,
    escapeHtml
};

