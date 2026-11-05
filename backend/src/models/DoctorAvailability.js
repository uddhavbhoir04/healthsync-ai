const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DoctorAvailability = sequelize.define(
    "DoctorAvailability",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        doctorId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "doctor_id"
        },
        dayOfWeek: {
            type: DataTypes.ENUM(
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
                "SUNDAY"
            ),
            allowNull: false,
            field: "day_of_week"
        },
        startTime: {
            type: DataTypes.STRING(10), // e.g. "09:00"
            allowNull: false,
            field: "start_time"
        },
        endTime: {
            type: DataTypes.STRING(10), // e.g. "17:00"
            allowNull: false,
            field: "end_time"
        },
        slotDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 30, // in minutes
            field: "slot_duration"
        },
        isAvailable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: "is_available"
        }
    },
    {
        tableName: "DOCTOR_AVAILABILITY",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["doctor_id"] },
            { fields: ["doctor_id", "day_of_week"] }
        ]
    }
);

module.exports = DoctorAvailability;

