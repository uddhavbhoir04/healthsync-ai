const authService = require("./auth.service");
const logoutController = require("./logout.controller");
const userController = require("./user.controller");

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

exports.register = async (req, res, next) => {
    try {
        const user = await authService.register(req.body);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);

        res.cookie(
            "refreshToken",
            result.refreshToken,
            cookieOptions()
        );

        res.json({
            success: true,
            message: "Login successful",
            accessToken: result.accessToken,
            user: result.user
        });
    } catch (error) {
        next(error);
    }
};

exports.refresh = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({
                message: "Refresh token required"
            });
        }

        const result = await authService.refreshSession(token);

        res.cookie(
            "refreshToken",
            result.refreshToken,
            cookieOptions()
        );

        res.json({
            success: true,
            accessToken: result.accessToken,
            user: result.user
        });

    } catch (error) {
        res.clearCookie("refreshToken", cookieOptions());
        next(error);
    }
};

exports.logout = logoutController.logout;
exports.me = userController.me;
