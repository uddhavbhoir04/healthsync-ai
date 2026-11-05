const express = require("express");
const controller = require("./packages.controller");
const { queryPackageSchema } = require("./packages.validation");

const router = express.Router();

const validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid query parameters",
            errors: result.error.flatten()
        });
    }
    req.validatedQuery = result.data;
    next();
};

router.get("/:id", controller.getPublicPackageById);
router.get("/", validateQuery(queryPackageSchema), controller.listPublicPackages);

module.exports = router;

