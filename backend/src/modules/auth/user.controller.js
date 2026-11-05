exports.me = async (req, res, next) => {
    try {
        const { User } = require("../../models");

        const user = await User.findByPk(req.user.id, {
            attributes: ["id", "name", "email", "role"]
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        next(error);
    }
};