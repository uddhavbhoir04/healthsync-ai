const { Op } = require("sequelize");
const { User, UserAddress } = require("../../models");

const USER_ADMIN_ATTRIBUTES = [
    "id",
    "name",
    "email",
    "phone",
    "dateOfBirth",
    "gender",
    "profileImageUrl",
    "role",
    "status",
    "createdAt",
    "updatedAt"
];

async function listUsers({ page = 1, limit = 10, search, role, status, sortBy = "createdAt", sortOrder = "DESC" }) {
    const where = {};

    // Search by name, email or phone (sanitized via Sequelize parameter binding)
    if (search && search.trim() !== "") {
        const sanitized = `%${search.trim()}%`;
        where[Op.or] = [
            { name: { [Op.like]: sanitized } },
            { email: { [Op.like]: sanitized } },
            { phone: { [Op.like]: sanitized } }
        ];
    }

    if (role) {
        where.role = role;
    }

    if (typeof status === "boolean") {
        where.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
        where,
        attributes: USER_ADMIN_ATTRIBUTES,
        order: [[sortBy, sortOrder.toUpperCase()]],
        offset,
        limit
    });

    return {
        users: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit) || 1
        }
    };
}

async function getUserById(id) {
    const user = await User.findByPk(id, {
        attributes: USER_ADMIN_ATTRIBUTES,
        include: [
            {
                model: UserAddress,
                as: "addresses"
            }
        ]
    });

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    return user;
}

async function updateUserStatus(currentAdminId, targetUserId, newStatus) {
    if (String(currentAdminId) === String(targetUserId) && newStatus === false) {
        const error = new Error("You cannot deactivate your own admin account");
        error.status = 400;
        throw error;
    }

    const user = await User.findByPk(targetUserId, {
        attributes: USER_ADMIN_ATTRIBUTES
    });

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    await user.update({ status: newStatus });
    return user;
}

async function updateUserRole(currentAdminId, targetUserId, newRole) {
    if (String(currentAdminId) === String(targetUserId) && newRole !== "ADMIN") {
        const error = new Error("You cannot remove your own admin privileges");
        error.status = 400;
        throw error;
    }

    const user = await User.findByPk(targetUserId, {
        attributes: USER_ADMIN_ATTRIBUTES
    });

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    await user.update({ role: newRole });
    return user;
}

module.exports = {
    listUsers,
    getUserById,
    updateUserStatus,
    updateUserRole
};

