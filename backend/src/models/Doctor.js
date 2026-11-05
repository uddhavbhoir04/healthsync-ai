const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Doctor = sequelize.define(
    "Doctor",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            field: "user_id"
        },
        doctorName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "doctor_name"
        },
        specialization: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        qualification: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        experienceYears: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: "experience_years"
        },
        consultationFee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "consultation_fee"
        },
        about: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        profileImage: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: "profile_image"
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        pincode: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "DOCTORS",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["doctor_name"] },
            { fields: ["specialization"] },
            { fields: ["city"] },
            { fields: ["pincode"] },
            { fields: ["status"] },
            { fields: ["consultation_fee"] }
        ]
    }
);

module.exports = Doctor;

