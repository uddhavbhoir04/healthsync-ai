const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const LabCollectionDetail = sequelize.define(
    "LabCollectionDetail",
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
        collectionType: {
            type: DataTypes.ENUM("HOME", "LAB_VISIT"),
            allowNull: false,
            defaultValue: "HOME",
            field: "collection_type"
        },
        addressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            field: "address_id"
        },
        preferredDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: "preferred_date"
        },
        preferredTimeSlot: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: "preferred_time_slot"
        },
        sampleStatus: {
            type: DataTypes.ENUM(
                "PENDING",
                "COLLECTED",
                "IN_TRANSIT",
                "RECEIVED",
                "PROCESSING",
                "COMPLETED",
                "CANCELLED"
            ),
            allowNull: false,
            defaultValue: "PENDING",
            field: "sample_status"
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        tableName: "LAB_COLLECTION_DETAILS",
        timestamps: true,
        underscored: true,
        indexes: [
            { name: "idx_lab_coll_booking", fields: ["booking_id"] },
            { name: "idx_lab_coll_address", fields: ["address_id"] },
            { name: "idx_lab_coll_status", fields: ["sample_status"] },
            { name: "idx_lab_coll_date", fields: ["preferred_date"] }
        ]
    }
);

module.exports = LabCollectionDetail;

