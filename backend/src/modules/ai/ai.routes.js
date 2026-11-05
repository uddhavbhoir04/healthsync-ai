const express = require("express");
const multer = require("multer");
const authMiddleware = require("../../middleware/auth.middleware");
const controller = require("./ai.controller");
const { getAiConfig } = require("./ai.config");
const { ALLOWED_TYPES } = require("./reports.service");
const { AiError } = require("./ai.errors");
const {
    chatSchema,
    renameConversationSchema,
    paginationSchema,
    reportQuestionSchema
} = require("./ai.validation");

const router = express.Router();

const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
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

const validateIdParam = (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
        return res.status(404).json({ success: false, code: "AI_NOT_FOUND", message: "Conversation not found" });
    }
    next();
};

// In-memory upload: files are never written to disk or exposed via public URLs
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getAiConfig().reportMaxBytes, files: 1, fields: 5 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_TYPES[file.mimetype]) {
            return cb(new AiError("AI_FILE_INVALID"));
        }
        cb(null, true);
    }
});

const uploadReport = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") return next(new AiError("AI_FILE_TOO_LARGE"));
            return next(new AiError("AI_FILE_INVALID", "Upload exactly one report file in the 'file' field."));
        }
        next(err);
    });
};

router.use(authMiddleware);

// Chat & conversations
router.post("/chat", validateBody(chatSchema), controller.chat);
router.get("/usage", controller.myUsage);
router.get("/conversations", validateQuery(paginationSchema), controller.listConversations);
router.get("/conversations/:id", validateIdParam, validateQuery(paginationSchema.extend({})), controller.getConversation);
router.patch("/conversations/:id", validateIdParam, validateBody(renameConversationSchema), controller.renameConversation);
router.delete("/conversations/:id/messages", validateIdParam, controller.clearMessages);
router.delete("/conversations/:id", validateIdParam, controller.deleteConversation);

// Reports
router.post("/reports/summarize", uploadReport, controller.summarizeReport);
router.get("/reports", validateQuery(paginationSchema), controller.listReports);
router.get("/reports/:id", controller.getReport);
router.delete("/reports/:id", controller.deleteReport);
router.post("/reports/:id/questions", validateBody(reportQuestionSchema), controller.askReportQuestion);

module.exports = router;
