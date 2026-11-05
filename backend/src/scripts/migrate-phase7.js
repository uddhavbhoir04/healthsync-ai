require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ts = () => ({
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false }
});
const pk = () => ({
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false }
});

async function migratePhase7() {
    console.log("=== HealthSync AI - Phase 7 Database Migration (Notifications & Background Jobs) ===");
    const queryInterface = sequelize.getQueryInterface();

    try {
        await sequelize.authenticate();
        console.log("✓ Connected to MySQL Database");

        const tables = await queryInterface.showAllTables();
        const tableNames = tables.map(t => (typeof t === "string" ? t : t.tableName || Object.values(t)[0]).toUpperCase());

        // 1. NOTIFICATIONS
        if (!tableNames.includes("NOTIFICATIONS")) {
            await queryInterface.createTable("NOTIFICATIONS", {
                ...pk(),
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "USERS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                notification_type: {
                    type: DataTypes.STRING(50),
                    allowNull: false
                },
                title: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
                message: {
                    type: DataTypes.TEXT,
                    allowNull: false
                },
                channel: {
                    type: DataTypes.ENUM("IN_APP", "EMAIL", "PUSH", "SMS"),
                    allowNull: false,
                    defaultValue: "IN_APP"
                },
                reference_type: {
                    type: DataTypes.STRING(50),
                    allowNull: true
                },
                reference_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: true
                },
                status: {
                    type: DataTypes.ENUM("PENDING", "QUEUED", "SENT", "FAILED", "READ"),
                    allowNull: false,
                    defaultValue: "PENDING"
                },
                is_read: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                sent_at: {
                    type: DataTypes.DATE,
                    allowNull: true
                },
                ...ts()
            });
            await queryInterface.addIndex("NOTIFICATIONS", ["user_id", "is_read", "created_at"], {
                name: "idx_notifications_user_read_created"
            });
            await queryInterface.addIndex("NOTIFICATIONS", ["user_id", "created_at"], {
                name: "idx_notifications_user_created"
            });
            await queryInterface.addIndex("NOTIFICATIONS", ["status"], {
                name: "idx_notifications_status"
            });
            console.log("✓ Created 'NOTIFICATIONS' table");
        } else {
            console.log("• 'NOTIFICATIONS' already exists");
        }

        // 2. NOTIFICATION_PREFERENCES
        if (!tableNames.includes("NOTIFICATION_PREFERENCES")) {
            await queryInterface.createTable("NOTIFICATION_PREFERENCES", {
                ...pk(),
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    unique: true,
                    references: { model: "USERS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                email_enabled: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                push_enabled: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                sms_enabled: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                appointment_reminders: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                booking_updates: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                payment_updates: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                report_updates: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                ...ts()
            });
            console.log("✓ Created 'NOTIFICATION_PREFERENCES' table");
        } else {
            console.log("• 'NOTIFICATION_PREFERENCES' already exists");
        }

        // 3. PUSH_SUBSCRIPTIONS
        if (!tableNames.includes("PUSH_SUBSCRIPTIONS")) {
            await queryInterface.createTable("PUSH_SUBSCRIPTIONS", {
                ...pk(),
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "USERS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                endpoint: {
                    type: DataTypes.TEXT,
                    allowNull: false
                },
                endpoint_hash: {
                    type: DataTypes.CHAR(64),
                    allowNull: false
                },
                p256dh: {
                    type: DataTypes.VARCHAR ? DataTypes.VARCHAR(255) : DataTypes.STRING(255),
                    allowNull: false
                },
                auth: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
                device_name: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                is_active: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                ...ts()
            });
            await queryInterface.addIndex("PUSH_SUBSCRIPTIONS", ["user_id", "endpoint_hash"], {
                unique: true,
                name: "idx_push_sub_user_endpoint"
            });
            await queryInterface.addIndex("PUSH_SUBSCRIPTIONS", ["user_id", "is_active"], {
                name: "idx_push_sub_user_active"
            });
            console.log("✓ Created 'PUSH_SUBSCRIPTIONS' table");
        } else {
            console.log("• 'PUSH_SUBSCRIPTIONS' already exists");
        }

        // 4. NOTIFICATION_OUTBOX
        if (!tableNames.includes("NOTIFICATION_OUTBOX")) {
            await queryInterface.createTable("NOTIFICATION_OUTBOX", {
                ...pk(),
                event_type: {
                    type: DataTypes.STRING(50),
                    allowNull: false
                },
                event_payload: {
                    type: DataTypes.JSON,
                    allowNull: false
                },
                status: {
                    type: DataTypes.ENUM("PENDING", "PROCESSING", "COMPLETED", "FAILED"),
                    allowNull: false,
                    defaultValue: "PENDING"
                },
                attempts: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0
                },
                available_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                },
                processed_at: {
                    type: DataTypes.DATE,
                    allowNull: true
                },
                last_error: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                ...ts()
            });
            await queryInterface.addIndex("NOTIFICATION_OUTBOX", ["status", "available_at"], {
                name: "idx_outbox_status_available"
            });
            await queryInterface.addIndex("NOTIFICATION_OUTBOX", ["event_type"], {
                name: "idx_outbox_event_type"
            });
            console.log("✓ Created 'NOTIFICATION_OUTBOX' table");
        } else {
            console.log("• 'NOTIFICATION_OUTBOX' already exists");
        }

        console.log("\n=== Phase 7 database migration completed successfully ===");
        process.exit(0);
    } catch (err) {
        console.error("✗ Phase 7 migration failed:", err.message);
        process.exit(1);
    }
}

migratePhase7();

