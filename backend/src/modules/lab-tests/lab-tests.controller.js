const labTestService = require("./lab-tests.service");

// PUBLIC CONTROLLERS
exports.listPublicLabTests = async (req, res, next) => {
    try {
        const result = await labTestService.listLabTests(req.validatedQuery || req.query, false);
        res.json({
            success: true,
            data: result.tests,
            tests: result.tests,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getLabTestCategories = async (req, res, next) => {
    try {
        const categories = await labTestService.getLabTestCategories();
        res.json({
            success: true,
            data: categories,
            categories
        });
    } catch (error) {
        next(error);
    }
};

exports.getPublicLabTestById = async (req, res, next) => {
    try {
        const test = await labTestService.getLabTestById(req.params.id, false);
        res.json({
            success: true,
            data: test,
            test
        });
    } catch (error) {
        next(error);
    }
};

// ADMIN CONTROLLERS
exports.listAdminLabTests = async (req, res, next) => {
    try {
        const result = await labTestService.listLabTests(req.validatedQuery || req.query, true);
        res.json({
            success: true,
            data: result.tests,
            tests: result.tests,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getAdminLabTestById = async (req, res, next) => {
    try {
        const test = await labTestService.getLabTestById(req.params.id, true);
        res.json({
            success: true,
            data: test,
            test
        });
    } catch (error) {
        next(error);
    }
};

exports.createLabTest = async (req, res, next) => {
    try {
        const test = await labTestService.createLabTest(req.body);
        res.status(201).json({
            success: true,
            message: "Lab test created successfully",
            data: test,
            test
        });
    } catch (error) {
        next(error);
    }
};

exports.updateLabTest = async (req, res, next) => {
    try {
        const test = await labTestService.updateLabTest(req.params.id, req.body);
        res.json({
            success: true,
            message: "Lab test updated successfully",
            data: test,
            test
        });
    } catch (error) {
        next(error);
    }
};

exports.updateLabTestStatus = async (req, res, next) => {
    try {
        const test = await labTestService.updateLabTestStatus(req.params.id, req.body.status);
        res.json({
            success: true,
            message: `Lab test status updated to ${test.status ? "active" : "inactive"}`,
            data: test,
            test
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteLabTest = async (req, res, next) => {
    try {
        const result = await labTestService.deleteLabTest(req.params.id);
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

