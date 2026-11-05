const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");


const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const doctorsRoutes = require("./modules/doctors/doctors.routes");
const adminDoctorsRoutes = require("./modules/doctors/admin-doctors.routes");
const labTestsRoutes = require("./modules/lab-tests/lab-tests.routes");
const adminLabTestsRoutes = require("./modules/lab-tests/admin-lab-tests.routes");
const packagesRoutes = require("./modules/packages/packages.routes");
const adminPackagesRoutes = require("./modules/packages/admin-packages.routes");
const searchRoutes = require("./modules/search/search.routes");
const appointmentsRoutes = require("./modules/appointments/appointments.routes");
const bookingsRoutes = require("./modules/bookings/bookings.routes");
const adminBookingsRoutes = require("./modules/bookings/admin-bookings.routes");
const paymentsRoutes = require("./modules/payments/payments.routes");
const adminPaymentsRoutes = require("./modules/payments/admin-payments.routes");
const webhooksRoutes = require("./modules/payments/webhooks.routes");
const aiRoutes = require("./modules/ai/ai.routes");
const adminAiRoutes = require("./modules/ai/admin-ai.routes");
const notificationsRoutes = require("./modules/notifications/notifications.routes");
const adminNotificationsRoutes = require("./modules/notifications/admin-notifications.routes");

const app = express();

app.set("trust proxy", 1); // Enable proxy trusting for Render / Cloudflare / reverse proxy TLS termination
app.set("etag", false); // Disable 304 caching so API always returns live data

app.use(helmet());

const allowedOrigin = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server) or matching allowedOrigin
        if (!origin || origin === allowedOrigin || origin === "http://localhost:3000") {
            return callback(null, true);
        }
        // In production, also allow vercel preview deployments matching healthsync-ai-*.vercel.app if needed
        return callback(null, true);
    },
    credentials: true
}));

// Terminal Request Logger: Immediately see every incoming request and status on the terminal
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const icon = status >= 500 ? "💥" : status >= 400 ? "⚠️" : "✓";
        const time = new Date().toLocaleTimeString();
        if (status >= 400) {
            console.warn(`[${time}] ${icon} ${req.method} ${req.originalUrl} -> HTTP ${status} (${duration}ms)`);
        } else {
            console.log(`[${time}] ${icon} ${req.method} ${req.originalUrl} -> HTTP ${status} (${duration}ms)`);
        }
    });
    next();
});

app.use(express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(cookieParser());

app.get(["/health", "/api/health"], (req, res) => {
    res.json({
        success: true,
        message: "HealthSync API is running"
    });
});

// Authentication & Profile Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

// Catalog Public Routes
app.use("/api/doctors", doctorsRoutes);
app.use("/api/lab-tests", labTestsRoutes);
app.use("/api/packages", packagesRoutes);
app.use("/api/search", searchRoutes);

// Booking & Appointment Routes
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/bookings", bookingsRoutes);

// Payment & Gateway Webhook Routes
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin/payments", adminPaymentsRoutes);
app.use("/api/webhooks", webhooksRoutes);

// Admin Governance & Catalog Management Routes
// AI Healthcare Assistant (Phase 6)
app.use("/api/ai", aiRoutes);
app.use("/api/admin/ai", adminAiRoutes);

// Notifications & Background Jobs (Phase 7)
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin/notifications", adminNotificationsRoutes);

app.use("/api/admin/bookings", adminBookingsRoutes);
app.use("/api/admin/doctors", adminDoctorsRoutes);
app.use("/api/admin/lab-tests", adminLabTestsRoutes);
app.use("/api/admin/packages", adminPackagesRoutes);
app.use("/api/admin", adminRoutes);

// Global Express Error Handler: Formats and displays all errors with stack trace on terminal
app.use((err, req, res, next) => {
    const status = err.status || (err.message && (err.message.includes("Invalid") || err.message.includes("already registered")) ? 400 : 500);

    console.error(`\n======================================================`);
    console.error(`❌ [SERVER ERROR ${status}] ${req.method} ${req.originalUrl}`);
    console.error(`Message: ${err.message}`);
    if (err.errors) {
        console.error("Validation Details:", JSON.stringify(err.errors, null, 2));
    }
    if (err.stack) {
        console.error("Stack Trace:\n", err.stack);
    }
    console.error(`======================================================\n`);

    res.status(status).json({
        success: false,
        message: err.message || "Internal server error",
        code: err.code && typeof err.code === "string" && err.code.startsWith("AI_") ? err.code : undefined,
        errors: err.errors || undefined
    });
});

module.exports = app;
