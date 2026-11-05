const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },

        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        email: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },

        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        role: {
            type: DataTypes.ENUM("PATIENT", "ADMIN", "DOCTOR"),
            defaultValue: "PATIENT"
        },

        status: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },

        dateOfBirth: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: "date_of_birth"
        },

        gender: {
            type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"),
            allowNull: true
        },

        profileImageUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: "profile_image_url"
        }
    },
    {
        tableName: "USERS",
        timestamps: true,
        underscored: true
    }
);

module.exports = User;