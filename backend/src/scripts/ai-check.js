/**
 * HealthSync AI — Gemini / RAG configuration check.
 * Usage: npm run ai:check
 *
 * Pings each configured chat model and the embedding model with a tiny request and
 * prints status + latency. Never prints the API key.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env"), quiet: true });
const { getAiConfig } = require("../modules/ai/ai.config");
const { mapProviderError } = require("../modules/ai/ai.errors");

async function timed(fn) {
    const start = Date.now();
    try {
        const value = await fn();
        return { ok: true, value, ms: Date.now() - start };
    } catch (err) {
        return { ok: false, err, ms: Date.now() - start };
    }
}

async function main() {
    const config = getAiConfig();
    console.log("=== HealthSync AI — Gemini configuration check ===\n");

    if (!config.apiKey) {
        console.log("✗ GEMINI_API_KEY is not set in backend/.env");
        process.exit(1);
    }
    console.log(`✓ GEMINI_API_KEY is set (${config.apiKey.length} characters, not shown)`);

    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    let chatOk = false;

    const models = [...new Set([config.model, ...config.fallbackModels])];
    console.log(`\nChat models (primary first): ${models.join(", ")}`);
    for (const model of models) {
        const result = await timed(async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
            try {
                return await ai.models.generateContent({
                    model,
                    contents: "Reply with the single word OK.",
                    config: { abortSignal: controller.signal, maxOutputTokens: 512 }
                });
            } finally {
                clearTimeout(timer);
            }
        });
        if (result.ok) {
            chatOk = true;
            const text = (result.value?.text || "").trim();
            console.log(`  ✓ ${model} — ${result.ms} ms${text ? "" : " (empty reply: model may need a larger output budget)"}`);
        } else {
            const mapped = mapProviderError(result.err);
            console.log(`  ✗ ${model} — ${mapped.providerStatus} → ${mapped.code} (${result.ms} ms)`);
        }
    }

    console.log(`\nEmbedding model: ${config.embeddingModel} (${config.embeddingDimensions} dimensions)`);
    const embedResult = await timed(() =>
        ai.models.embedContent({
            model: config.embeddingModel,
            contents: ["HbA1c test"],
            config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: config.embeddingDimensions }
        })
    );
    if (embedResult.ok) {
        console.log(`  ✓ ${config.embeddingModel} — ${embedResult.value.embeddings?.[0]?.values?.length} dimensions, ${embedResult.ms} ms`);
    } else {
        const mapped = mapProviderError(embedResult.err);
        console.log(`  ✗ ${config.embeddingModel} — ${mapped.providerStatus} → ${mapped.code}`);
    }

    console.log("\nRetrieval:");
    if (!config.qdrantUrl) {
        console.log("  • QDRANT_URL not set → keyword retrieval (MySQL full-text), not semantic vector search");
    } else {
        const qdrant = await timed(async () => {
            const res = await fetch(`${config.qdrantUrl}/collections`, {
                headers: config.qdrantApiKey ? { "api-key": config.qdrantApiKey } : {},
                signal: AbortSignal.timeout(5000)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        });
        console.log(
            qdrant.ok
                ? `  ✓ Qdrant reachable at ${config.qdrantUrl} (${qdrant.ms} ms) → vector retrieval`
                : `  ✗ Qdrant at ${config.qdrantUrl} unreachable (${qdrant.err.message}) → chat falls back to keyword retrieval`
        );
    }

    console.log(`\n${chatOk ? "✓ At least one chat model is working." : "✗ No chat model is currently working."}`);
    process.exit(chatOk ? 0 : 1);
}

main();
