const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PaymentTransaction = sequelize.define(
    "PaymentTransaction",
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
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "user_id"
        },
        gateway: {
            type: DataTypes.ENUM("RAZORPAY"),
            allowNull: false,
            defaultValue: "RAZORPAY"
        },
        gatewayOrderId: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "gateway_order_id"
        },
        gatewayPaymentId: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
            field: "gateway_payment_id"
        },
        gatewaySignature: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: "gateway_signature"
        },
        idempotencyKey: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: "idempotency_key"
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        currency: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: "INR"
        },
        paymentStatus: {
            type: DataTypes.ENUM(
                "CREATED",
                "PENDING",
                "SUCCESS",
                "FAILED",
                "REFUND_PENDING",
                "REFUNDED",
                "PARTIALLY_REFUNDED"
            ),
            allowNull: false,
            defaultValue: "CREATED",
            field: "payment_status"
        },
        paymentMethod: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: "payment_method"
        },
        errorCode: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: "error_code"
        },
        errorDescription: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "error_description"
        },
        paidAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "paid_at"
        }
    },
    {
        tableName: "PAYMENT_TRANSACTIONS",
        timestamps: true,
        underscored: true,
        indexes: [
            { name: "idx_pay_tx_booking", fields: ["booking_id"] },
            { name: "idx_pay_tx_user", fields: ["user_id"] },
            { name: "idx_pay_tx_order", fields: ["gateway_order_id"] },
            { name: "idx_pay_tx_payment", fields: ["gateway_payment_id"] },
            { name: "idx_pay_tx_status", fields: ["payment_status"] },
            { name: "idx_pay_tx_idempotency", fields: ["idempotency_key"] }
        ]
    }
);

module.exports = PaymentTransaction;

