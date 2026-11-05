/**
 * Medical report upload, structured AI summarization and grounded follow-up questions.
 * Files are processed in memory and never written to disk or stored in MySQL.
 */
const crypto = require("crypto");
const { z } = require("zod");
const { AiReport, User } = require("../../models");
const notificationsService = require("../notifications/notifications.service");
const { EVENT_TYPES } = require("../notifications/notification.constants");
const gemini = require("./gemini.client");
const {
    REPORT_SUMMARY_INSTRUCTION,
    REPORT_QUESTION_INSTRUCTION,
    REPORT_SUMMARY_JSON_SCHEMA,
    wrapUntrusted
} = require("./ai.prompts");
const { REPORT_DISCLAIMER, EMERGENCY_NOTICE, detectEmergency, redactIdentifiers, sanitizeFileName } = require("./ai.safety");
const { assertWithinLimits, logUsage } = require("./usage.service");
const { getAiConfig } = require("./ai.config");
const { AiError } = require("./ai.errors");

const ALLOWED_TYPES = {
    "application/pdf": { label: "PDF", extensions: ["pdf"] },
    "image/png": { label: "PNG", extensions: ["png"] },
    "image/jpeg": { label: "JPEG", extensions: ["jpg", "jpeg"] }
};

const STALE_PROCESSING_MS = 5 * 60 * 1000;

/**
 * Detect the real file type from magic bytes (not the filename or client MIME type).
 * @param {Buffer} buffer
 * @returns {"application/pdf"|"image/png"|"image/jpeg"|null}
 */
function detectFileType(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 8) return null;
    // PDF: "%PDF-" possibly after a small preamble (spec allows up to 1024 bytes)
    const head = buffer.subarray(0, 1024).toString("latin1");
    if (head.startsWith("%PDF-") || (head.indexOf("%PDF-") > -1 && head.indexOf("%PDF-") < 1024)) {
        return "application/pdf";
    }
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return "image/png";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg";
    }
    return null;
}

/**
 * Validate an uploaded file (multer memory file object).
 * @returns {{ mimeType: string, fileName: string, size: number }}
 */
function validateUpload(file) {
    const { reportMaxBytes } = getAiConfig();
    if (!file || !file.buffer) throw new AiError("AI_FILE_INVALID", "No report file was uploaded");
    if (file.size === 0 || file.buffer.length === 0) throw new AiError("AI_FILE_EMPTY");
    if (file.buffer.length > reportMaxBytes) {
        throw new AiError("AI_FILE_TOO_LARGE", `File is too large (maximum ${Math.round(reportMaxBytes / 1048576)} MB).`);
    }

    const detected = detectFileType(file.buffer);
    if (!detected) throw new AiError("AI_FILE_INVALID");

    const fileName = sanitizeFileName(file.originalname);
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_TYPES[detected].extensions.includes(ext)) {
        throw new AiError("AI_FILE_INVALID", "The file extension does not match the file content.");
    }
    if (file.mimetype && ALLOWED_TYPES[file.mimetype] && file.mimetype !== detected) {
        throw new AiError("AI_FILE_INVALID", "The file type does not match the file content.");
    }
    if (detected === "application/pdf" && !file.buffer.subarray(-2048).toString("latin1").includes("%%EOF")) {
        throw new AiError("AI_FILE_INVALID", "The PDF appears to be incomplete or corrupted.");
    }

    return { mimeType: detected, fileName, size: file.buffer.length };
}

const nullableText = z.union([z.string(), z.number()]).nullable().optional()
    .transform((v) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim()));

const summaryOutputSchema = z.object({
    isReadable: z.boolean(),
    reportTitle: nullableText,
    reportDate: nullableText,
    summary: z.string().trim().min(1),
    observations: z.array(z.object({
        parameter: z.string().trim().min(1),
        reportedValue: nullableText,
        unit: nullableText,
        referenceRange: nullableText,
        documentFlag: nullableText,
        uncertain: z.boolean().optional().default(false),
        explanation: z.string().trim().optional().default("")
    })).max(200).default([]),
    termsExplained: z.array(z.object({
        term: z.string().trim().min(1),
        explanation: z.string().trim().min(1)
    })).max(50).default([]),
    questionsForDoctor: z.array(z.string().trim().min(1)).max(20).default([]),
    limitations: z.array(z.string().trim().min(1)).max(20).default([])
});

function parseJsonLoose(text) {
    const trimmed = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    return JSON.parse(trimmed);
}

/**
 * Validate and normalise model JSON into the public summary format.
 * Throws AiError(AI_BAD_RESPONSE) on malformed output.
 */
function validateSummaryOutput(text) {
    let raw;
    try {
        raw = parseJsonLoose(text);
    } catch {
        throw new AiError("AI_BAD_RESPONSE");
    }
    const parsed = summaryOutputSchema.safeParse(raw);
    if (!parsed.success) throw new AiError("AI_BAD_RESPONSE");

    const data = parsed.data;
    const scrub = (v) => (v === null ? null : redactIdentifiers(v));

    return {
        isReadable: data.isReadable,
        reportTitle: scrub(data.reportTitle),
        reportDate: data.reportDate,
        summary: redactIdentifiers(data.summary),
        observations: data.observations.map((o) => ({
            parameter: o.parameter,
            reportedValue: o.reportedValue,
            unit: o.unit,
            referenceRange: o.referenceRange,
            documentFlag: o.documentFlag,
            uncertain: o.uncertain || o.reportedValue === null,
            explanation: redactIdentifiers(o.explanation)
        })),
        termsExplained: data.termsExplained.map((t) => ({ term: t.term, explanation: redactIdentifiers(t.explanation) })),
        questionsForDoctor: data.questionsForDoctor.map(redactIdentifiers),
        limitations: data.limitations.map(redactIdentifiers),
        disclaimer: REPORT_DISCLAIMER
    };
}

function toPublicReport(report, { includeSummary = true } = {}) {
    return {
        id: report.publicId,
        fileName: report.fileName,
        fileType: report.fileType,
        fileSize: report.fileSize,
        status: report.processingStatus,
        errorMessage: report.errorMessage,
        reportTitle: report.summaryJson?.reportTitle || null,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        ...(includeSummary ? { summary: report.summaryJson || null } : {})
    };
}

async function findOwnedReport(userId, publicId) {
    if (!z.string().uuid().safeParse(publicId).success) {
        throw new AiError("AI_NOT_FOUND", "Report not found");
    }
    const report = await AiReport.findOne({ where: { publicId, userId } });
    if (!report) throw new AiError("AI_NOT_FOUND", "Report not found");
    return report;
}

/**
 * Upload + summarize a report.
 * @returns {Promise<{ report: object, duplicate: boolean }>}
 */
async function summarizeReport(userId, file) {
    const { mimeType, fileName, size } = validateUpload(file);
    if (!gemini.isConfigured()) throw new AiError("AI_NOT_CONFIGURED");
    const fileHash = crypto.createHash("sha256").update(file.buffer).digest("hex");

    // Deduplicate per user
    let report = await AiReport.findOne({ where: { userId, fileHash } });
    if (report?.processingStatus === "COMPLETED") {
        return { report: toPublicReport(report), duplicate: true };
    }
    if (report?.processingStatus === "PROCESSING" && Date.now() - new Date(report.updatedAt).getTime() < STALE_PROCESSING_MS) {
        throw new AiError("AI_REPORT_NOT_READY", "This report is already being processed.");
    }

    await assertWithinLimits(userId, "REPORT_SUMMARY");

    if (report) {
        await report.update({ processingStatus: "PROCESSING", errorMessage: null, fileName, summaryJson: null });
    } else {
        try {
            report = await AiReport.create({
                publicId: crypto.randomUUID(),
                userId,
                fileName,
                fileType: mimeType,
                fileSize: size,
                fileHash,
                processingStatus: "PROCESSING"
            });
        } catch (err) {
            if (err.name === "SequelizeUniqueConstraintError") {
                throw new AiError("AI_REPORT_NOT_READY", "This report is already being processed.");
            }
            throw err;
        }
    }

    const { reportTimeoutMs } = getAiConfig();
    let result;
    try {
        result = await gemini.generate({
            systemInstruction: REPORT_SUMMARY_INSTRUCTION,
            responseJsonSchema: REPORT_SUMMARY_JSON_SCHEMA,
            timeoutMs: reportTimeoutMs,
            fallbackTimeoutMs: 40000,
            maxOutputTokens: Math.max(getAiConfig().maxOutputTokens, 8192),
            contents: [{
                role: "user",
                parts: [
                    { inlineData: { mimeType, data: file.buffer.toString("base64") } },
                    { text: "Extract and explain this medical report following the rules. Respond with JSON only." }
                ]
            }]
        });
    } catch (err) {
        await report.update({ processingStatus: "FAILED", errorMessage: (err.message || "Processing failed").slice(0, 250) });
        await logUsage({ userId, feature: "REPORT_SUMMARY", status: "ERROR", errorCode: err.code || "AI_UNAVAILABLE" });
        throw err;
    }

    let summary;
    try {
        summary = validateSummaryOutput(result.text);
        if (!summary.isReadable && summary.observations.length === 0) {
            throw new AiError("AI_REPORT_UNREADABLE");
        }
    } catch (err) {
        const safe = err.code ? err : new AiError("AI_BAD_RESPONSE");
        await report.update({ processingStatus: "FAILED", errorMessage: safe.message.slice(0, 250) });
        await logUsage({ userId, feature: "REPORT_SUMMARY", model: result.model, usage: result.usage, status: "ERROR", errorCode: safe.code });
        throw safe;
    }

    await report.update({ processingStatus: "COMPLETED", summaryJson: summary, errorMessage: null });
    await logUsage({ userId, feature: "REPORT_SUMMARY", model: result.model, usage: result.usage, status: "SUCCESS" });

    // Phase 7: Trigger AI Report Ready Notification
    try {
        const user = await User.findByPk(userId);
        const outbox = await notificationsService.createOutboxEvent(EVENT_TYPES.AI_REPORT_READY, {
            userId,
            userName: user?.name,
            email: user?.email,
            fileName: report.fileName,
            observationCount: summary.observations?.length || 0,
            reportUrl: `/dashboard/ai-assistant/reports/${report.id}`
        });
        await notificationsService.dispatchOutboxEvent(outbox.id);
    } catch (notifErr) {
        console.warn("AI Report ready notification notice:", notifErr.message);
    }

    return { report: toPublicReport(report), duplicate: false };
}

async function listReports(userId, { page = 1, limit = 20 } = {}) {
    const { count, rows } = await AiReport.findAndCountAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        offset: (page - 1) * limit,
        limit
    });
    return {
        reports: rows.map((r) => toPublicReport(r, { includeSummary: false })),
        pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) || 1 }
    };
}

async function getReport(userId, publicId) {
    return toPublicReport(await findOwnedReport(userId, publicId));
}

async function deleteReport(userId, publicId) {
    const report = await findOwnedReport(userId, publicId);
    await report.destroy();
    return { id: publicId };
}

/**
 * Ask a follow-up question grounded only in the selected report's summary.
 */
async function askQuestion(userId, publicId, question) {
    const { maxInputChars } = getAiConfig();
    const text = String(question || "").trim();
    if (!text) throw new AiError("AI_INPUT_TOO_LONG", "Question cannot be empty");
    if (text.length > maxInputChars) throw new AiError("AI_INPUT_TOO_LONG");

    const report = await findOwnedReport(userId, publicId);
    if (report.processingStatus !== "COMPLETED" || !report.summaryJson) {
        throw new AiError("AI_REPORT_NOT_READY");
    }

    if (!gemini.isConfigured()) throw new AiError("AI_NOT_CONFIGURED");
    await assertWithinLimits(userId, "REPORT_QUESTION");

    const { disclaimer, ...reportData } = report.summaryJson;
    const safeQuestion = redactIdentifiers(text);

    let result;
    try {
        result = await gemini.generate({
            systemInstruction: REPORT_QUESTION_INSTRUCTION,
            contents: [{
                role: "user",
                parts: [{ text: `${wrapUntrusted("user_report_extracted_by_ai", reportData)}\n\nPatient question:\n${safeQuestion}` }]
            }]
        });
    } catch (err) {
        await logUsage({ userId, feature: "REPORT_QUESTION", status: "ERROR", errorCode: err.code || "AI_UNAVAILABLE" });
        throw err;
    }

    let answer = (result.text || "").trim();
    if (!answer) {
        await logUsage({ userId, feature: "REPORT_QUESTION", model: result.model, usage: result.usage, status: "ERROR", errorCode: "AI_BAD_RESPONSE" });
        throw new AiError("AI_BAD_RESPONSE");
    }
    if (detectEmergency(text)) {
        answer = `**${EMERGENCY_NOTICE}**\n\n${answer}`;
    }

    await logUsage({ userId, feature: "REPORT_QUESTION", model: result.model, usage: result.usage, status: "SUCCESS" });

    return { reportId: publicId, question: safeQuestion, answer, disclaimer: REPORT_DISCLAIMER };
}

module.exports = {
    ALLOWED_TYPES,
    detectFileType,
    validateUpload,
    validateSummaryOutput,
    summarizeReport,
    listReports,
    getReport,
    deleteReport,
    askQuestion
};
