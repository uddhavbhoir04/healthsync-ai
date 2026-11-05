const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DiagnosticPackage = sequelize.define(
    "DiagnosticPackage",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        packageName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: "package_name"
        },
        packageCode: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: "package_code"
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        image: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        originalPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "original_price"
        },
        offerPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "offer_price"
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "DIAGNOSTIC_PACKAGES",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["package_name"] },
            { fields: ["package_code"] },
            { fields: ["offer_price"] },
            { fields: ["status"] }
        ]
    }
);

module.exports = DiagnosticPackage;

