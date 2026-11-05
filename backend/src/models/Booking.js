const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Booking = sequelize.define(
    "Booking",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        bookingNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: "booking_number"
        },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "user_id"
        },
        bookingType: {
            type: DataTypes.ENUM("DOCTOR", "LAB_TEST", "PACKAGE"),
            allowNull: false,
            field: "booking_type"
        },
        bookingStatus: {
            type: DataTypes.ENUM(
                "PENDING",
                "CONFIRMED",
                "CANCELLED",
                "COMPLETED",
                "RESCHEDULED",
                "NO_SHOW"
            ),
            allowNull: false,
            defaultValue: "CONFIRMED",
            field: "booking_status"
        },
        paymentStatus: {
            type: DataTypes.ENUM("PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"),
            allowNull: false,
            defaultValue: "PENDING",
            field: "payment_status"
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        discountAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "discount_amount"
        },
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "total_amount"
        },
        addressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            field: "address_id"
        },
        bookingDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: "booking_date"
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        tableName: "BOOKINGS",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["booking_number"] },
            { fields: ["user_id"] },
            { fields: ["booking_type"] },
            { fields: ["booking_status"] },
            { fields: ["payment_status"] },
            { fields: ["booking_date"] }
        ]
    }
);

module.exports = Booking;

