const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WebhookEvent = sequelize.define(
    "WebhookEvent",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        eventId: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            field: "event_id"
        },
        eventType: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "event_type"
        },
        payload: {
            type: DataTypes.JSON,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM("PENDING", "PROCESSED", "FAILED", "IGNORED"),
            allowNull: false,
            defaultValue: "PENDING"
        }
    },
    {
        tableName: "WEBHOOK_EVENTS",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["event_id"] },
            { fields: ["event_type"] },
            { fields: ["status"] }
        ]
    }
);

module.exports = WebhookEvent;

