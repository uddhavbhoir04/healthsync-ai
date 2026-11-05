const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AiConversation = sequelize.define(
    "AiConversation",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
        title: { type: DataTypes.STRING(150), allowNull: false, defaultValue: "New conversation" },
        lastMessageAt: { type: DataTypes.DATE, allowNull: true, field: "last_message_at" }
    },
    {
        tableName: "AI_CONVERSATIONS",
        timestamps: true,
        underscored: true,
        indexes: [{ fields: ["user_id", "updated_at"] }]
    }
);

module.exports = AiConversation;
