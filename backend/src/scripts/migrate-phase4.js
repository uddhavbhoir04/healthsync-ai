require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

async function migratePhase4() {
    console.log("=== HealthSync AI - Phase 4 Database Migration ===");
    const queryInterface = sequelize.getQueryInterface();

    try {
        await sequelize.authenticate();
        console.log("✓ Connected to MySQL Database");

        const tables = await queryInterface.showAllTables();
        const tableNames = tables.map(t => (typeof t === "string" ? t : t.tableName || Object.values(t)[0]).toUpperCase());

        // 1. BOOKINGS Table
        if (!tableNames.includes("BOOKINGS")) {
            console.log("Creating 'BOOKINGS' table...");
            await queryInterface.createTable("BOOKINGS", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                booking_number: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                    unique: true
                },
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "USERS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                booking_type: {
                    type: DataTypes.ENUM("DOCTOR", "LAB_TEST", "PACKAGE"),
                    allowNull: false
                },
                booking_status: {
                    type: DataTypes.ENUM("PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "RESCHEDULED", "NO_SHOW"),
                    allowNull: false,
                    defaultValue: "CONFIRMED"
                },
                payment_status: {
                    type: DataTypes.ENUM("PENDING", "PAID", "FAILED", "REFUNDED"),
                    allowNull: false,
                    defaultValue: "PENDING"
                },
                subtotal: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                discount_amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                total_amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                address_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: true,
                    references: { model: "USER_ADDRESSES", key: "id" },
                    onDelete: "SET NULL",
                    onUpdate: "CASCADE"
                },
                booking_date: {
                    type: DataTypes.DATEONLY,
                    allowNull: false
                },
                notes: {
                    type: DataTypes.TEXT,
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

            await queryInterface.addIndex("BOOKINGS", ["booking_number"]);
            await queryInterface.addIndex("BOOKINGS", ["user_id"]);
            await queryInterface.addIndex("BOOKINGS", ["booking_type"]);
            await queryInterface.addIndex("BOOKINGS", ["booking_status"]);
            await queryInterface.addIndex("BOOKINGS", ["payment_status"]);
            await queryInterface.addIndex("BOOKINGS", ["booking_date"]);
            console.log("✓ Created 'BOOKINGS' table with indexes");
        } else {
            console.log("• 'BOOKINGS' table already exists");
        }

        // 2. BOOKING_ITEMS Table
        if (!tableNames.includes("BOOKING_ITEMS")) {
            console.log("Creating 'BOOKING_ITEMS' table...");
            await queryInterface.createTable("BOOKING_ITEMS", {
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
                item_type: {
                    type: DataTypes.ENUM("DOCTOR_CONSULTATION", "LAB_TEST", "DIAGNOSTIC_PACKAGE"),
                    allowNull: false
                },
                item_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false
                },
                item_name: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
                unit_price: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                quantity: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 1
                },
                total_price: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
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

            await queryInterface.addIndex("BOOKING_ITEMS", ["booking_id"]);
            await queryInterface.addIndex("BOOKING_ITEMS", ["item_type", "item_id"]);
            console.log("✓ Created 'BOOKING_ITEMS' table with indexes");
        } else {
            console.log("• 'BOOKING_ITEMS' table already exists");
        }

        // 3. DOCTOR_APPOINTMENTS Table
        if (!tableNames.includes("DOCTOR_APPOINTMENTS")) {
            console.log("Creating 'DOCTOR_APPOINTMENTS' table...");
            await queryInterface.createTable("DOCTOR_APPOINTMENTS", {
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
                doctor_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "DOCTORS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                patient_name: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                patient_phone: {
                    type: DataTypes.STRING(20),
                    allowNull: false
                },
                patient_gender: {
                    type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"),
                    allowNull: true
                },
                patient_age: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: true
                },
                appointment_date: {
                    type: DataTypes.DATEONLY,
                    allowNull: false
                },
                start_time: {
                    type: DataTypes.TIME,
                    allowNull: false
                },
                end_time: {
                    type: DataTypes.TIME,
                    allowNull: false
                },
                consultation_type: {
                    type: DataTypes.ENUM("ONLINE", "IN_PERSON"),
                    allowNull: false,
                    defaultValue: "IN_PERSON"
                },
                appointment_status: {
                    type: DataTypes.ENUM("SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED", "NO_SHOW"),
                    allowNull: false,
                    defaultValue: "SCHEDULED"
                },
                cancellation_reason: {
                    type: DataTypes.TEXT,
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

            await queryInterface.addIndex("DOCTOR_APPOINTMENTS", ["booking_id"]);
            await queryInterface.addIndex("DOCTOR_APPOINTMENTS", ["doctor_id", "appointment_date", "start_time"]);
            await queryInterface.addIndex("DOCTOR_APPOINTMENTS", ["appointment_status"]);
            await queryInterface.addIndex("DOCTOR_APPOINTMENTS", ["appointment_date"]);
            console.log("✓ Created 'DOCTOR_APPOINTMENTS' table with indexes");
        } else {
            console.log("• 'DOCTOR_APPOINTMENTS' table already exists");
        }

        // 4. LAB_COLLECTION_DETAILS Table
        if (!tableNames.includes("LAB_COLLECTION_DETAILS")) {
            console.log("Creating 'LAB_COLLECTION_DETAILS' table...");
            await queryInterface.createTable("LAB_COLLECTION_DETAILS", {
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
                collection_type: {
                    type: DataTypes.ENUM("HOME", "LAB_VISIT"),
                    allowNull: false,
                    defaultValue: "HOME"
                },
                address_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: true,
                    references: { model: "USER_ADDRESSES", key: "id" },
                    onDelete: "SET NULL",
                    onUpdate: "CASCADE"
                },
                preferred_date: {
                    type: DataTypes.DATEONLY,
                    allowNull: false
                },
                preferred_time_slot: {
                    type: DataTypes.STRING(50),
                    allowNull: false
                },
                sample_status: {
                    type: DataTypes.ENUM("PENDING", "COLLECTED", "IN_TRANSIT", "RECEIVED", "PROCESSING", "COMPLETED", "CANCELLED"),
                    allowNull: false,
                    defaultValue: "PENDING"
                },
                notes: {
                    type: DataTypes.TEXT,
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

            await queryInterface.addIndex("LAB_COLLECTION_DETAILS", ["booking_id"]);
            await queryInterface.addIndex("LAB_COLLECTION_DETAILS", ["address_id"]);
            await queryInterface.addIndex("LAB_COLLECTION_DETAILS", ["sample_status"]);
            await queryInterface.addIndex("LAB_COLLECTION_DETAILS", ["preferred_date"]);
            console.log("✓ Created 'LAB_COLLECTION_DETAILS' table with indexes");
        } else {
            console.log("• 'LAB_COLLECTION_DETAILS' table already exists");
        }

        console.log("=== Phase 4 Migration Complete ===");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migratePhase4();

