require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

async function migratePhase3() {
    console.log("=== HealthSync AI - Phase 3 Database Migration & Seeding ===");
    const queryInterface = sequelize.getQueryInterface();

    try {
        await sequelize.authenticate();
        console.log("✓ Connected to MySQL Database");

        const tables = await queryInterface.showAllTables();

        // 1. DOCTORS Table
        if (!tables.includes("DOCTORS") && !tables.includes("doctors")) {
            console.log("Creating 'DOCTORS' table...");
            await queryInterface.createTable("DOCTORS", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: true,
                    references: { model: "USERS", key: "id" },
                    onDelete: "SET NULL",
                    onUpdate: "CASCADE"
                },
                doctor_name: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                specialization: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                qualification: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                experience_years: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                consultation_fee: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                about: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                profile_image: {
                    type: DataTypes.STRING(500),
                    allowNull: true
                },
                city: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                pincode: {
                    type: DataTypes.STRING(20),
                    allowNull: false
                },
                status: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
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

            await queryInterface.addIndex("DOCTORS", ["doctor_name"]);
            await queryInterface.addIndex("DOCTORS", ["specialization"]);
            await queryInterface.addIndex("DOCTORS", ["city"]);
            await queryInterface.addIndex("DOCTORS", ["status"]);
            console.log("✓ Created 'DOCTORS' table with indexes");
        } else {
            console.log("• 'DOCTORS' table already exists");
        }

        // 2. DOCTOR_AVAILABILITY Table
        if (!tables.includes("DOCTOR_AVAILABILITY") && !tables.includes("doctor_availability")) {
            console.log("Creating 'DOCTOR_AVAILABILITY' table...");
            await queryInterface.createTable("DOCTOR_AVAILABILITY", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                doctor_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "DOCTORS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                day_of_week: {
                    type: DataTypes.ENUM(
                        "MONDAY",
                        "TUESDAY",
                        "WEDNESDAY",
                        "THURSDAY",
                        "FRIDAY",
                        "SATURDAY",
                        "SUNDAY"
                    ),
                    allowNull: false
                },
                start_time: {
                    type: DataTypes.STRING(10),
                    allowNull: false
                },
                end_time: {
                    type: DataTypes.STRING(10),
                    allowNull: false
                },
                slot_duration: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 30
                },
                is_available: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
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

            await queryInterface.addIndex("DOCTOR_AVAILABILITY", ["doctor_id"]);
            await queryInterface.addIndex("DOCTOR_AVAILABILITY", ["doctor_id", "day_of_week"]);
            console.log("✓ Created 'DOCTOR_AVAILABILITY' table with indexes");
        } else {
            console.log("• 'DOCTOR_AVAILABILITY' table already exists");
        }

        // 3. LAB_TESTS Table
        if (!tables.includes("LAB_TESTS") && !tables.includes("lab_tests")) {
            console.log("Creating 'LAB_TESTS' table...");
            await queryInterface.createTable("LAB_TESTS", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                test_name: {
                    type: DataTypes.STRING(150),
                    allowNull: false
                },
                test_code: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                    unique: true
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                category: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                sample_type: {
                    type: DataTypes.STRING(100),
                    allowNull: false,
                    defaultValue: "Blood"
                },
                fasting_required: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                preparation_instructions: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                price: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                status: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
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

            await queryInterface.addIndex("LAB_TESTS", ["test_name"]);
            await queryInterface.addIndex("LAB_TESTS", ["category"]);
            await queryInterface.addIndex("LAB_TESTS", ["status"]);
            console.log("✓ Created 'LAB_TESTS' table with indexes");
        } else {
            console.log("• 'LAB_TESTS' table already exists");
        }

        // 4. DIAGNOSTIC_PACKAGES Table
        if (!tables.includes("DIAGNOSTIC_PACKAGES") && !tables.includes("diagnostic_packages")) {
            console.log("Creating 'DIAGNOSTIC_PACKAGES' table...");
            await queryInterface.createTable("DIAGNOSTIC_PACKAGES", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                package_name: {
                    type: DataTypes.STRING(150),
                    allowNull: false
                },
                package_code: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                    unique: true
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                image: {
                    type: DataTypes.STRING(500),
                    allowNull: true
                },
                original_price: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                offer_price: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0.00
                },
                status: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
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

            await queryInterface.addIndex("DIAGNOSTIC_PACKAGES", ["package_name"]);
            await queryInterface.addIndex("DIAGNOSTIC_PACKAGES", ["status"]);
            console.log("✓ Created 'DIAGNOSTIC_PACKAGES' table with indexes");
        } else {
            console.log("• 'DIAGNOSTIC_PACKAGES' table already exists");
        }

        // 5. PACKAGE_TESTS Table
        if (!tables.includes("PACKAGE_TESTS") && !tables.includes("package_tests")) {
            console.log("Creating 'PACKAGE_TESTS' table...");
            await queryInterface.createTable("PACKAGE_TESTS", {
                id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                package_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "DIAGNOSTIC_PACKAGES", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                lab_test_id: {
                    type: DataTypes.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: "LAB_TESTS", key: "id" },
                    onDelete: "CASCADE",
                    onUpdate: "CASCADE"
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false
                }
            });

            await queryInterface.addIndex("PACKAGE_TESTS", ["package_id", "lab_test_id"], {
                unique: true,
                name: "idx_package_tests_unique"
            });
            console.log("✓ Created 'PACKAGE_TESTS' table with compound index");
        } else {
            console.log("• 'PACKAGE_TESTS' table already exists");
        }

        // 6. SEED INITIAL HEALTHCARE CATALOG (If empty)
        const [doctorCountResult] = await sequelize.query("SELECT COUNT(*) AS count FROM DOCTORS");
        const doctorCount = Number(doctorCountResult[0]?.count || 0);

        if (doctorCount === 0) {
            console.log("Seeding verified Doctors and Availability...");
            const now = new Date();

            await queryInterface.bulkInsert("DOCTORS", [
                {
                    doctor_name: "Dr. Sarah Jenkins",
                    specialization: "Cardiology",
                    qualification: "MD, FACC (Harvard Medical)",
                    experience_years: 14,
                    consultation_fee: 120.00,
                    about: "Dr. Sarah Jenkins is an internationally recognized cardiologist specializing in preventative cardiovascular care, advanced echocardiography, and hypertension management.",
                    profile_image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600",
                    city: "San Francisco",
                    pincode: "94102",
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    doctor_name: "Dr. Marcus Vance",
                    specialization: "Neurology",
                    qualification: "MD, PhD (Johns Hopkins)",
                    experience_years: 18,
                    consultation_fee: 150.00,
                    about: "Chief of Clinical Neurophysiology with extensive background in migraine therapies, neuropathy investigations, and cognitive health assessments.",
                    profile_image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600",
                    city: "San Francisco",
                    pincode: "94103",
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    doctor_name: "Dr. Elena Rostova",
                    specialization: "Endocrinology",
                    qualification: "MBBS, MD Endocrinology",
                    experience_years: 11,
                    consultation_fee: 95.00,
                    about: "Specialist in metabolic wellness, thyroid hormone optimization, and personalized insulin resistance reversal programs.",
                    profile_image: "https://images.unsplash.com/photo-1594824813589-b06c073845dc?auto=format&fit=crop&q=80&w=600",
                    city: "San Jose",
                    pincode: "95112",
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    doctor_name: "Dr. Robert Chen",
                    specialization: "General Medicine",
                    qualification: "MD, Internal Medicine (Stanford)",
                    experience_years: 9,
                    consultation_fee: 75.00,
                    about: "Primary healthcare practitioner focused on comprehensive biometrics, health span enhancement, and personalized wellness checkups.",
                    profile_image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600",
                    city: "San Francisco",
                    pincode: "94107",
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    doctor_name: "Dr. Priya Patel",
                    specialization: "Dermatology",
                    qualification: "MD, Board Certified Dermatologist",
                    experience_years: 12,
                    consultation_fee: 110.00,
                    about: "Dermatological consultant specializing in chronic autoimmune skin conditions, clinical aesthetics, and laser dermatopathology.",
                    profile_image: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=600",
                    city: "Oakland",
                    pincode: "94601",
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    doctor_name: "Dr. David Kim",
                    specialization: "Pediatrics",
                    qualification: "MD, FAAP (Columbia University)",
                    experience_years: 15,
                    consultation_fee: 85.00,
                    about: "Compassionate pediatrician committed to pediatric developmental milestones, adolescent immunizations, and preventive nutrition.",
                    profile_image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600",
                    city: "San Jose",
                    pincode: "95110",
                    status: true,
                    created_at: now,
                    updated_at: now
                }
            ]);

            // Seed availability for doctors 1, 2, 3
            await queryInterface.bulkInsert("DOCTOR_AVAILABILITY", [
                { doctor_id: 1, day_of_week: "MONDAY", start_time: "09:00", end_time: "13:00", slot_duration: 30, is_available: true, created_at: now, updated_at: now },
                { doctor_id: 1, day_of_week: "WEDNESDAY", start_time: "14:00", end_time: "18:00", slot_duration: 30, is_available: true, created_at: now, updated_at: now },
                { doctor_id: 1, day_of_week: "FRIDAY", start_time: "09:00", end_time: "12:00", slot_duration: 30, is_available: true, created_at: now, updated_at: now },
                { doctor_id: 2, day_of_week: "TUESDAY", start_time: "10:00", end_time: "16:00", slot_duration: 45, is_available: true, created_at: now, updated_at: now },
                { doctor_id: 2, day_of_week: "THURSDAY", start_time: "10:00", end_time: "16:00", slot_duration: 45, is_available: true, created_at: now, updated_at: now },
                { doctor_id: 3, day_of_week: "MONDAY", start_time: "08:30", end_time: "12:30", slot_duration: 30, is_available: true, created_at: now, updated_at: now },
                { doctor_id: 3, day_of_week: "SATURDAY", start_time: "09:00", end_time: "14:00", slot_duration: 30, is_available: true, created_at: now, updated_at: now }
            ]);
            console.log("✓ Seeded Doctors and Weekly Availability schedules");
        }

        // Seed Lab Tests
        const [testCountResult] = await sequelize.query("SELECT COUNT(*) AS count FROM LAB_TESTS");
        const testCount = Number(testCountResult[0]?.count || 0);

        if (testCount === 0) {
            console.log("Seeding Lab Tests...");
            const now = new Date();

            await queryInterface.bulkInsert("LAB_TESTS", [
                {
                    test_name: "Complete Blood Count (CBC) with Differential",
                    test_code: "CBC-101",
                    description: "Measures 14 cellular hematological indices including RBCs, hemoglobin, platelets, and white blood cell differential counts.",
                    category: "Hematology",
                    sample_type: "Blood (EDTA Tube)",
                    fasting_required: false,
                    preparation_instructions: "No special dietary restrictions. Stay well-hydrated before the venipuncture.",
                    price: 24.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    test_name: "Fasting Blood Sugar (FBS)",
                    test_code: "GLU-201",
                    description: "Measures baseline blood glucose levels after an overnight fast to screen for prediabetes and Type 2 diabetes.",
                    category: "Diabetes",
                    sample_type: "Blood (Fluoride Tube)",
                    fasting_required: true,
                    preparation_instructions: "Strict 10-12 hours overnight fast. Only plain water is permitted before sample collection.",
                    price: 15.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    test_name: "HbA1c (Glycated Hemoglobin)",
                    test_code: "HBA-202",
                    description: "Golden standard 3-month average blood sugar control assay with automated HPLC chromatography.",
                    category: "Diabetes",
                    sample_type: "Blood",
                    fasting_required: false,
                    preparation_instructions: "Fasting not strictly required, but recommended if ordered alongside fasting lipid panels.",
                    price: 35.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    test_name: "Lipid Profile (Cholesterol Panel)",
                    test_code: "LIP-301",
                    description: "Full atherosclerotic panel evaluating Total Cholesterol, HDL, LDL, VLDL, and Triglycerides.",
                    category: "Cardiovascular",
                    sample_type: "Blood (Serum)",
                    fasting_required: true,
                    preparation_instructions: "Overnight fasting of 12 hours is mandatory. Avoid alcohol for 24 hours prior.",
                    price: 38.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    test_name: "Thyroid Stimulating Hormone (TSH Ultrasensitive)",
                    test_code: "THY-401",
                    description: "High-sensitivity chemiluminescence assay detecting hypo- and hyperthyroidism pathologies.",
                    category: "Endocrinology",
                    sample_type: "Blood (Serum)",
                    fasting_required: false,
                    preparation_instructions: "Recommended in the early morning for optimal baseline circadian calibration.",
                    price: 28.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    test_name: "Liver Function Test (LFT Panel)",
                    test_code: "HEP-501",
                    description: "Assesses hepatic synthesis and clearance via ALT, AST, Alkaline Phosphatase, Bilirubin, and Total Protein.",
                    category: "Hepatic",
                    sample_type: "Blood (Serum)",
                    fasting_required: true,
                    preparation_instructions: "Fast for 8 hours. Avoid strenuous exercise 12 hours prior.",
                    price: 45.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    test_name: "Renal Function Panel (KFT/BUN/Creatinine)",
                    test_code: "REN-601",
                    description: "Calculates Estimated Glomerular Filtration Rate (eGFR), Blood Urea Nitrogen, and Serum Creatinine.",
                    category: "Renal",
                    sample_type: "Blood (Serum)",
                    fasting_required: false,
                    preparation_instructions: "Stay normally hydrated. Avoid heavy red meat consumption 24 hours before test.",
                    price: 32.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    test_name: "Vitamin D3 (25-Hydroxycalciferol)",
                    test_code: "VIT-701",
                    description: "Critical quantification of 25(OH)D status for bone density, immune modulation, and mood regulation.",
                    category: "Vitamins",
                    sample_type: "Blood (Serum)",
                    fasting_required: false,
                    preparation_instructions: "No fasting needed. If taking high-dose supplements, notify the clinical phlebotomist.",
                    price: 52.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                }
            ]);
            console.log("✓ Seeded 8 Standard Clinical Lab Tests");
        }

        // Seed Diagnostic Packages & Package-Test Mappings
        const [pkgCountResult] = await sequelize.query("SELECT COUNT(*) AS count FROM DIAGNOSTIC_PACKAGES");
        const pkgCount = Number(pkgCountResult[0]?.count || 0);

        if (pkgCount === 0) {
            console.log("Seeding Diagnostic Packages...");
            const now = new Date();

            await queryInterface.bulkInsert("DIAGNOSTIC_PACKAGES", [
                {
                    package_name: "Comprehensive Full Body Vitality Screen",
                    package_code: "PKG-FULLBODY",
                    description: "Our flagship preventive healthcare battery covering cardiovascular lipids, hematology, renal health, diabetes biomarkers, and liver enzymes.",
                    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800",
                    original_price: 217.00,
                    offer_price: 139.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    package_name: "Executive Cardiac Wellness Assessment",
                    package_code: "PKG-CARDIAC",
                    description: "Tailored for proactive cardiovascular surveillance with high-sensitivity lipids, glycemic averages, and cellular inflammation indicators.",
                    image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=800",
                    original_price: 120.00,
                    offer_price: 79.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    package_name: "Essential Diabetes Management Check",
                    package_code: "PKG-DIABETES",
                    description: "Designed for Type 1, Type 2, and gestational monitoring: Fasting Glucose, HbA1c, and Renal creatinine microfiltration.",
                    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800",
                    original_price: 82.00,
                    offer_price: 49.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                },
                {
                    package_name: "Women's Advanced Hormonal & Metabolic Panel",
                    package_code: "PKG-WOMEN-ADV",
                    description: "Targeted evaluation of thyroid functioning, bone-active Vitamin D3, hematology, and metabolic homeostasis.",
                    image: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800",
                    original_price: 156.00,
                    offer_price: 99.00,
                    status: true,
                    created_at: now,
                    updated_at: now
                }
            ]);

            // Map tests into packages:
            // PKG 1: Tests 1, 2, 3, 4, 5, 6, 7
            // PKG 2: Tests 1, 3, 4
            // PKG 3: Tests 2, 3, 7
            // PKG 4: Tests 1, 5, 8
            await queryInterface.bulkInsert("PACKAGE_TESTS", [
                { package_id: 1, lab_test_id: 1, created_at: now },
                { package_id: 1, lab_test_id: 2, created_at: now },
                { package_id: 1, lab_test_id: 3, created_at: now },
                { package_id: 1, lab_test_id: 4, created_at: now },
                { package_id: 1, lab_test_id: 5, created_at: now },
                { package_id: 1, lab_test_id: 6, created_at: now },
                { package_id: 1, lab_test_id: 7, created_at: now },
                { package_id: 2, lab_test_id: 1, created_at: now },
                { package_id: 2, lab_test_id: 3, created_at: now },
                { package_id: 2, lab_test_id: 4, created_at: now },
                { package_id: 3, lab_test_id: 2, created_at: now },
                { package_id: 3, lab_test_id: 3, created_at: now },
                { package_id: 3, lab_test_id: 7, created_at: now },
                { package_id: 4, lab_test_id: 1, created_at: now },
                { package_id: 4, lab_test_id: 5, created_at: now },
                { package_id: 4, lab_test_id: 8, created_at: now }
            ]);
            console.log("✓ Mapped Diagnostic Packages with Lab Tests");
        }

        console.log("✓ Phase 3 Migration & Seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Phase 3 migration failed:", error);
        process.exit(1);
    }
}

migratePhase3();

