const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            role: user.role
        },
        process.env.JWT_ACCESS_SECRET,
        {
            subject: String(user.id),
            expiresIn: "15m",
            issuer: "healthsync-ai",
            audience: "healthsync-users",
            algorithm: "HS256"
        }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            jti: crypto.randomUUID()
        },
        process.env.JWT_REFRESH_SECRET,
        {
            subject: String(user.id),
            expiresIn: "7d",
            issuer: "healthsync-ai",
            audience: "healthsync-refresh",
            algorithm: "HS256"
        }
    );
};

const hashToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashToken
};
