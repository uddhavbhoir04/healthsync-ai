/**
 * Safe, typed AI errors. Messages are user-facing and never contain raw provider
 * errors, prompts, or medical content (the global error handler logs err.message).
 */
const ERROR_DEFINITIONS = {
    AI_NOT_CONFIGURED: { status: 503, message: "The AI assistant is not configured on the server." },
    AI_AUTH: { status: 503, message: "The AI service rejected the server credentials. Please contact support." },
    AI_MODEL_UNSUPPORTED: { status: 503, message: "The configured AI model is unavailable. Please contact support." },
    AI_RATE_LIMITED: { status: 429, message: "The AI service is busy right now. Please try again in a moment." },
    AI_QUOTA: { status: 503, message: "The AI service quota has been exhausted. Please try again later." },
    AI_TIMEOUT: { status: 504, message: "The AI service took too long to respond. Please try again." },
    AI_UNAVAILABLE: { status: 503, message: "The AI model is busy right now. Please try again in a minute." },
    AI_BAD_RESPONSE: { status: 502, message: "The AI returned an incomplete response. Please try again." },
    AI_BLOCKED: { status: 422, message: "The AI could not respond to this request. Please rephrase your question." },
    AI_LIMIT_REACHED: { status: 429, message: "You have reached your AI usage limit. Please try again later." },
    AI_RATE_LIMIT_USER: { status: 429, message: "You are sending requests too quickly. Please wait a minute and try again." },
    AI_INPUT_TOO_LONG: { status: 400, message: "Your message is too long." },
    AI_FILE_INVALID: { status: 400, message: "Unsupported or invalid file. Upload a PDF, JPG or PNG report." },
    AI_FILE_EMPTY: { status: 400, message: "The uploaded file is empty." },
    AI_FILE_TOO_LARGE: { status: 413, message: "The uploaded file is too large." },
    AI_REPORT_UNREADABLE: { status: 422, message: "We could not read this document. Upload a clearer copy of the report." },
    AI_REPORT_NOT_READY: { status: 409, message: "This report summary is not available." },
    AI_NOT_FOUND: { status: 404, message: "Not found." },
    AI_KNOWLEDGE_UNAVAILABLE: { status: 503, message: "The knowledge base is temporarily unavailable." }
};

class AiError extends Error {
    constructor(code, overrideMessage) {
        const def = ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS.AI_UNAVAILABLE;
        super(overrideMessage || def.message);
        this.name = "AiError";
        this.code = ERROR_DEFINITIONS[code] ? code : "AI_UNAVAILABLE";
        this.status = def.status;
        // Retryable provider failures (used by the backoff wrapper only)
        this.retryable = code === "AI_RATE_LIMITED" || code === "AI_UNAVAILABLE" || code === "AI_TIMEOUT";
    }
}

/**
 * Map an @google/genai (or network) error to a safe AiError without leaking details.
 */
function mapProviderError(err) {
    if (err instanceof AiError) return err;
    const mapped = mapProviderErrorInner(err);
    // Server-side diagnostics only (never serialized to the client): e.g. "503 UNAVAILABLE"
    mapped.providerStatus = describeProviderStatus(err);
    return mapped;
}

function describeProviderStatus(err) {
    const httpStatus = Number(err?.status) || null;
    let googleStatus = null;
    try {
        googleStatus = JSON.parse(err?.message || "{}")?.error?.status || null;
    } catch {
        const match = String(err?.message || "").match(/\b(UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|PERMISSION_DENIED|UNAUTHENTICATED|INVALID_ARGUMENT|DEADLINE_EXCEEDED|INTERNAL)\b/);
        googleStatus = match ? match[1] : null;
    }
    if (err?.name === "AbortError" || /aborted/i.test(err?.message || "")) return "TIMEOUT";
    return [httpStatus, googleStatus].filter(Boolean).join(" ") || err?.cause?.code || "NETWORK_ERROR";
}

function mapProviderErrorInner(err) {

    if (err?.name === "AbortError" || err?.code === "ABORT_ERR" || /aborted|timed? ?out/i.test(err?.message || "")) {
        return new AiError("AI_TIMEOUT");
    }

    const status = Number(err?.status || err?.code || 0);
    const message = String(err?.message || "");

    if (status === 401 || status === 403 || /API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
        return new AiError("AI_AUTH");
    }
    if (status === 404 || /not found for API version|is not supported|models\/.* is not found/i.test(message)) {
        return new AiError("AI_MODEL_UNSUPPORTED");
    }
    if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message)) {
        // Daily/billing quota vs short-term rate limit
        if (/quota/i.test(message) && /(per day|daily|billing|exceeded your current quota)/i.test(message)) {
            return new AiError("AI_QUOTA");
        }
        return new AiError("AI_RATE_LIMITED");
    }
    if (status === 400 && /SAFETY|blocked/i.test(message)) {
        return new AiError("AI_BLOCKED");
    }
    if (status >= 500 || /ECONNRESET|ENOTFOUND|ECONNREFUSED|fetch failed|network/i.test(message)) {
        return new AiError("AI_UNAVAILABLE");
    }
    return new AiError("AI_UNAVAILABLE");
}

module.exports = { AiError, mapProviderError, ERROR_DEFINITIONS };
