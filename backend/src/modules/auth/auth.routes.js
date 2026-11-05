const express = require("express");
const { z } = require("zod");

const controller = require("./auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.flatten()
        });
    }

    req.body = result.data;
    next();
};

const registerSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(150),
    password: z.string().min(8).max(72)
});

const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(72)
});

router.post(
    "/register",
    validate(registerSchema),
    controller.register
);

router.post(
    "/login",
    validate(loginSchema),
    controller.login
);

router.post("/refresh", controller.refresh);

router.post("/logout", controller.logout);

router.get("/me", authMiddleware, controller.me);

module.exports = router;
