const jwt = require("jsonwebtoken");
const { User } = require("../models");

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access token required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET,
            {
                algorithms: ["HS256"],
                issuer: "healthsync-ai",
                audience: "healthsync-users"
            }
        );

        const user = await User.findByPk(decoded.sub, {
            attributes: ["id", "name", "email", "role", "status"]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Account no longer exists"
            });
        }

        if (user.status === false || user.status === 0) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Please contact support."
            });
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
        };

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token"
        });
    }
};