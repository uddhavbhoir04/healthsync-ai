const { RefreshToken } = require("../../models");
const { hashToken } = require("../../utils/token");

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth"
});

exports.logout = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;

        if (token) {
            await RefreshToken.update(
                { revokedAt: new Date() },
                {
                    where: {
                        tokenHash: hashToken(token),
                        revokedAt: null
                    }
                }
            );
        }

        res.clearCookie("refreshToken", cookieOptions());

        res.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        next(error);
    }
};
