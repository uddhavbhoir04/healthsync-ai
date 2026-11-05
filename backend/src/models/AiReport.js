const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AiReport = sequelize.define(
    "AiReport",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        publicId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "public_id" },
        userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
        fileName: { type: DataTypes.STRING(255), allowNull: false, field: "file_name" },
        fileType: { type: DataTypes.STRING(50), allowNull: false, field: "file_type" },
        fileSize: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "file_size" },
        fileHash: { type: DataTypes.CHAR(64), allowNull: false, field: "file_hash" },
        // Uploaded files are processed in memory and never persisted; kept for future private storage.
        storagePath: { type: DataTypes.STRING(500), allowNull: true, field: "storage_path" },
        summaryJson: { type: DataTypes.JSON, allowNull: true, field: "summary_json" },
        processingStatus: {
            type: DataTypes.ENUM("PROCESSING", "COMPLETED", "FAILED"),
            allowNull: false,
            defaultValue: "PROCESSING",
            field: "processing_status"
        },
        errorMessage: { type: DataTypes.STRING(255), allowNull: true, field: "error_message" }
    },
    {
        tableName: "AI_REPORTS",
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ["user_id", "file_hash"] },
            { fields: ["user_id", "created_at"] }
        ]
    }
);

module.exports = AiReport;
