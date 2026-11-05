const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config(); // fallback

const { DataTypes } = require("sequelize");
const app = require("./app");
const sequelize = require("./config/database");
require("./models");
const { initNotificationWorkers, stopNotificationWorkers } = require("./modules/notifications/worker");
const { closeQueuesAndWorkers } = require("./modules/notifications/queue");

// Uses process.env.PORT or defaults to 5000 (standard Docker/Render convention)
const PORT = Number(process.env.PORT || 5000);

// Global Unhandled Process Errors: Log everything to terminal
process.on("unhandledRejection", (reason) => {
    console.error("\n❌ [CRITICAL UNHANDLED PROMISE REJECTION]:");
    console.error(reason?.stack || reason);
    console.error("--------------------------------------------------\n");
});

process.on("uncaughtException", (error) => {
    console.error("\n❌ [CRITICAL UNCAUGHT EXCEPTION]:");
    console.error(error?.stack || error);
    console.error("--------------------------------------------------\n");
});

async function syncPhase2Columns(seq) {
    try {
        const queryInterface = seq.getQueryInterface();
        const userTable = await queryInterface.describeTable("USERS");

        if (!userTable.phone) {
            await queryInterface.addColumn("USERS", "phone", {
                type: DataTypes.STRING(20),
                allowNull: true
            });
            console.log("✓ Added 'phone' column to USERS");
        }
        if (!userTable.date_of_birth) {
            await queryInterface.addColumn("USERS", "date_of_birth", {
                type: DataTypes.DATEONLY,
                allowNull: true
            });
            console.log("✓ Added 'date_of_birth' column to USERS");
        }
        if (!userTable.gender) {
            await queryInterface.addColumn("USERS", "gender", {
                type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"),
                allowNull: true
            });
            console.log("✓ Added 'gender' column to USERS");
        }
        if (!userTable.profile_image_url) {
            await queryInterface.addColumn("USERS", "profile_image_url", {
                type: DataTypes.STRING(500),
                allowNull: true
            });
            console.log("✓ Added 'profile_image_url' column to USERS");
        }
    } catch (err) {
        console.warn("Schema synchronization notice:", err.message);
    }
}

async function connectWithRetry(maxRetries = 5, delayMs = 3000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Connecting to database at ${process.env.DB_HOST || "localhost"} (attempt ${attempt}/${maxRetries})...`);
            await sequelize.authenticate();
            console.log("✓ Database connected successfully");
            return;
        } catch (err) {
            console.warn(`⚠️ Database connection attempt ${attempt} failed: ${err.message}`);
            if (attempt === maxRetries) throw err;
            await new Promise((res) => setTimeout(res, delayMs));
        }
    }
}

async function startServer() {
    try {
        await connectWithRetry();

        if (process.env.NODE_ENV !== "production") {
            try {
                await sequelize.sync();
                console.log("✓ Database tables synchronized");
                await syncPhase2Columns(sequelize);
            } catch (syncError) {
                console.warn("⚠️  Database sync warning (continuing server startup):", syncError.message);
            }
        }

        const server = app.listen(PORT, "0.0.0.0", () => {
            console.log("\n========================================================");
            console.log(`🚀 HealthSync AI Backend is RUNNING on port ${PORT}`);
            console.log(`📡 Base URL: http://localhost:${PORT}`);
            console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
            console.log(`🌐 Frontend Allowed: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
            console.log("========================================================\n");

            // Initialize background BullMQ workers and outbox sweeps if embedded mode is enabled
            if (process.env.ENABLE_EMBEDDED_WORKER !== "false") {
                initNotificationWorkers();
            } else {
                console.log("ℹ Embedded worker disabled (running as standalone worker process).");
            }
        });

        const gracefulShutdown = async () => {
            console.log("\nInitiating graceful shutdown...");
            stopNotificationWorkers();
            await closeQueuesAndWorkers();
            server.close(() => {
                console.log("✓ HTTP server closed");
                process.exit(0);
            });
        };

        process.on("SIGINT", gracefulShutdown);
        process.on("SIGTERM", gracefulShutdown);

        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                console.error(`\n❌ [PORT CONFLICT ERROR] Port ${PORT} is already in use by another process!`);
                console.error(`👉 Another instance of node is still running on port ${PORT}.`);
                console.error(`👉 Run this command in your terminal to stop it, then restart:`);
                console.error(`   lsof -ti :${PORT} | xargs kill -9\n`);
            } else {
                console.error(`\n❌ [SERVER BINDING ERROR]:`, err.message);
                console.error(err.stack);
            }
            process.exit(1);
        });

    } catch (error) {
        console.error("\n❌ [FATAL SERVER STARTUP ERROR]:", error.message);
        if (error.original) {
            console.error("Database details:", error.original.sqlMessage || error.original.message);
        }
        console.error(error.stack);
        console.error("--------------------------------------------------------\n");
        process.exit(1);
    }
}

startServer();
