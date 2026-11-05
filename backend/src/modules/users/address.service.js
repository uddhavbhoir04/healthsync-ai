const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const { UserAddress } = require("../../models");

async function listAddresses(userId) {
    return UserAddress.findAll({
        where: { userId },
        order: [
            ["isDefault", "DESC"],
            ["createdAt", "DESC"]
        ]
    });
}

async function createAddress(userId, payload) {
    return sequelize.transaction(async (transaction) => {
        // Count existing addresses for this user
        const existingCount = await UserAddress.count({
            where: { userId },
            transaction
        });

        // If this is the user's first address, force it to be default
        // Or if requested as default, unset any existing default address
        let shouldBeDefault = payload.isDefault === true || existingCount === 0;

        if (shouldBeDefault && existingCount > 0) {
            await UserAddress.update(
                { isDefault: false },
                {
                    where: { userId, isDefault: true },
                    transaction
                }
            );
        }

        const newAddress = await UserAddress.create(
            {
                userId,
                addressType: payload.addressType || "HOME",
                fullName: payload.fullName,
                phone: payload.phone,
                addressLine1: payload.addressLine1,
                addressLine2: payload.addressLine2 || null,
                city: payload.city,
                state: payload.state,
                pincode: payload.pincode,
                landmark: payload.landmark || null,
                isDefault: shouldBeDefault
            },
            { transaction }
        );

        return newAddress;
    });
}

async function updateAddress(userId, addressId, payload) {
    return sequelize.transaction(async (transaction) => {
        // Find existing address with lock and verify ownership
        const address = await UserAddress.findOne({
            where: { id: addressId, userId },
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!address) {
            const error = new Error("Address not found");
            error.status = 404;
            throw error;
        }

        const updates = {};
        if (payload.addressType !== undefined) updates.addressType = payload.addressType;
        if (payload.fullName !== undefined) updates.fullName = payload.fullName;
        if (payload.phone !== undefined) updates.phone = payload.phone;
        if (payload.addressLine1 !== undefined) updates.addressLine1 = payload.addressLine1;
        if (payload.addressLine2 !== undefined) updates.addressLine2 = payload.addressLine2 || null;
        if (payload.city !== undefined) updates.city = payload.city;
        if (payload.state !== undefined) updates.state = payload.state;
        if (payload.pincode !== undefined) updates.pincode = payload.pincode;
        if (payload.landmark !== undefined) updates.landmark = payload.landmark || null;

        // If updating default status to true
        if (payload.isDefault === true && !address.isDefault) {
            await UserAddress.update(
                { isDefault: false },
                {
                    where: {
                        userId,
                        id: { [Op.ne]: addressId }
                    },
                    transaction
                }
            );
            updates.isDefault = true;
        } else if (payload.isDefault === false && address.isDefault) {
            // Cannot unset default if it is the only address
            const otherAddress = await UserAddress.findOne({
                where: {
                    userId,
                    id: { [Op.ne]: addressId }
                },
                order: [["createdAt", "DESC"]],
                transaction
            });

            if (otherAddress) {
                await otherAddress.update({ isDefault: true }, { transaction });
                updates.isDefault = false;
            } else {
                // Must remain default since it is the single address
                updates.isDefault = true;
            }
        }

        await address.update(updates, { transaction });
        return address;
    });
}

async function setDefaultAddress(userId, addressId) {
    return sequelize.transaction(async (transaction) => {
        const address = await UserAddress.findOne({
            where: { id: addressId, userId },
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!address) {
            const error = new Error("Address not found");
            error.status = 404;
            throw error;
        }

        // Unset all defaults for this user
        await UserAddress.update(
            { isDefault: false },
            {
                where: { userId },
                transaction
            }
        );

        // Mark target address as default
        await address.update({ isDefault: true }, { transaction });
        return address;
    });
}

async function deleteAddress(userId, addressId) {
    return sequelize.transaction(async (transaction) => {
        const address = await UserAddress.findOne({
            where: { id: addressId, userId },
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!address) {
            const error = new Error("Address not found");
            error.status = 404;
            throw error;
        }

        const wasDefault = address.isDefault;

        await address.destroy({ transaction });

        let newDefaultAddress = null;

        // If the deleted address was default, promote another address if one exists
        if (wasDefault) {
            newDefaultAddress = await UserAddress.findOne({
                where: { userId },
                order: [["createdAt", "DESC"]],
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (newDefaultAddress) {
                await newDefaultAddress.update({ isDefault: true }, { transaction });
            }
        }

        return {
            deletedId: addressId,
            newDefaultId: newDefaultAddress ? newDefaultAddress.id : null
        };
    });
}

module.exports = {
    listAddresses,
    createAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress
};

