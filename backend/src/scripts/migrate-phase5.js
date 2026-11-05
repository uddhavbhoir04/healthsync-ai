require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

async function migratePhase5() {
    console.log("=== HealthSync AI - Phase 5 Database Migration ===");
    const queryInterface = sequelize.getQueryInterface();

    try {
        await sequelize.authenticate();
        console.log("✓ Connected to MySQL Database");

        const tables = await queryInterface.showAllTables();
        const tableNames = tables.map(t => (typeof t === "string" ? t : t.tableName || Object.values(t)[0]).toUpperCase());

        // 1. PAYMENT_TRANSACTIONS Table
        if (!tableNames.includes("PAYMENT_TRANSACTIONS")) {
            console.log("Creating 'PAYMENT_TRANSACTIONS' table...");
            await queryInterface.createTable("PAYMENT_TRANSACTIONS", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                booking_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "BOOKINGS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "USERS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                gateway: {
                    type: DataTypes.ENUM("RAZORPAY"),
                    allowNull: false,
                    defaultValue: "RAZORPAY"
                },
                gateway_order_id: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                gateway_payment_id: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                    unique: true
                },
                gateway_signature: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                idempotency_key: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                currency: {
                    type: DataTypes.STRING(10),
                    allowNull: false,
                    defaultValue: "INR"
                },
                payment_status: {
                    type: DataTypes.ENUM(
                        "CREATED",
                        "PENDING",
                        "SUCCESS",
                        "FAILED",
                        "REFUND_PENDING",
                        "REFUNDED",
                        "PARTIALLY_REFUNDED"
                    ),
                    allowNull: false,
                    defaultValue: "CREATED"
                },
                payment_method: {
                    type: DataTypes.STRING(50),
                    allowNull: true
                },
                error_code: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                error_description: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                paid_at: {
                    type: DataTypes.DATE,
                    allowNull: true
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false
                }
            });

            await queryInterface.addIndex("PAYMENT_TRANSACTIONS", ["booking_id"]);
            await queryInterface.addIndex("PAYMENT_TRANSACTIONS", ["user_id"]);
            await queryInterface.addIndex("PAYMENT_TRANSACTIONS", ["gateway_order_id"]);
            await queryInterface.addIndex("PAYMENT_TRANSACTIONS", ["gateway_payment_id"]);
            await queryInterface.addIndex("PAYMENT_TRANSACTIONS", ["payment_status"]);
            await queryInterface.addIndex("PAYMENT_TRANSACTIONS", ["idempotency_key"]);
            console.log("✓ Created 'PAYMENT_TRANSACTIONS' table with indexes");
        } else {
            console.log("• 'PAYMENT_TRANSACTIONS' table already exists");
        }

        // 2. REFUND_TRANSACTIONS Table
        if (!tableNames.includes("REFUND_TRANSACTIONS")) {
            console.log("Creating 'REFUND_TRANSACTIONS' table...");
            await queryInterface.createTable("REFUND_TRANSACTIONS", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                payment_transaction_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "PAYMENT_TRANSACTIONS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                booking_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "BOOKINGS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "USERS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                gateway_refund_id: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                    unique: true
                },
                amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                currency: {
                    type: DataTypes.STRING(10),
                    allowNull: false,
                    defaultValue: "INR"
                },
                refund_status: {
                    type: DataTypes.ENUM("PENDING", "PROCESSED", "FAILED"),
                    allowNull: false,
                    defaultValue: "PENDING"
                },
                reason: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                error_description: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                processed_at: {
                    type: DataTypes.DATE,
                    allowNull: true
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false
                }
            });

            await queryInterface.addIndex("REFUND_TRANSACTIONS", ["payment_transaction_id"]);
            await queryInterface.addIndex("REFUND_TRANSACTIONS", ["booking_id"]);
            await queryInterface.addIndex("REFUND_TRANSACTIONS", ["user_id"]);
            await queryInterface.addIndex("REFUND_TRANSACTIONS", ["gateway_refund_id"]);
            await queryInterface.addIndex("REFUND_TRANSACTIONS", ["refund_status"]);
            console.log("✓ Created 'REFUND_TRANSACTIONS' table with indexes");
        } else {
            console.log("• 'REFUND_TRANSACTIONS' table already exists");
        }

        // 3. WEBHOOK_EVENTS Table
        if (!tableNames.includes("WEBHOOK_EVENTS")) {
            console.log("Creating 'WEBHOOK_EVENTS' table...");
            await queryInterface.createTable("WEBHOOK_EVENTS", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                event_id: {
                    type: DataTypes.STRING(100),
                    allowNull: false,
                    unique: true
                },
                event_type: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                payload: {
                    type: DataTypes.JSON,
                    allowNull: true
                },
                status: {
                    type: DataTypes.ENUM("PENDING", "PROCESSED", "FAILED", "IGNORED"),
                    allowNull: false,
                    defaultValue: "PENDING"
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false
                }
            });

            await queryInterface.addIndex("WEBHOOK_EVENTS", ["event_id"]);
            await queryInterface.addIndex("WEBHOOK_EVENTS", ["event_type"]);
            await queryInterface.addIndex("WEBHOOK_EVENTS", ["status"]);
            console.log("✓ Created 'WEBHOOK_EVENTS' table with indexes");
        } else {
            console.log("• 'WEBHOOK_EVENTS' table already exists");
        }

        // 4. Update BOOKINGS payment_status enum to include PARTIALLY_REFUNDED if needed
        try {
            await sequelize.query(
                "ALTER TABLE `BOOKINGS` MODIFY COLUMN `payment_status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING';"
            );
            console.log("✓ Updated 'BOOKINGS.payment_status' enum to include 'PARTIALLY_REFUNDED'");
        } catch (err) {
            console.log("• Notice on BOOKINGS payment_status alteration:", err.message);
        }

        console.log("=== Phase 5 Migration Complete ===");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migratePhase5();

