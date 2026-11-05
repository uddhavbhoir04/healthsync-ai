require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const crypto = require("crypto");
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ts = () => ({
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false }
});
const createdOnly = () => ({
    created_at: { type: DataTypes.DATE, allowNull: false }
});
const pk = () => ({
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false }
});

/**
 * Sample educational knowledge written for this project (synthetic, non-clinical).
 * Seeded as PENDING; an admin must index them from the AI Knowledge page.
 */
const SEED_DOCUMENTS = [
    {
        title: "Complete Blood Count (CBC) — what it measures",
        source_type: "LAB_TEST",
        source_reference: "HealthSync AI sample knowledge base — Lab Test Guide: CBC",
        content: `A Complete Blood Count (CBC) is a common blood test that measures several components of blood.

It typically reports red blood cell count (RBC), hemoglobin, hematocrit, white blood cell count (WBC) with a differential of white cell types, and platelet count. Red cell indices such as MCV, MCH and MCHC describe the size and hemoglobin content of red blood cells.

Hemoglobin is the protein in red blood cells that carries oxygen. White blood cells are part of the immune system. Platelets help blood clot.

Reference ranges differ between laboratories and depend on factors such as age and sex. Always read your values against the reference range printed on your own report, and discuss results with a qualified doctor. A single value outside a range does not by itself establish a diagnosis.

A CBC usually does not require fasting unless it is ordered together with other tests that do.`
    },
    {
        title: "HbA1c (Glycated Hemoglobin) — overview",
        source_type: "LAB_TEST",
        source_reference: "HealthSync AI sample knowledge base — Lab Test Guide: HbA1c",
        content: `HbA1c, also called glycated hemoglobin or A1c, reflects the average blood glucose level over roughly the previous two to three months.

Glucose in the blood attaches to hemoglobin in red blood cells. Because red blood cells live for about three months, the percentage of glycated hemoglobin gives a longer-term picture than a single glucose reading.

HbA1c is usually reported as a percentage, and some laboratories also report it in mmol/mol. HbA1c generally does not require fasting.

Interpretation thresholds and treatment decisions must come from a qualified doctor, who will consider the full clinical picture. Certain conditions that affect red blood cells can make HbA1c less reliable, which is another reason results should be reviewed by a clinician.`
    },
    {
        title: "Preparing for a blood test — general guidance",
        source_type: "PREPARATION",
        source_reference: "HealthSync AI sample knowledge base — Sample Collection Preparation Guide",
        content: `Some blood tests require fasting, commonly 8 to 12 hours, for example fasting blood glucose and lipid profiles. Your booking details show whether a selected test requires fasting.

During fasting, plain water is usually allowed and staying hydrated can make blood collection easier. Avoid food, sweetened drinks, tea, coffee, chewing gum and smoking unless your doctor or the laboratory instructs otherwise.

Do not stop or change any prescribed medicine to prepare for a test unless your doctor tells you to. Tell the phlebotomist or laboratory about medicines you take.

For home sample collection, keep your booking confirmation and an identity document ready, and wear clothing that allows easy access to the upper arm.`
    },
    {
        title: "Common lab report terminology",
        source_type: "TERMINOLOGY",
        source_reference: "HealthSync AI sample knowledge base — Report Terminology Glossary",
        content: `Reference range (or reference interval): the range of values the laboratory uses for comparison. It is set by each laboratory and can differ between labs, methods, age groups and sexes.

Flag: a marker such as H (high) or L (low) printed by the laboratory when a value falls outside its reference range. A flag is not a diagnosis.

Units: the measurement scale for a value, such as g/dL, mg/dL, mmol/L or cells/µL. The same test can be reported in different units by different labs, so values should only be compared when the units match.

Specimen or sample type: the material tested, such as whole blood, serum, plasma or urine.

Fasting sample: a sample collected after a period without food, as required by some tests.`
    }
];

async function migratePhase6() {
    console.log("=== HealthSync AI - Phase 6 Database Migration (AI Assistant) ===");
    const queryInterface = sequelize.getQueryInterface();

    try {
        await sequelize.authenticate();
        console.log("✓ Connected to MySQL Database");

        const tables = await queryInterface.showAllTables();
        const tableNames = tables.map(t => (typeof t === "string" ? t : t.tableName || Object.values(t)[0]).toUpperCase());

        // 1. AI_CONVERSATIONS
        if (!tableNames.includes("AI_CONVERSATIONS")) {
            await queryInterface.createTable("AI_CONVERSATIONS", {
                ...pk(),
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED, allowNull: false,
                    references: { model: "USERS", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE"
                },
                title: { type: DataTypes.STRING(150), allowNull: false, defaultValue: "New conversation" },
                last_message_at: { type: DataTypes.DATE, allowNull: true },
                ...ts()
            });
            await queryInterface.addIndex("AI_CONVERSATIONS", ["user_id", "updated_at"]);
            console.log("✓ Created 'AI_CONVERSATIONS'");
        } else {
            console.log("• 'AI_CONVERSATIONS' already exists");
        }

        // 2. AI_MESSAGES
        if (!tableNames.includes("AI_MESSAGES")) {
            await queryInterface.createTable("AI_MESSAGES", {
                ...pk(),
                conversation_id: {
                    type: DataTypes.BIGINT.UNSIGNED, allowNull: false,
                    references: { model: "AI_CONVERSATIONS", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE"
                },
                role: { type: DataTypes.ENUM("USER", "ASSISTANT"), allowNull: false },
                content: { type: DataTypes.TEXT, allowNull: false },
                sources_json: { type: DataTypes.JSON, allowNull: true },
                ...createdOnly()
            });
            await queryInterface.addIndex("AI_MESSAGES", ["conversation_id", "id"]);
            console.log("✓ Created 'AI_MESSAGES'");
        } else {
            console.log("• 'AI_MESSAGES' already exists");
        }

        // 3. AI_REPORTS
        if (!tableNames.includes("AI_REPORTS")) {
            await queryInterface.createTable("AI_REPORTS", {
                ...pk(),
                public_id: { type: DataTypes.UUID, allowNull: false, unique: true },
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED, allowNull: false,
                    references: { model: "USERS", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE"
                },
                file_name: { type: DataTypes.STRING(255), allowNull: false },
                file_type: { type: DataTypes.STRING(50), allowNull: false },
                file_size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
                file_hash: { type: DataTypes.CHAR(64), allowNull: false },
                storage_path: { type: DataTypes.STRING(500), allowNull: true },
                summary_json: { type: DataTypes.JSON, allowNull: true },
                processing_status: {
                    type: DataTypes.ENUM("PROCESSING", "COMPLETED", "FAILED"),
                    allowNull: false, defaultValue: "PROCESSING"
                },
                error_message: { type: DataTypes.STRING(255), allowNull: true },
                ...ts()
            });
            await queryInterface.addIndex("AI_REPORTS", ["user_id", "file_hash"], {
                unique: true, name: "idx_ai_reports_user_file_hash"
            });
            await queryInterface.addIndex("AI_REPORTS", ["user_id", "created_at"]);
            console.log("✓ Created 'AI_REPORTS'");
        } else {
            console.log("• 'AI_REPORTS' already exists");
        }

        // 4. AI_KNOWLEDGE_DOCUMENTS
        if (!tableNames.includes("AI_KNOWLEDGE_DOCUMENTS")) {
            await queryInterface.createTable("AI_KNOWLEDGE_DOCUMENTS", {
                ...pk(),
                title: { type: DataTypes.STRING(200), allowNull: false },
                source_type: {
                    type: DataTypes.ENUM("FAQ", "LAB_TEST", "TERMINOLOGY", "PREPARATION", "EDUCATIONAL", "DOCUMENTATION"),
                    allowNull: false
                },
                source_reference: { type: DataTypes.STRING(500), allowNull: false },
                content: { type: DataTypes.TEXT("long"), allowNull: false },
                content_hash: { type: DataTypes.CHAR(64), allowNull: false },
                indexing_status: {
                    type: DataTypes.ENUM("PENDING", "INDEXING", "INDEXED", "FAILED"),
                    allowNull: false, defaultValue: "PENDING"
                },
                indexing_error: { type: DataTypes.STRING(255), allowNull: true },
                indexed_hash: { type: DataTypes.CHAR(64), allowNull: true },
                retrieval_mode: { type: DataTypes.ENUM("vector", "keyword"), allowNull: true },
                chunk_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                last_indexed_at: { type: DataTypes.DATE, allowNull: true },
                created_by: {
                    type: DataTypes.BIGINT.UNSIGNED, allowNull: true,
                    references: { model: "USERS", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE"
                },
                ...ts()
            });
            await queryInterface.addIndex("AI_KNOWLEDGE_DOCUMENTS", ["indexing_status"]);
            await queryInterface.addIndex("AI_KNOWLEDGE_DOCUMENTS", ["source_type"]);
            console.log("✓ Created 'AI_KNOWLEDGE_DOCUMENTS'");
        } else {
            console.log("• 'AI_KNOWLEDGE_DOCUMENTS' already exists");
        }

        // 5. AI_KNOWLEDGE_CHUNKS
        if (!tableNames.includes("AI_KNOWLEDGE_CHUNKS")) {
            await queryInterface.createTable("AI_KNOWLEDGE_CHUNKS", {
                ...pk(),
                document_id: {
                    type: DataTypes.BIGINT.UNSIGNED, allowNull: false,
                    references: { model: "AI_KNOWLEDGE_DOCUMENTS", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE"
                },
                chunk_index: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
                content: { type: DataTypes.TEXT, allowNull: false },
                vector_id: { type: DataTypes.UUID, allowNull: false },
                ...createdOnly()
            });
            await queryInterface.addIndex("AI_KNOWLEDGE_CHUNKS", ["document_id", "chunk_index"], {
                unique: true, name: "idx_ai_chunks_doc_index"
            });
            await queryInterface.addIndex("AI_KNOWLEDGE_CHUNKS", ["content"], {
                type: "FULLTEXT", name: "ftx_ai_chunks_content"
            });
            console.log("✓ Created 'AI_KNOWLEDGE_CHUNKS' with FULLTEXT index");
        } else {
            console.log("• 'AI_KNOWLEDGE_CHUNKS' already exists");
        }

        // 6. AI_USAGE_LOGS
        if (!tableNames.includes("AI_USAGE_LOGS")) {
            await queryInterface.createTable("AI_USAGE_LOGS", {
                ...pk(),
                user_id: {
                    type: DataTypes.BIGINT.UNSIGNED, allowNull: true,
                    references: { model: "USERS", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE"
                },
                feature: {
                    type: DataTypes.ENUM("CHAT", "REPORT_SUMMARY", "REPORT_QUESTION", "EMBEDDING"),
                    allowNull: false
                },
                model: { type: DataTypes.STRING(100), allowNull: true },
                input_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                output_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                status: { type: DataTypes.ENUM("SUCCESS", "ERROR", "LIMITED"), allowNull: false },
                error_code: { type: DataTypes.STRING(50), allowNull: true },
                ...createdOnly()
            });
            await queryInterface.addIndex("AI_USAGE_LOGS", ["user_id", "created_at"]);
            await queryInterface.addIndex("AI_USAGE_LOGS", ["created_at"]);
            console.log("✓ Created 'AI_USAGE_LOGS'");
        } else {
            console.log("• 'AI_USAGE_LOGS' already exists");
        }

        // 7. Seed sample knowledge documents (only when the knowledge base is empty)
        const [countRows] = await sequelize.query("SELECT COUNT(*) AS count FROM AI_KNOWLEDGE_DOCUMENTS");
        if (Number(countRows[0]?.count || 0) === 0) {
            const now = new Date();
            await queryInterface.bulkInsert(
                "AI_KNOWLEDGE_DOCUMENTS",
                SEED_DOCUMENTS.map((doc) => ({
                    ...doc,
                    content_hash: crypto.createHash("sha256").update(doc.content).digest("hex"),
                    indexing_status: "PENDING",
                    chunk_count: 0,
                    created_at: now,
                    updated_at: now
                }))
            );
            console.log(`✓ Seeded ${SEED_DOCUMENTS.length} sample knowledge documents (PENDING — index them from Admin → AI Knowledge)`);
        } else {
            console.log("• Knowledge base already has documents, skipping seed");
        }

        console.log("\n=== Phase 6 migration completed successfully ===");
        process.exit(0);
    } catch (err) {
        console.error("✗ Phase 6 migration failed:", err.message);
        process.exit(1);
    }
}

migratePhase6();
