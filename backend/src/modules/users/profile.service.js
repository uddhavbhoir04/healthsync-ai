const { User } = require("../../models");

const USER_SAFE_ATTRIBUTES = [
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

async function getProfile(userId) {
    const user = await User.findByPk(userId, {
        attributes: USER_SAFE_ATTRIBUTES
    });

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    return user;
}

async function updateProfile(userId, payload) {
    const user = await User.findByPk(userId);

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    const updates = {};

    if (payload.name !== undefined) {
        updates.name = payload.name;
    }

    if (payload.phone !== undefined) {
        updates.phone = payload.phone === "" ? null : payload.phone;
    }

    if (payload.dateOfBirth !== undefined) {
        updates.dateOfBirth = payload.dateOfBirth === "" ? null : payload.dateOfBirth;
    }

    if (payload.gender !== undefined) {
        updates.gender = payload.gender === "" ? null : payload.gender;
    }

    if (payload.profileImageUrl !== undefined) {
        updates.profileImageUrl = payload.profileImageUrl === "" ? null : payload.profileImageUrl;
    }

    // Email is strictly read-only and deliberately omitted from updates

    await user.update(updates);

    return getProfile(userId);
}

module.exports = {
    getProfile,
    updateProfile
};

