const chatService = require("./chat.service");
const reportsService = require("./reports.service");
const usageService = require("./usage.service");

const handle = (fn) => async (req, res, next) => {
    try {
        await fn(req, res);
    } catch (error) {
        next(error);
    }
};

// Chat
exports.chat = handle(async (req, res) => {
    const data = await chatService.sendMessage(req.user.id, req.body);
    res.json({ success: true, data });
});

exports.listConversations = handle(async (req, res) => {
    const result = await chatService.listConversations(req.user.id, req.validatedQuery);
    res.json({ success: true, data: result.conversations, pagination: result.pagination });
});

exports.getConversation = handle(async (req, res) => {
    const result = await chatService.getConversation(req.user.id, req.params.id, req.validatedQuery);
    res.json({ success: true, data: result });
});

exports.renameConversation = handle(async (req, res) => {
    const data = await chatService.renameConversation(req.user.id, req.params.id, req.body.title);
    res.json({ success: true, message: "Conversation renamed", data });
});

exports.deleteConversation = handle(async (req, res) => {
    const data = await chatService.deleteConversation(req.user.id, req.params.id);
    res.json({ success: true, message: "Conversation deleted", data });
});

exports.clearMessages = handle(async (req, res) => {
    const data = await chatService.clearMessages(req.user.id, req.params.id);
    res.json({ success: true, message: "Conversation cleared", data });
});

exports.myUsage = handle(async (req, res) => {
    const data = await usageService.getMyUsage(req.user.id);
    res.json({ success: true, data });
});

// Reports
exports.summarizeReport = handle(async (req, res) => {
    const { report, duplicate } = await reportsService.summarizeReport(req.user.id, req.file);
    res.status(duplicate ? 200 : 201).json({
        success: true,
        message: duplicate ? "This report was already summarized" : "Report summarized",
        duplicate,
        data: report
    });
});

exports.listReports = handle(async (req, res) => {
    const result = await reportsService.listReports(req.user.id, req.validatedQuery);
    res.json({ success: true, data: result.reports, pagination: result.pagination });
});

exports.getReport = handle(async (req, res) => {
    const data = await reportsService.getReport(req.user.id, req.params.id);
    res.json({ success: true, data });
});

exports.deleteReport = handle(async (req, res) => {
    const data = await reportsService.deleteReport(req.user.id, req.params.id);
    res.json({ success: true, message: "Report deleted", data });
});

exports.askReportQuestion = handle(async (req, res) => {
    const data = await reportsService.askQuestion(req.user.id, req.params.id, req.body.question);
    res.json({ success: true, data });
});
