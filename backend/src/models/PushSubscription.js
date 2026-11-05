const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PushSubscription = sequelize.define(
    "PushSubscription",
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
        endpoint: { type: DataTypes.TEXT, allowNull: false },
        endpointHash: { type: DataTypes.CHAR(64), allowNull: false, field: "endpoint_hash" },
        p256dh: { type: DataTypes.STRING(255), allowNull: false },
        auth: { type: DataTypes.STRING(255), allowNull: false },
        deviceName: { type: DataTypes.STRING(100), allowNull: true, field: "device_name" },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "is_active" }
    },
    {
        tableName: "PUSH_SUBSCRIPTIONS",
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ["user_id", "endpoint_hash"] },
            { fields: ["user_id", "is_active"] }
        ]
    }
);

module.exports = PushSubscription;

