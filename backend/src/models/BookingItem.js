const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BookingItem = sequelize.define(
    "BookingItem",
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
        itemType: {
            type: DataTypes.ENUM("DOCTOR_CONSULTATION", "LAB_TEST", "DIAGNOSTIC_PACKAGE"),
            allowNull: false,
            field: "item_type"
        },
        itemId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "item_id"
        },
        itemName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: "item_name"
        },
        unitPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "unit_price"
        },
        quantity: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 1
        },
        totalPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "total_price"
        }
    },
    {
        tableName: "BOOKING_ITEMS",
        timestamps: true,
        underscored: true,
        indexes: [
            { name: "idx_bk_item_booking", fields: ["booking_id"] },
            { name: "idx_bk_item_ref", fields: ["item_type", "item_id"] }
        ]
    }
);

module.exports = BookingItem;

