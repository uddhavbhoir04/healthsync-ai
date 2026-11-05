const profileService = require("./profile.service");
const addressService = require("./address.service");

// PROFILE CONTROLLERS
exports.getProfile = async (req, res, next) => {
    try {
        const profile = await profileService.getProfile(req.user.id);
        res.json({
            success: true,
            data: profile,
            user: profile
        });
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const updated = await profileService.updateProfile(req.user.id, req.body);
        res.json({
            success: true,
            message: "Profile updated successfully",
            data: updated,
            user: updated
        });
    } catch (error) {
        next(error);
    }
};

// ADDRESS CONTROLLERS
exports.getAddresses = async (req, res, next) => {
    try {
        const addresses = await addressService.listAddresses(req.user.id);
        res.json({
            success: true,
            data: addresses,
            addresses
        });
    } catch (error) {
        next(error);
    }
};

exports.createAddress = async (req, res, next) => {
    try {
        const address = await addressService.createAddress(req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: "Address added successfully",
            data: address,
            address
        });
    } catch (error) {
        next(error);
    }
};

exports.updateAddress = async (req, res, next) => {
    try {
        const addressId = req.params.id;
        const address = await addressService.updateAddress(req.user.id, addressId, req.body);
        res.json({
            success: true,
            message: "Address updated successfully",
            data: address,
            address
        });
    } catch (error) {
        next(error);
    }
};

exports.setDefaultAddress = async (req, res, next) => {
    try {
        const addressId = req.params.id;
        const address = await addressService.setDefaultAddress(req.user.id, addressId);
        res.json({
            success: true,
            message: "Default address updated",
            data: address,
            address
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteAddress = async (req, res, next) => {
    try {
        const addressId = req.params.id;
        const result = await addressService.deleteAddress(req.user.id, addressId);
        res.json({
            success: true,
            message: "Address deleted successfully",
            ...result
        });
    } catch (error) {
        next(error);
    }
};

