const express = require("express");
const controller = require("./lab-tests.controller");
const { queryLabTestSchema } = require("./lab-tests.validation");

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

router.get("/categories", controller.getLabTestCategories);
router.get("/:id", controller.getPublicLabTestById);
router.get("/", validateQuery(queryLabTestSchema), controller.listPublicLabTests);

module.exports = router;

