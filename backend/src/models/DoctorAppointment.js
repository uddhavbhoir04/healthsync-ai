const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DoctorAppointment = sequelize.define(
    "DoctorAppointment",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        bookingId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "booking_id"
        },
        doctorId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "doctor_id"
        },
        patientName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "patient_name"
        },
        patientPhone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: "patient_phone"
        },
        patientGender: {
            type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"),
            allowNull: true,
            field: "patient_gender"
        },
        patientAge: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            field: "patient_age"
        },
        appointmentDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: "appointment_date"
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: "start_time"
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: "end_time"
        },
        consultationType: {
            type: DataTypes.ENUM("ONLINE", "IN_PERSON"),
            allowNull: false,
            defaultValue: "IN_PERSON",
            field: "consultation_type"
        },
        appointmentStatus: {
            type: DataTypes.ENUM("SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED", "NO_SHOW"),
            allowNull: false,
            defaultValue: "SCHEDULED",
            field: "appointment_status"
        },
        cancellationReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "cancellation_reason"
        }
    },
    {
        tableName: "DOCTOR_APPOINTMENTS",
        timestamps: true,
        underscored: true,
        indexes: [
            { name: "idx_doc_appt_booking", fields: ["booking_id"] },
            { name: "idx_doc_appt_slot", fields: ["doctor_id", "appointment_date", "start_time"] },
            { name: "idx_doc_appt_status", fields: ["appointment_status"] },
            { name: "idx_doc_appt_date", fields: ["appointment_date"] }
        ]
    }
);

module.exports = DoctorAppointment;

