const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const LabTest = sequelize.define(
    "LabTest",
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        testName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: "test_name"
        },
        testCode: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: "test_code"
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        sampleType: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: "Blood",
            field: "sample_type"
        },
        fastingRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: "fasting_required"
        },
        preparationInstructions: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "preparation_instructions"
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "LAB_TESTS",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["test_name"] },
            { fields: ["test_code"] },
            { fields: ["category"] },
            { fields: ["fasting_required"] },
            { fields: ["price"] },
            { fields: ["status"] }
        ]
    }
);

module.exports = LabTest;

