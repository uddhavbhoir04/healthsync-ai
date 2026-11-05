const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const NotificationPreference = sequelize.define(
    "NotificationPreference",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true, field: "user_id" },
        emailEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "email_enabled" },
        pushEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "push_enabled" },
        smsEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "sms_enabled" },
        appointmentReminders: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "appointment_reminders" },
        bookingUpdates: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "booking_updates" },
        paymentUpdates: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "payment_updates" },
        reportUpdates: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "report_updates" }
    },
    {
        tableName: "NOTIFICATION_PREFERENCES",
        timestamps: true,
        underscored: true
    }
);

module.exports = NotificationPreference;

