const knowledgeService = require("./knowledge.service");
const usageService = require("./usage.service");

const handle = (fn) => async (req, res, next) => {
    try {
        await fn(req, res);
    } catch (error) {
        next(error);
    }
};

exports.listKnowledge = handle(async (req, res) => {
    const result = await knowledgeService.listDocuments(req.validatedQuery);
    res.json({ success: true, data: result.documents, retrievalMode: result.retrievalMode, pagination: result.pagination });
});

exports.getKnowledge = handle(async (req, res) => {
    const data = await knowledgeService.getDocument(req.params.id);
    res.json({ success: true, data });
});

exports.createKnowledge = handle(async (req, res) => {
    const data = await knowledgeService.createDocument(req.body, req.user.id);
    res.status(201).json({ success: true, message: "Knowledge document created. Index it to make it searchable.", data });
});

exports.updateKnowledge = handle(async (req, res) => {
    const data = await knowledgeService.updateDocument(req.params.id, req.body);
    res.json({ success: true, message: "Knowledge document updated", data });
});

exports.deleteKnowledge = handle(async (req, res) => {
    const data = await knowledgeService.deleteDocument(req.params.id);
    res.json({ success: true, message: "Knowledge document deleted", data });
});

exports.indexKnowledge = handle(async (req, res) => {
    const { document, skipped } = await knowledgeService.indexDocument(req.params.id, req.body || {});
    const plain = document.toJSON();
    delete plain.content;
    res.json({
        success: true,
        message: skipped ? "Document is already indexed and unchanged" : "Document indexed",
        skipped,
        data: plain
    });
});

exports.usageOverview = handle(async (req, res) => {
    const data = await usageService.getUsageOverview(req.validatedQuery.days);
    res.json({ success: true, data });
});
