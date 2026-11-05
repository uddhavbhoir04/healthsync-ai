/**
 * Phase 6 AI configuration. Read lazily so tests and runtime env changes are respected.
 * Credentials are read ONLY from backend environment variables.
 */
const num = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

function getAiConfig() {
    return {
        apiKey: process.env.GEMINI_API_KEY || "",
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        fallbackModels: (process.env.GEMINI_FALLBACK_MODELS || "")
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
        embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
        embeddingDimensions: num("GEMINI_EMBEDDING_DIMENSIONS", 768),
        maxOutputTokens: num("AI_MAX_OUTPUT_TOKENS", 2048),
        temperature: Number.isFinite(Number(process.env.AI_TEMPERATURE)) && process.env.AI_TEMPERATURE !== ""
            ? Number(process.env.AI_TEMPERATURE)
            : 0.3,
        requestTimeoutMs: num("AI_REQUEST_TIMEOUT_MS", 30000),
        reportTimeoutMs: num("AI_REPORT_TIMEOUT_MS", 90000),
        // Per-attempt timeout while another fallback model remains (keeps total latency bounded)
        fallbackTimeoutMs: num("AI_FALLBACK_TIMEOUT_MS", 15000),
        // How long a failing model is skipped before being tried first again
        modelCooldownMs: num("AI_MODEL_COOLDOWN_MS", 60000),
        maxRetries: (() => {
            const raw = process.env.AI_MAX_RETRIES;
            const value = Number(raw);
            return raw !== undefined && raw !== "" && Number.isInteger(value) && value >= 0 ? Math.min(value, 5) : 2;
        })(),
        dailyUserLimit: num("AI_DAILY_USER_LIMIT", 20),
        dailyReportLimit: num("AI_DAILY_REPORT_LIMIT", 5),
        ratePerMinute: num("AI_RATE_LIMIT_PER_MINUTE", 6),
        maxInputChars: num("AI_MAX_INPUT_CHARS", 4000),
        contextMessages: num("AI_CONTEXT_MESSAGES", 10),
        reportMaxBytes: num("AI_REPORT_MAX_MB", 10) * 1024 * 1024,
        ragTopK: num("RAG_TOP_K", 4),
        ragSimilarityThreshold: num("RAG_SIMILARITY_THRESHOLD", 0.65),
        qdrantUrl: (process.env.QDRANT_URL || "").replace(/\/+$/, ""),
        qdrantApiKey: process.env.QDRANT_API_KEY || "",
        qdrantCollection: process.env.QDRANT_COLLECTION || "healthsync_knowledge"
    };
}

module.exports = { getAiConfig };
