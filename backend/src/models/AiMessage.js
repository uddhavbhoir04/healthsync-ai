const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AiMessage = sequelize.define(
    "AiMessage",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        conversationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "conversation_id" },
        role: { type: DataTypes.ENUM("USER", "ASSISTANT"), allowNull: false },
        content: { type: DataTypes.TEXT, allowNull: false },
        sourcesJson: { type: DataTypes.JSON, allowNull: true, field: "sources_json" }
    },
    {
        tableName: "AI_MESSAGES",
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [{ fields: ["conversation_id", "id"] }]
    }
);

module.exports = AiMessage;
