const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AiKnowledgeChunk = sequelize.define(
    "AiKnowledgeChunk",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        documentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "document_id" },
        chunkIndex: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "chunk_index" },
        content: { type: DataTypes.TEXT, allowNull: false },
        vectorId: { type: DataTypes.UUID, allowNull: false, field: "vector_id" }
    },
    {
        tableName: "AI_KNOWLEDGE_CHUNKS",
        timestamps: true,
        updatedAt: false,
        underscored: true
        // FULLTEXT index on `content` is created by migrate-phase6.js
    }
);

module.exports = AiKnowledgeChunk;
