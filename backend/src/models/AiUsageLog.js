const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AiUsageLog = sequelize.define(
    "AiUsageLog",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "user_id" },
        feature: {
            type: DataTypes.ENUM("CHAT", "REPORT_SUMMARY", "REPORT_QUESTION", "EMBEDDING"),
            allowNull: false
        },
        model: { type: DataTypes.STRING(100), allowNull: true },
        inputTokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: "input_tokens" },
        outputTokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: "output_tokens" },
        status: { type: DataTypes.ENUM("SUCCESS", "ERROR", "LIMITED"), allowNull: false },
        errorCode: { type: DataTypes.STRING(50), allowNull: true, field: "error_code" }
    },
    {
        tableName: "AI_USAGE_LOGS",
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [{ fields: ["user_id", "created_at"] }, { fields: ["created_at"] }]
    }
);

module.exports = AiUsageLog;
