const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PackageTest = sequelize.define(
    "PackageTest",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        packageId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "package_id"
        },
        labTestId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: "lab_test_id"
        }
    },
    {
        tableName: "PACKAGE_TESTS",
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ["package_id", "lab_test_id"]
            },
            { fields: ["lab_test_id"] }
        ]
    }
);

module.exports = PackageTest;

