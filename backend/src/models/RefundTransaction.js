const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RefundTransaction = sequelize.define(
    "RefundTransaction",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        paymentTransactionId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "payment_transaction_id"
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
        gatewayRefundId: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
            field: "gateway_refund_id"
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
        refundStatus: {
            type: DataTypes.ENUM("PENDING", "PROCESSED", "FAILED"),
            allowNull: false,
            defaultValue: "PENDING",
            field: "refund_status"
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        errorDescription: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "error_description"
        },
        processedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "processed_at"
        }
    },
    {
        tableName: "REFUND_TRANSACTIONS",
        timestamps: true,
        underscored: true,
        indexes: [
            { name: "idx_rfnd_tx_payment", fields: ["payment_transaction_id"] },
            { name: "idx_rfnd_tx_booking", fields: ["booking_id"] },
            { name: "idx_rfnd_tx_user", fields: ["user_id"] },
            { name: "idx_rfnd_tx_gateway", fields: ["gateway_refund_id"] },
            { name: "idx_rfnd_tx_status", fields: ["refund_status"] }
        ]
    }
);

module.exports = RefundTransaction;

