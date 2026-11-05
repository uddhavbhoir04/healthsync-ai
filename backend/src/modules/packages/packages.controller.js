const packageService = require("./packages.service");

// PUBLIC CONTROLLERS
exports.listPublicPackages = async (req, res, next) => {
    try {
        const result = await packageService.listPackages(req.validatedQuery || req.query, false);
        res.json({
            success: true,
            data: result.packages,
            packages: result.packages,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getPublicPackageById = async (req, res, next) => {
    try {
        const pkg = await packageService.getPackageById(req.params.id, false);
        res.json({
            success: true,
            data: pkg,
            package: pkg
        });
    } catch (error) {
        next(error);
    }
};

// ADMIN CONTROLLERS
exports.listAdminPackages = async (req, res, next) => {
    try {
        const result = await packageService.listPackages(req.validatedQuery || req.query, true);
        res.json({
            success: true,
            data: result.packages,
            packages: result.packages,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getAdminPackageById = async (req, res, next) => {
    try {
        const pkg = await packageService.getPackageById(req.params.id, true);
        res.json({
            success: true,
            data: pkg,
            package: pkg
        });
    } catch (error) {
        next(error);
    }
};

exports.createPackage = async (req, res, next) => {
    try {
        const pkg = await packageService.createPackage(req.body);
        res.status(201).json({
            success: true,
            message: "Diagnostic package created successfully",
            data: pkg,
            package: pkg
        });
    } catch (error) {
        next(error);
    }
};

exports.updatePackage = async (req, res, next) => {
    try {
        const pkg = await packageService.updatePackage(req.params.id, req.body);
        res.json({
            success: true,
            message: "Diagnostic package updated successfully",
            data: pkg,
            package: pkg
        });
    } catch (error) {
        next(error);
    }
};

exports.updatePackageStatus = async (req, res, next) => {
    try {
        const pkg = await packageService.updatePackageStatus(req.params.id, req.body.status);
        res.json({
            success: true,
            message: `Package status updated to ${pkg.status ? "active" : "inactive"}`,
            data: pkg,
            package: pkg
        });
    } catch (error) {
        next(error);
    }
};

exports.deletePackage = async (req, res, next) => {
    try {
        const result = await packageService.deletePackage(req.params.id);
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

