const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/role.middleware");
const controller = require("./admin-ai.controller");
const {
    knowledgeSchema,
    updateKnowledgeSchema,
    queryKnowledgeSchema,
    indexKnowledgeSchema,
    usageQuerySchema
} = require("./ai.validation");

const router = express.Router();

const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body || {});
    if (!result.success) {
        return res.status(400).json({ success: false, message: "Validation failed", errors: result.error.flatten() });
    }
    req.body = result.data;
    next();
};

const validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
        return res.status(400).json({ success: false, message: "Invalid query parameters", errors: result.error.flatten() });
    }
    req.validatedQuery = result.data;
    next();
};

router.use(authMiddleware);
router.use(allowRoles("ADMIN"));

router.get("/usage", validateQuery(usageQuerySchema), controller.usageOverview);

router.get("/knowledge", validateQuery(queryKnowledgeSchema), controller.listKnowledge);
router.post("/knowledge", validateBody(knowledgeSchema), controller.createKnowledge);
router.get("/knowledge/:id", controller.getKnowledge);
router.put("/knowledge/:id", validateBody(updateKnowledgeSchema), controller.updateKnowledge);
router.delete("/knowledge/:id", controller.deleteKnowledge);
router.post("/knowledge/:id/index", validateBody(indexKnowledgeSchema), controller.indexKnowledge);

module.exports = router;
