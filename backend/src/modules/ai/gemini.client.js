/**
 * Reusable Gemini client (official @google/genai SDK).
 * - Lazily initialised from backend env vars (never exposed to the frontend)
 * - Per-request timeout via AbortController
 * - Bounded exponential backoff with jitter for retryable failures only
 * - Safe error mapping (see ai.errors.js)
 * - Injectable for tests via setGeminiClientForTesting()
 */
const { getAiConfig } = require("./ai.config");
const { AiError, mapProviderError } = require("./ai.errors");

let client = null;
let clientKey = null;
let testClient = null;

function getClient() {
    if (testClient) return testClient;

    const { apiKey } = getAiConfig();
    if (!apiKey) {
        throw new AiError("AI_NOT_CONFIGURED");
    }
    if (!client || clientKey !== apiKey) {
        const { GoogleGenAI } = require("@google/genai");
        client = new GoogleGenAI({ apiKey });
        clientKey = apiKey;
    }
    return client;
}

function setGeminiClientForTesting(mock, { resetHealth = true } = {}) {
    testClient = mock;
    if (resetHealth) modelCooldownUntil.clear();
}

function isConfigured() {
    return Boolean(testClient || getAiConfig().apiKey);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a provider call with timeout + bounded exponential backoff.
 * @param {(signal: AbortSignal) => Promise<any>} fn
 * @param {{ timeoutMs?: number, maxRetries?: number, baseDelayMs?: number }} options
 */
async function withRetry(fn, options = {}) {
    const config = getAiConfig();
    const timeoutMs = options.timeoutMs || config.requestTimeoutMs;
    const maxRetries = options.maxRetries ?? config.maxRetries;
    const baseDelayMs = options.baseDelayMs ?? 500;

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fn(controller.signal);
        } catch (err) {
            lastError = controller.signal.aborted ? new AiError("AI_TIMEOUT") : mapProviderError(err);
            if (!lastError.retryable || attempt === maxRetries) {
                break;
            }
            const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * baseDelayMs);
            await sleep(delay);
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastError;
}

function extractUsage(response) {
    const usage = response?.usageMetadata || {};
    return {
        inputTokens: Number(usage.promptTokenCount || 0),
        outputTokens: Number(usage.candidatesTokenCount || 0) + Number(usage.thoughtsTokenCount || 0)
    };
}

// Per-model failures: another model may still work (free-tier quotas are per model)
const FALLBACK_CODES = new Set(["AI_UNAVAILABLE", "AI_RATE_LIMITED", "AI_TIMEOUT", "AI_MODEL_UNSUPPORTED", "AI_QUOTA"]);

// In-memory model health: models that just failed are tried last until their cooldown ends
const modelCooldownUntil = new Map();

function orderModels(models) {
    const now = Date.now();
    const healthy = models.filter((m) => !(modelCooldownUntil.get(m) > now));
    const cooling = models.filter((m) => modelCooldownUntil.get(m) > now);
    return [...healthy, ...cooling];
}

function markModelFailed(model) {
    modelCooldownUntil.set(model, Date.now() + getAiConfig().modelCooldownMs);
}

function markModelHealthy(model) {
    modelCooldownUntil.delete(model);
}
const MAX_TOKEN_CAP = 8192;

function getText(response) {
    try {
        return response?.text || "";
    } catch {
        return "";
    }
}

/**
 * Safe one-line provider failure log: model, HTTP status and Google status only.
 * Never includes prompts, report content or credentials.
 */
function logProviderFailure(model, err, next) {
    const status = err.providerStatus || err.code;
    console.warn(`Gemini ${model} failed: ${status}${next ? `, trying fallback '${next}'` : ""}`);
}

/**
 * Generate content.
 * Tries GEMINI_MODEL, then GEMINI_FALLBACK_MODELS in order when a model is overloaded,
 * rate limited, timed out or unsupported. Auth/quota/blocked errors stop immediately.
 * If a model spends its whole output budget on thinking (empty text, MAX_TOKENS),
 * retries once on the same model with a larger budget.
 *
 * @param {{ contents: any, systemInstruction?: string, tools?: any[], responseJsonSchema?: object, timeoutMs?: number, maxOutputTokens?: number }} params
 * @returns {Promise<{ response: any, text: string, functionCalls: any[], usage: {inputTokens:number, outputTokens:number}, model: string }>}
 */
async function generate(params) {
    const config = getAiConfig();
    const ai = getClient();
    const models = orderModels([...new Set([config.model, ...config.fallbackModels].filter(Boolean))]);
    const baseTimeoutMs = params.timeoutMs || config.requestTimeoutMs;

    const callModel = (model, maxOutputTokens, maxRetries, timeoutMs) =>
        withRetry(
            (signal) =>
                ai.models.generateContent({
                    model,
                    contents: params.contents,
                    config: {
                        abortSignal: signal,
                        systemInstruction: params.systemInstruction,
                        temperature: config.temperature,
                        maxOutputTokens,
                        ...(params.tools ? { tools: params.tools } : {}),
                        ...(params.responseJsonSchema
                            ? { responseMimeType: "application/json", responseJsonSchema: params.responseJsonSchema }
                            : {})
                    }
                }),
            { timeoutMs, maxRetries }
        );

    let lastError;
    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        const hasFallback = i < models.length - 1;
        try {
            // With a fallback available, a struggling model costs one bounded attempt, not several
            const timeoutMs = hasFallback
                ? Math.min(baseTimeoutMs, params.fallbackTimeoutMs || config.fallbackTimeoutMs)
                : baseTimeoutMs;
            let budget = params.maxOutputTokens || config.maxOutputTokens;
            let response = await callModel(model, budget, hasFallback ? 0 : undefined, timeoutMs);
            let usage = extractUsage(response);

            const finishReason = response?.candidates?.[0]?.finishReason;
            if (!getText(response) && !response?.functionCalls?.length && finishReason === "MAX_TOKENS" && budget < MAX_TOKEN_CAP) {
                budget = Math.min(budget * 2, MAX_TOKEN_CAP);
                response = await callModel(model, budget, 0, timeoutMs);
                const retryUsage = extractUsage(response);
                usage = {
                    inputTokens: usage.inputTokens + retryUsage.inputTokens,
                    outputTokens: usage.outputTokens + retryUsage.outputTokens
                };
            }

            if (response?.promptFeedback?.blockReason) {
                throw new AiError("AI_BLOCKED");
            }

            markModelHealthy(model);
            return {
                response,
                text: getText(response),
                functionCalls: response?.functionCalls || [],
                usage,
                model
            };
        } catch (err) {
            lastError = err instanceof AiError ? err : mapProviderError(err);
            if (FALLBACK_CODES.has(lastError.code)) markModelFailed(model);
            const next = hasFallback && FALLBACK_CODES.has(lastError.code) ? models[i + 1] : null;
            logProviderFailure(model, lastError, next);
            if (!next) break;
        }
    }
    throw lastError;
}

/**
 * Generate embeddings for one or more texts.
 * Uses ONLY the configured embedding model: vectors from different models are not
 * comparable, so silently switching models would corrupt vector search.
 * @param {string[]} texts
 * @param {"RETRIEVAL_DOCUMENT"|"RETRIEVAL_QUERY"} taskType
 * @returns {Promise<number[][]>}
 */
async function embed(texts, taskType = "RETRIEVAL_DOCUMENT") {
    const config = getAiConfig();
    const ai = getClient();

    let response;
    try {
        response = await withRetry((signal) =>
            ai.models.embedContent({
                model: config.embeddingModel,
                contents: texts,
                config: {
                    abortSignal: signal,
                    taskType,
                    outputDimensionality: config.embeddingDimensions
                }
            })
        );
    } catch (err) {
        logProviderFailure(config.embeddingModel, err, null);
        throw err;
    }

    const vectors = (response?.embeddings || []).map((e) => e?.values || []);
    if (vectors.length !== texts.length || vectors.some((v) => !Array.isArray(v) || v.length === 0)) {
        throw new AiError("AI_BAD_RESPONSE");
    }
    return vectors;
}

module.exports = {
    generate,
    embed,
    withRetry,
    isConfigured,
    setGeminiClientForTesting
};
