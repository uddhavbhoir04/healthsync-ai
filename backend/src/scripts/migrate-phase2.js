require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

async function migratePhase2() {
    console.log("=== HealthSync AI - Phase 2 Database Migration ===");
    const queryInterface = sequelize.getQueryInterface();

    try {
        await sequelize.authenticate();
        console.log("✓ Connected to MySQL Database");

        // 1. Inspect USERS table columns
        const userTableDescription = await queryInterface.describeTable("USERS");

        if (!userTableDescription.phone) {
            console.log("Adding 'phone' column to USERS...");
            await queryInterface.addColumn("USERS", "phone", {
                type: DataTypes.STRING(20),
                allowNull: true
            });
            console.log("✓ Added 'phone' column to USERS");
        } else {
            console.log("• 'phone' column already exists in USERS");
        }

        if (!userTableDescription.date_of_birth) {
            console.log("Adding 'date_of_birth' column to USERS...");
            await queryInterface.addColumn("USERS", "date_of_birth", {
                type: DataTypes.DATEONLY,
                allowNull: true
            });
            console.log("✓ Added 'date_of_birth' column to USERS");
        } else {
            console.log("• 'date_of_birth' column already exists in USERS");
        }

        if (!userTableDescription.gender) {
            console.log("Adding 'gender' column to USERS...");
            await queryInterface.addColumn("USERS", "gender", {
                type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"),
                allowNull: true
            });
            console.log("✓ Added 'gender' column to USERS");
        } else {
            console.log("• 'gender' column already exists in USERS");
        }

        if (!userTableDescription.profile_image_url) {
            console.log("Adding 'profile_image_url' column to USERS...");
            await queryInterface.addColumn("USERS", "profile_image_url", {
                type: DataTypes.STRING(500),
                allowNull: true
            });
            console.log("✓ Added 'profile_image_url' column to USERS");
        } else {
            console.log("• 'profile_image_url' column already exists in USERS");
        }

        // 2. Check & Create USER_ADDRESSES table
        const tables = await queryInterface.showAllTables();
        const addressTableExists = tables.includes("USER_ADDRESSES") || tables.includes("user_addresses");

        if (!addressTableExists) {
            console.log("Creating 'USER_ADDRESSES' table...");
            await queryInterface.createTable("USER_ADDRESSES", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: {
                        model: "USERS",
                        key: "id"
                    },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                address_type: {
                    type: DataTypes.ENUM("HOME", "WORK", "OTHER"),
                    defaultValue: "HOME",
                    allowNull: false
                },
                full_name: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                phone: {
                    type: DataTypes.STRING(20),
                    allowNull: false
                },
                address_line1: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
                address_line2: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                city: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                state: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                pincode: {
                    type: DataTypes.STRING(20),
                    allowNull: false
                },
                landmark: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                is_default: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false,
                    allowNull: false
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

            await queryInterface.addIndex("USER_ADDRESSES", ["user_id"], {
                name: "idx_user_addresses_user_id"
            });
            await queryInterface.addIndex("USER_ADDRESSES", ["user_id", "is_default"], {
                name: "idx_user_addresses_user_default"
            });
            console.log("✓ Created 'USER_ADDRESSES' table with indexes and constraints");
        } else {
            console.log("• 'USER_ADDRESSES' table already exists");
        }

        console.log("✓ Phase 2 Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migratePhase2();

