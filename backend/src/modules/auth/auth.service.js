const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { User, RefreshToken, NotificationPreference } = require("../../models");
const notificationsService = require("../notifications/notifications.service");
const { EVENT_TYPES } = require("../notifications/notification.constants");
const sequelize = require("../../config/database");

const { Op } = require("sequelize");
const {
    generateAccessToken,
    generateRefreshToken,
    hashToken
} = require("../../utils/token");



async function register({ name, email, password }) {
    const existingUser = await User.findOne({
        where: { email }
    });

    if (existingUser) {
        throw new Error("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
        name,
        email,
        password: hashedPassword
    });

    // Initialize notification preferences and send welcome notification (Phase 7)
    try {
        await NotificationPreference.findOrCreate({
            where: { userId: user.id },
            defaults: {
                userId: user.id,
                emailEnabled: true,
                pushEnabled: true,
                smsEnabled: false,
                appointmentReminders: true,
                bookingUpdates: true,
                paymentUpdates: true,
                reportUpdates: true
            }
        });

        const outbox = await notificationsService.createOutboxEvent(EVENT_TYPES.WELCOME, {
            userId: user.id,
            name: user.name,
            email: user.email,
            dashboardUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`
        });
        await notificationsService.dispatchOutboxEvent(outbox.id);
    } catch (notifErr) {
        console.warn("Welcome notification dispatch notice:", notifErr.message);
    }

    return user;
}

async function login({ email, password }) {
    const user = await User.findOne({
        where: {
            email,
            status: true
        },
        attributes: ["id", "name", "email", "password", "role", "status"]
    });

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const validPassword = await bcrypt.compare(
        password,
        user.password
    );

    if (!validPassword) {
        throw new Error("Invalid email or password");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const decoded = jwt.decode(refreshToken);

    await RefreshToken.create({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(decoded.exp * 1000)
    });

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        accessToken,
        refreshToken
    };
}


async function refreshSession(token) {
    const decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET,
        {
            algorithms: ["HS256"],
            issuer: "healthsync-ai",
            audience: "healthsync-refresh"
        }
    );

    const storedToken = await RefreshToken.findOne({
        where: {
            tokenHash: hashToken(token),
            userId: decoded.sub,
            revokedAt: null,
            expiresAt: {
                [Op.gt]: new Date()
            }
        }
    });

    if (!storedToken) {
        throw new Error("Refresh session is invalid");
    }

    const user = await User.findByPk(decoded.sub, {
        attributes: ["id", "name", "email", "role", "status"]
    });

    if (!user || !user.status) {
        throw new Error("User account is unavailable");
    }

    const newRefreshToken = generateRefreshToken(user);
    const newAccessToken = generateAccessToken(user);

    const newDecoded = jwt.decode(newRefreshToken);

    await sequelize.transaction(async (transaction) => {
        // Revoke the old session token
        await storedToken.update(
            { revokedAt: new Date() },
            { transaction }
        );

        // Store the rotated token
        await RefreshToken.create(
            {
                userId: user.id,
                tokenHash: hashToken(newRefreshToken),
                expiresAt: new Date(newDecoded.exp * 1000)
            },
            { transaction }
        );
    });

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
}

module.exports = {
    register,
    login,
    refreshSession
};