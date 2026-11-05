const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserAddress = sequelize.define(
    "UserAddress",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "user_id"
        },
        addressType: {
            type: DataTypes.ENUM("HOME", "WORK", "OTHER"),
            defaultValue: "HOME",
            field: "address_type"
        },
        fullName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "full_name"
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        addressLine1: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: "address_line1"
        },
        addressLine2: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: "address_line2"
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        state: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        pincode: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        landmark: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        isDefault: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: "is_default"
        }
    },
    {
        tableName: "USER_ADDRESSES",
        timestamps: true,
        underscored: true,
        indexes: [
            {
                name: "idx_user_addresses_user_id",
                fields: ["user_id"]
            },
            {
                name: "idx_user_addresses_user_default",
                fields: ["user_id", "is_default"]
            }
        ]
    }
);

module.exports = UserAddress;