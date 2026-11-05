const adminService = require("./admin.service");

exports.listUsers = async (req, res, next) => {
    try {
        const result = await adminService.listUsers(req.validatedQuery || req.query);
        res.json({
            success: true,
            data: result.users,
            users: result.users,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getUserById = async (req, res, next) => {
    try {
        const user = await adminService.getUserById(req.params.id);
        res.json({
            success: true,
            data: user,
            user
        });
    } catch (error) {
        next(error);
    }
};

exports.updateUserStatus = async (req, res, next) => {
    try {
        const updatedUser = await adminService.updateUserStatus(
            req.user.id,
            req.params.id,
            req.body.status
        );
        res.json({
            success: true,
            message: `User ${updatedUser.status ? "activated" : "deactivated"} successfully`,
            data: updatedUser,
            user: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

exports.updateUserRole = async (req, res, next) => {
    try {
        const updatedUser = await adminService.updateUserRole(
            req.user.id,
            req.params.id,
            req.body.role
        );
        res.json({
            success: true,
            message: `User role updated to ${updatedUser.role} successfully`,
            data: updatedUser,
            user: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

