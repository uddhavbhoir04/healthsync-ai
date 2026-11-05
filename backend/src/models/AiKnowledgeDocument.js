const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SOURCE_TYPES = ["FAQ", "LAB_TEST", "TERMINOLOGY", "PREPARATION", "EDUCATIONAL", "DOCUMENTATION"];
const INDEXING_STATUSES = ["PENDING", "INDEXING", "INDEXED", "FAILED"];

const AiKnowledgeDocument = sequelize.define(
    "AiKnowledgeDocument",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        sourceType: { type: DataTypes.ENUM(...SOURCE_TYPES), allowNull: false, field: "source_type" },
        sourceReference: { type: DataTypes.STRING(500), allowNull: false, field: "source_reference" },
        content: { type: DataTypes.TEXT("long"), allowNull: false },
        contentHash: { type: DataTypes.CHAR(64), allowNull: false, field: "content_hash" },
        indexingStatus: {
            type: DataTypes.ENUM(...INDEXING_STATUSES),
            allowNull: false,
            defaultValue: "PENDING",
            field: "indexing_status"
        },
        indexingError: { type: DataTypes.STRING(255), allowNull: true, field: "indexing_error" },
        indexedHash: { type: DataTypes.CHAR(64), allowNull: true, field: "indexed_hash" },
        retrievalMode: { type: DataTypes.ENUM("vector", "keyword"), allowNull: true, field: "retrieval_mode" },
        chunkCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: "chunk_count" },
        lastIndexedAt: { type: DataTypes.DATE, allowNull: true, field: "last_indexed_at" },
        createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "created_by" }
    },
    {
        tableName: "AI_KNOWLEDGE_DOCUMENTS",
        timestamps: true,
        underscored: true,
        indexes: [{ fields: ["indexing_status"] }, { fields: ["source_type"] }]
    }
);

AiKnowledgeDocument.SOURCE_TYPES = SOURCE_TYPES;
AiKnowledgeDocument.INDEXING_STATUSES = INDEXING_STATUSES;

module.exports = AiKnowledgeDocument;
