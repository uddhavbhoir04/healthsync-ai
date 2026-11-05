const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const NotificationOutbox = sequelize.define(
    "NotificationOutbox",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        eventType: { type: DataTypes.STRING(50), allowNull: false, field: "event_type" },
        eventPayload: { type: DataTypes.JSON, allowNull: false, field: "event_payload" },
        status: {
            type: DataTypes.ENUM("PENDING", "PROCESSING", "COMPLETED", "FAILED"),
            allowNull: false,
            defaultValue: "PENDING"
        },
        attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        availableAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: "available_at"
        },
        processedAt: { type: DataTypes.DATE, allowNull: true, field: "processed_at" },
        lastError: { type: DataTypes.TEXT, allowNull: true, field: "last_error" }
    },
    {
        tableName: "NOTIFICATION_OUTBOX",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["status", "available_at"] },
            { fields: ["event_type"] }
        ]
    }
);

module.exports = NotificationOutbox;

