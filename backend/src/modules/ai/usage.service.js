/**
 * AI usage limits and tracking.
 * - Per-minute rate limit: cache counter (Redis when available, in-memory fallback)
 * - Daily per-user limit: counted from AI_USAGE_LOGS so it survives restarts
 */
const { Op, fn, col, literal } = require("sequelize");
const { AiUsageLog, User } = require("../../models");
const { incrCounter } = require("../../utils/cache");
const { getAiConfig } = require("./ai.config");
const { AiError } = require("./ai.errors");

function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function logUsage({ userId = null, feature, model = null, usage = {}, status, errorCode = null }) {
    try {
        await AiUsageLog.create({
            userId,
            feature,
            model,
            inputTokens: usage.inputTokens || 0,
            outputTokens: usage.outputTokens || 0,
            status,
            errorCode
        });
    } catch (err) {
        // Usage logging must never break the user request
        console.warn("AI usage log write failed:", err.message);
    }
}

/**
 * Throws AiError(429) when the user exceeds the per-minute or daily limit.
 * @param {number|string} userId
 * @param {"CHAT"|"REPORT_SUMMARY"|"REPORT_QUESTION"} feature
 */
async function assertWithinLimits(userId, feature) {
    const config = getAiConfig();

    const minuteBucket = Math.floor(Date.now() / 60000);
    const minuteCount = await incrCounter(`ai:rate:${userId}:${minuteBucket}`, 70);
    if (minuteCount > config.ratePerMinute) {
        await logUsage({ userId, feature, status: "LIMITED", errorCode: "AI_RATE_LIMIT_USER" });
        throw new AiError("AI_RATE_LIMIT_USER");
    }

    const since = startOfToday();
    const isReport = feature === "REPORT_SUMMARY";
    const where = {
        userId,
        status: "SUCCESS",
        createdAt: { [Op.gte]: since },
        feature: isReport ? "REPORT_SUMMARY" : { [Op.in]: ["CHAT", "REPORT_QUESTION"] }
    };
    const used = await AiUsageLog.count({ where });
    const limit = isReport ? config.dailyReportLimit : config.dailyUserLimit;

    if (used >= limit) {
        await logUsage({ userId, feature, status: "LIMITED", errorCode: "AI_LIMIT_REACHED" });
        throw new AiError(
            "AI_LIMIT_REACHED",
            isReport
                ? `You have reached the daily limit of ${limit} report uploads. Please try again tomorrow.`
                : `You have reached the daily limit of ${limit} AI requests. Please try again tomorrow.`
        );
    }

    return { used, limit, remaining: Math.max(limit - used - 1, 0) };
}

async function getMyUsage(userId) {
    const config = getAiConfig();
    const since = startOfToday();
    const base = { userId, status: "SUCCESS", createdAt: { [Op.gte]: since } };
    const [chatUsed, reportsUsed] = await Promise.all([
        AiUsageLog.count({ where: { ...base, feature: { [Op.in]: ["CHAT", "REPORT_QUESTION"] } } }),
        AiUsageLog.count({ where: { ...base, feature: "REPORT_SUMMARY" } })
    ]);
    return {
        chat: { used: chatUsed, limit: config.dailyUserLimit },
        reports: { used: reportsUsed, limit: config.dailyReportLimit }
    };
}

/**
 * Admin usage overview for the last N days.
 */
async function getUsageOverview(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where = { createdAt: { [Op.gte]: since } };

    const [byFeature, byDay, topUsers, errors] = await Promise.all([
        AiUsageLog.findAll({
            where,
            attributes: [
                "feature",
                "status",
                [fn("COUNT", col("id")), "requests"],
                [fn("SUM", col("input_tokens")), "inputTokens"],
                [fn("SUM", col("output_tokens")), "outputTokens"]
            ],
            group: ["feature", "status"],
            raw: true
        }),
        AiUsageLog.findAll({
            where,
            attributes: [
                [fn("DATE", col("created_at")), "day"],
                [fn("COUNT", col("id")), "requests"],
                [fn("SUM", literal("input_tokens + output_tokens")), "tokens"]
            ],
            group: [fn("DATE", col("created_at"))],
            order: [[fn("DATE", col("created_at")), "ASC"]],
            raw: true
        }),
        AiUsageLog.findAll({
            where: { ...where, userId: { [Op.ne]: null } },
            attributes: [
                "userId",
                [fn("COUNT", col("AiUsageLog.id")), "requests"],
                [fn("SUM", literal("input_tokens + output_tokens")), "tokens"]
            ],
            include: [{ model: User, as: "user", attributes: ["name", "email"] }],
            group: ["userId", "user.id"],
            order: [[literal("requests"), "DESC"]],
            limit: 10
        }),
        AiUsageLog.findAll({
            where: { ...where, status: { [Op.in]: ["ERROR", "LIMITED"] } },
            attributes: ["errorCode", [fn("COUNT", col("id")), "count"]],
            group: ["errorCode"],
            raw: true
        })
    ]);

    const toNum = (v) => Number(v || 0);
    const totals = byFeature.reduce(
        (acc, row) => {
            acc.requests += toNum(row.requests);
            acc.inputTokens += toNum(row.inputTokens);
            acc.outputTokens += toNum(row.outputTokens);
            return acc;
        },
        { requests: 0, inputTokens: 0, outputTokens: 0 }
    );

    return {
        days,
        totals,
        byFeature: byFeature.map((r) => ({ ...r, requests: toNum(r.requests), inputTokens: toNum(r.inputTokens), outputTokens: toNum(r.outputTokens) })),
        byDay: byDay.map((r) => ({ day: r.day, requests: toNum(r.requests), tokens: toNum(r.tokens) })),
        topUsers: topUsers.map((r) => ({
            userId: r.userId,
            name: r.user?.name || null,
            email: r.user?.email || null,
            requests: toNum(r.get("requests")),
            tokens: toNum(r.get("tokens"))
        })),
        errors: errors.map((r) => ({ errorCode: r.errorCode, count: toNum(r.count) })),
        limits: (() => {
            const c = getAiConfig();
            return { dailyUserLimit: c.dailyUserLimit, dailyReportLimit: c.dailyReportLimit, ratePerMinute: c.ratePerMinute };
        })()
    };
}

module.exports = {
    assertWithinLimits,
    logUsage,
    getMyUsage,
    getUsageOverview
};
