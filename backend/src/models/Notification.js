const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notification = sequelize.define(
    "Notification",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
        notificationType: { type: DataTypes.STRING(50), allowNull: false, field: "notification_type" },
        title: { type: DataTypes.STRING(255), allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        channel: {
            type: DataTypes.ENUM("IN_APP", "EMAIL", "PUSH", "SMS"),
            allowNull: false,
            defaultValue: "IN_APP"
        },
        referenceType: { type: DataTypes.STRING(50), allowNull: true, field: "reference_type" },
        referenceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "reference_id" },
        status: {
            type: DataTypes.ENUM("PENDING", "QUEUED", "SENT", "FAILED", "READ"),
            allowNull: false,
            defaultValue: "PENDING"
        },
        isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "is_read" },
        sentAt: { type: DataTypes.DATE, allowNull: true, field: "sent_at" }
    },
    {
        tableName: "NOTIFICATIONS",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["user_id", "is_read", "created_at"] },
            { fields: ["user_id", "created_at"] },
            { fields: ["status"] }
        ]
    }
);

module.exports = Notification;

