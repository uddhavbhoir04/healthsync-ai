/**
 * HealthSync AI — Phase 6 Test Suite (AI Assistant, Reports, RAG, Security)
 *
 * Part A: unit tests (no database, no network).
 * Part B: HTTP integration tests against the real Express app and MySQL database,
 *         with the Gemini client MOCKED (no API calls, no cost). Temporary users and
 *         data are created and removed. Skipped automatically if the DB is unreachable.
 *
 * Live Gemini verification is a separate manual smoke test (see README).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env"), quiet: true });

// Deterministic limits for tests (must be set before modules read config)
process.env.AI_MAX_RETRIES = "0";
process.env.AI_RATE_LIMIT_PER_MINUTE = "1000";
process.env.AI_DAILY_USER_LIMIT = "1000";
process.env.AI_DAILY_REPORT_LIMIT = "1000";
process.env.AI_REPORT_MAX_MB = "1";
process.env.AI_REQUEST_TIMEOUT_MS = "2000";
process.env.GEMINI_MODEL = "primary-test-model";
process.env.GEMINI_FALLBACK_MODELS = "fallback-test-model";
delete process.env.QDRANT_URL;

const assert = require("assert");
const crypto = require("crypto");

const gemini = require("../modules/ai/gemini.client");
const { AiError, mapProviderError } = require("../modules/ai/ai.errors");
const { detectEmergency, redactIdentifiers, sanitizeFileName } = require("../modules/ai/ai.safety");
const { detectFileType, validateUpload, validateSummaryOutput } = require("../modules/ai/reports.service");
const { chunkText } = require("../modules/ai/knowledge.service");
const retrieval = require("../modules/ai/retrieval");
const { executeTool } = require("../modules/ai/ai.tools");
const { chatSchema, knowledgeSchema } = require("../modules/ai/ai.validation");

console.log("=== Running HealthSync AI Phase 6 Test Suite ===\n");

let passed = 0;
let failed = 0;
let skipped = 0;

async function it(description, fn) {
    try {
        await fn();
        process.stdout.write(`  ✓ ${description}\n`);
        passed++;
    } catch (err) {
        process.stdout.write(`  ✗ ${description}\n`);
        process.stdout.write(`    ${err.stack?.split("\n").slice(0, 3).join("\n    ") || err.message}\n`);
        failed++;
    }
}

// ---------- Fixtures ----------
const SYNTHETIC_PDF = Buffer.from(
    "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n% Synthetic CBC report for tests\ntrailer << /Root 1 0 R >>\n%%EOF\n",
    "latin1"
);
const SYNTHETIC_PNG = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    crypto.randomBytes(64)
]);
const VALID_SUMMARY = {
    isReadable: true,
    reportTitle: "Complete Blood Count",
    reportDate: null,
    summary: "This synthetic report contains blood cell measurements.",
    observations: [
        {
            parameter: "Hemoglobin",
            reportedValue: "12.5",
            unit: "g/dL",
            referenceRange: "13.0 - 17.0",
            documentFlag: "L",
            uncertain: false,
            explanation: "Hemoglobin is the oxygen-carrying protein in red blood cells."
        },
        {
            parameter: "Platelet Count",
            reportedValue: null,
            unit: null,
            referenceRange: null,
            documentFlag: null,
            uncertain: true,
            explanation: "Platelets help blood clot."
        }
    ],
    termsExplained: [{ term: "Reference range", explanation: "The lab's comparison range." }],
    questionsForDoctor: ["What does my hemoglobin value mean for me?"],
    limitations: ["Platelet value was not legible."]
};

/**
 * Mock Gemini client. `handler(params)` returns a fake response or throws.
 */
function makeMockClient(handler, embedHandler) {
    const calls = { generate: [], embed: [] };
    const client = {
        models: {
            async generateContent(params) {
                calls.generate.push(params);
                return handler(params, calls.generate.length);
            },
            async embedContent(params) {
                calls.embed.push(params);
                if (embedHandler) return embedHandler(params);
                return { embeddings: params.contents.map(() => ({ values: [0.1, 0.2, 0.3, 0.4] })) };
            }
        }
    };
    return { client, calls };
}

const textResponse = (text) => ({
    text,
    functionCalls: undefined,
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    candidates: [{ content: { role: "model", parts: [{ text }] } }]
});

async function runUnitTests() {
    console.log("A1. File validation (magic bytes, not extension):");

    await it("A1.1 detects PDF, PNG and JPEG signatures", () => {
        assert.strictEqual(detectFileType(SYNTHETIC_PDF), "application/pdf");
        assert.strictEqual(detectFileType(SYNTHETIC_PNG), "image/png");
        assert.strictEqual(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5])), "image/jpeg");
    });

    await it("A1.2 rejects a text file renamed to .pdf", () => {
        const fake = Buffer.from("This is not really a PDF document at all");
        assert.strictEqual(detectFileType(fake), null);
        assert.throws(
            () => validateUpload({ buffer: fake, size: fake.length, originalname: "report.pdf", mimetype: "application/pdf" }),
            (e) => e.code === "AI_FILE_INVALID"
        );
    });

    await it("A1.3 rejects extension/content mismatch (PNG bytes named .pdf)", () => {
        assert.throws(
            () => validateUpload({ buffer: SYNTHETIC_PNG, size: SYNTHETIC_PNG.length, originalname: "scan.pdf", mimetype: "application/pdf" }),
            (e) => e.code === "AI_FILE_INVALID"
        );
    });

    await it("A1.4 rejects empty and oversized files", () => {
        assert.throws(() => validateUpload({ buffer: Buffer.alloc(0), size: 0, originalname: "a.pdf" }), (e) => e.code === "AI_FILE_EMPTY");
        const big = Buffer.concat([SYNTHETIC_PDF, Buffer.alloc(2 * 1024 * 1024)]);
        assert.throws(() => validateUpload({ buffer: big, size: big.length, originalname: "a.pdf" }), (e) => e.code === "AI_FILE_TOO_LARGE");
    });

    await it("A1.5 rejects truncated PDF (no %%EOF)", () => {
        const truncated = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\n", "latin1");
        assert.throws(() => validateUpload({ buffer: truncated, size: truncated.length, originalname: "a.pdf" }), (e) => e.code === "AI_FILE_INVALID");
    });

    await it("A1.6 sanitizes file names (path traversal, control chars)", () => {
        assert.strictEqual(sanitizeFileName("../../etc/passwd"), "passwd");
        assert.strictEqual(sanitizeFileName("..\\..\\win\\report<script>.pdf"), "reportscript.pdf");
        assert.strictEqual(sanitizeFileName(""), "report");
    });

    console.log("\nA2. Structured summary validation:");

    await it("A2.1 accepts valid JSON and adds disclaimer, preserves values exactly", () => {
        const out = validateSummaryOutput(JSON.stringify(VALID_SUMMARY));
        assert.strictEqual(out.observations[0].reportedValue, "12.5");
        assert.strictEqual(out.observations[0].unit, "g/dL");
        assert.strictEqual(out.observations[0].documentFlag, "L");
        assert.ok(out.disclaimer.includes("not a medical diagnosis"));
    });

    await it("A2.2 marks missing values as uncertain", () => {
        const out = validateSummaryOutput(JSON.stringify(VALID_SUMMARY));
        assert.strictEqual(out.observations[1].reportedValue, null);
        assert.strictEqual(out.observations[1].uncertain, true);
    });

    await it("A2.3 rejects malformed or incomplete model output", () => {
        assert.throws(() => validateSummaryOutput("Sure! Here is the summary: {"), (e) => e.code === "AI_BAD_RESPONSE");
        assert.throws(() => validateSummaryOutput(JSON.stringify({ summary: "x" })), (e) => e.code === "AI_BAD_RESPONSE");
    });

    await it("A2.4 strips code fences and redacts identifiers in free text", () => {
        const withPii = { ...VALID_SUMMARY, summary: "Report for patient john@example.com, phone +91 98765 43210." };
        const out = validateSummaryOutput("```json\n" + JSON.stringify(withPii) + "\n```");
        assert.ok(!out.summary.includes("john@example.com"));
        assert.ok(!out.summary.includes("98765"));
    });

    console.log("\nA3. Safety helpers:");

    await it("A3.1 detects emergency symptoms", () => {
        assert.strictEqual(detectEmergency("I have crushing chest pain right now"), true);
        assert.strictEqual(detectEmergency("What is HbA1c?"), false);
    });

    await it("A3.2 redacts emails, phone numbers and long IDs but keeps lab values", () => {
        const out = redactIdentifiers("Email a@b.com call 9876543210 id 1234 5678 9012 hemoglobin 12.5 g/dL");
        assert.ok(!out.includes("a@b.com") && !out.includes("9876543210") && !out.includes("1234 5678 9012"));
        assert.ok(out.includes("12.5 g/dL"));
    });

    console.log("\nA4. Gemini error handling:");

    await it("A4.1 maps provider errors to safe codes without leaking details", () => {
        assert.strictEqual(mapProviderError({ status: 400, message: "API key not valid. Please pass a valid API key." }).code, "AI_AUTH");
        assert.strictEqual(mapProviderError({ status: 404, message: "models/foo is not found for API version v1beta" }).code, "AI_MODEL_UNSUPPORTED");
        assert.strictEqual(mapProviderError({ status: 429, message: "RESOURCE_EXHAUSTED: rate" }).code, "AI_RATE_LIMITED");
        assert.strictEqual(mapProviderError({ status: 429, message: "You exceeded your current quota, please check your plan and billing" }).code, "AI_QUOTA");
        assert.strictEqual(mapProviderError({ status: 503, message: "overloaded" }).code, "AI_UNAVAILABLE");
        const mapped = mapProviderError({ status: 400, message: "API key not valid: AIzaSECRET" });
        assert.ok(!mapped.message.includes("AIza"));
    });

    await it("A4.2 retries retryable errors with bounded backoff, not auth errors", async () => {
        let attempts = 0;
        await assert.rejects(
            gemini.withRetry(async () => { attempts++; throw { status: 503, message: "unavailable" }; }, { maxRetries: 2, baseDelayMs: 1 }),
            (e) => e.code === "AI_UNAVAILABLE"
        );
        assert.strictEqual(attempts, 3);

        attempts = 0;
        await assert.rejects(
            gemini.withRetry(async () => { attempts++; throw { status: 401, message: "UNAUTHENTICATED" }; }, { maxRetries: 2, baseDelayMs: 1 }),
            (e) => e.code === "AI_AUTH"
        );
        assert.strictEqual(attempts, 1);
    });

    await it("A4.3 enforces request timeout", async () => {
        await assert.rejects(
            gemini.withRetry((signal) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))), { timeoutMs: 30, maxRetries: 0 }),
            (e) => e.code === "AI_TIMEOUT"
        );
    });

    await it("A4.4 throws AI_NOT_CONFIGURED when no API key and no client", async () => {
        const saved = process.env.GEMINI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        gemini.setGeminiClientForTesting(null);
        await assert.rejects(gemini.generate({ contents: "hi" }), (e) => e.code === "AI_NOT_CONFIGURED");
        if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
    });

    console.log("\nA5. Chunking & retrieval helpers:");

    await it("A5.1 chunks long documents with bounded size and overlap", () => {
        const text = Array.from({ length: 30 }, (_, i) => `Paragraph ${i} explains a lab concept in detail. `.repeat(4)).join("\n\n");
        const chunks = chunkText(text);
        assert.ok(chunks.length > 3);
        assert.ok(chunks.every((c) => c.length <= 1300), "chunk too large");
        assert.deepStrictEqual(chunkText("   "), []);
    });

    await it("A5.2 toSources deduplicates by document and only uses retrieved chunks", () => {
        const sources = retrieval.toSources([
            { documentId: 1, title: "CBC", sourceReference: "Ref A", sourceType: "LAB_TEST", score: 0.9 },
            { documentId: 1, title: "CBC", sourceReference: "Ref A", sourceType: "LAB_TEST", score: 0.8 },
            { documentId: 2, title: "HbA1c", sourceReference: "Ref B", sourceType: "LAB_TEST", score: 0.7 }
        ]);
        assert.strictEqual(sources.length, 2);
        assert.deepStrictEqual(sources.map((s) => s.reference), ["Ref A", "Ref B"]);
        assert.deepStrictEqual(retrieval.toSources([]), []);
    });

    await it("A5.3 uses keyword mode when Qdrant is not configured", () => {
        assert.strictEqual(retrieval.getMode(), "keyword");
    });

    console.log("\nA6. Validation & tool safety:");

    await it("A6.1 chat schema requires a message and accepts null conversationId", () => {
        assert.strictEqual(chatSchema.safeParse({ message: "" }).success, false);
        assert.strictEqual(chatSchema.safeParse({ conversationId: null, message: "What is CBC?" }).success, true);
    });

    await it("A6.2 knowledge schema enforces source type and reference", () => {
        assert.strictEqual(knowledgeSchema.safeParse({ title: "T", sourceType: "WEB", sourceReference: "x", content: "y" }).success, false);
    });

    await it("A6.3 tools reject unknown names and invalid args without throwing", async () => {
        assert.deepStrictEqual(await executeTool("cancel_booking", {}, 1), { error: "Unknown tool" });
        assert.deepStrictEqual(await executeTool("get_lab_test_info", {}, 1), { error: "Invalid arguments" });
        assert.deepStrictEqual(await executeTool("get_my_bookings", {}, null), { error: "Not authenticated" });
    });
}

// ---------- Part B: integration ----------
async function runIntegrationTests() {
    const sequelize = require("../config/database");
    try {
        await sequelize.authenticate();
        const [rows] = await sequelize.query("SHOW TABLES LIKE 'AI_CONVERSATIONS'");
        if (!rows.length) throw new Error("Phase 6 tables missing — run npm run migrate:phase6");
    } catch (err) {
        console.log(`\n(B) Integration tests SKIPPED: ${err.message}`);
        skipped++;
        return;
    }

    const bcrypt = require("bcryptjs");
    const { generateAccessToken } = require("../utils/token");
    const models = require("../models");
    const { User, AiUsageLog, AiKnowledgeDocument, AiKnowledgeChunk, AiReport, AiConversation } = models;
    const app = require("../app");

    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;

    const suffix = crypto.randomBytes(4).toString("hex");
    const password = await bcrypt.hash(crypto.randomBytes(12).toString("hex"), 4);
    const mkUser = (label, role = "PATIENT") =>
        User.create({ name: `Phase6 ${label}`, email: `phase6-${label}-${suffix}@example.test`, password, role });

    const patientA = await mkUser("a");
    const patientB = await mkUser("b");
    const patientC = await mkUser("c");
    const admin = await mkUser("admin", "ADMIN");
    const token = (u) => generateAccessToken(u);
    const createdDocIds = [];

    // Silence expected 4xx/5xx error-handler logs during integration tests
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    const capturedLogs = [];
    const quiet = () => {
        console.error = (...a) => capturedLogs.push(a.join(" "));
        console.warn = (...a) => capturedLogs.push(a.join(" "));
        console.log = (...a) => {
            const line = a.join(" ");
            if (/^\s+[✓✗]|^B\d|^\n?B\d/.test(line) || line.startsWith("    ")) originalLog(...a);
            else capturedLogs.push(line);
        };
    };
    const loud = () => { console.error = originalError; console.warn = originalWarn; console.log = originalLog; };
    quiet();

    const api = async (method, path, { user, body, form } = {}) => {
        const headers = {};
        if (user) headers.Authorization = `Bearer ${token(user)}`;
        let payload;
        if (form) payload = form;
        else if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            payload = JSON.stringify(body);
        }
        const res = await fetch(`${base}${path}`, { method, headers, body: payload });
        const json = await res.json().catch(() => ({}));
        return { status: res.status, body: json };
    };

    const uploadForm = (buffer, name, type) => {
        const form = new FormData();
        form.append("file", new Blob([buffer], { type }), name);
        return form;
    };

    try {
        console.log("\nB1. AI chat (mocked Gemini):");

        let conversationId;
        await it("B1.1 successful chat creates a conversation and returns disclaimer", async () => {
            const { client } = makeMockClient(() => textResponse("A CBC measures components of blood."));
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { conversationId: null, message: "What is a CBC blood test?" } });
            assert.strictEqual(res.status, 200, JSON.stringify(res.body));
            assert.ok(res.body.data.conversationId);
            assert.strictEqual(res.body.data.message, "A CBC measures components of blood.");
            assert.ok(Array.isArray(res.body.data.sources));
            assert.ok(res.body.data.disclaimer.includes("not a medical diagnosis"));
            assert.strictEqual(res.body.data.retrievalMode, "keyword");
            conversationId = res.body.data.conversationId;
        });

        await it("B1.2 follow-up includes previous messages as context", async () => {
            const { client, calls } = makeMockClient(() => textResponse("Yes, hemoglobin is part of a CBC."));
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { conversationId, message: "Does it include hemoglobin?" } });
            assert.strictEqual(res.status, 200);
            const contents = calls.generate[0].contents;
            assert.strictEqual(contents[0].role, "user");
            assert.ok(contents[0].parts[0].text.includes("What is a CBC"));
            assert.strictEqual(contents[1].role, "model");
            assert.ok(calls.generate[0].config.systemInstruction.includes("Never diagnose"));
        });

        await it("B1.3 conversation history lists messages in order", async () => {
            const res = await api("GET", `/api/ai/conversations/${conversationId}`, { user: patientA });
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(res.body.data.messages.map((m) => m.role), ["USER", "ASSISTANT", "USER", "ASSISTANT"]);
            const list = await api("GET", "/api/ai/conversations", { user: patientA });
            assert.ok(list.body.data.some((c) => Number(c.id) === conversationId));
        });

        await it("B1.4 emergency message gets an emergency notice", async () => {
            const { client } = makeMockClient(() => textResponse("Please seek help."));
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { conversationId, message: "I have severe chest pain" } });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.emergency, true);
            assert.ok(res.body.data.message.includes("emergency services"));
        });

        await it("B1.5 tool calls run with the authenticated user ID, never a model-supplied one", async () => {
            const { client, calls } = makeMockClient((params, n) => {
                if (n === 1) {
                    return {
                        text: undefined,
                        functionCalls: [{ id: "c1", name: "get_my_bookings", args: { userId: Number(patientB.id), limit: 3 } }],
                        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1 },
                        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "get_my_bookings", args: {} } }] } }]
                    };
                }
                return textResponse("You have no bookings yet.");
            });
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: "Show my bookings" } });
            assert.strictEqual(res.status, 200, JSON.stringify(res.body));
            assert.deepStrictEqual(res.body.data.toolsUsed, ["get_my_bookings"]);
            const toolTurn = calls.generate[1].contents.at(-1);
            const result = toolTurn.parts[0].functionResponse.response.result;
            assert.ok(result.includes("<untrusted_data"), "tool output must be wrapped as untrusted");
            assert.ok(result.includes('"data": []'), "patient A has no bookings; must not see B's data");
        });

        await it("B1.6 rejects unauthenticated requests", async () => {
            const res = await api("POST", "/api/ai/chat", { body: { message: "hi" } });
            assert.strictEqual(res.status, 401);
        });

        await it("B1.7 rejects over-long input", async () => {
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: "x".repeat(5000) } });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.code, "AI_INPUT_TOO_LONG");
        });

        await it("B1.8 Gemini errors return safe codes (rate limit, auth, timeout)", async () => {
            const cases = [
                [{ status: 429, message: "RESOURCE_EXHAUSTED" }, 429, "AI_RATE_LIMITED"],
                [{ status: 400, message: "API key not valid AIzaSecret" }, 503, "AI_AUTH"],
                [{ status: 503, message: "backend overloaded" }, 503, "AI_UNAVAILABLE"]
            ];
            for (const [error, status, code] of cases) {
                gemini.setGeminiClientForTesting(makeMockClient(() => { throw error; }).client);
                const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: "What is HbA1c?" } });
                assert.strictEqual(res.status, status, `${code}: ${JSON.stringify(res.body)}`);
                assert.strictEqual(res.body.code, code);
                assert.ok(!JSON.stringify(res.body).includes("AIza"));
            }
        });

        await it("B1.10 primary model overloaded (503) falls back to the next configured model", async () => {
            const { client, calls } = makeMockClient((params) => {
                if (params.model === "primary-test-model") {
                    throw { status: 503, message: JSON.stringify({ error: { code: 503, status: "UNAVAILABLE", message: "high demand" } }) };
                }
                return textResponse("Answer from fallback model.");
            });
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: "What is a lipid profile?" } });
            assert.strictEqual(res.status, 200, JSON.stringify(res.body));
            assert.strictEqual(res.body.data.message, "Answer from fallback model.");
            assert.deepStrictEqual(calls.generate.map((c) => c.model), ["primary-test-model", "fallback-test-model"], "primary must be tried once (no retries) before fallback");
            const log = await AiUsageLog.findOne({ where: { userId: patientA.id, feature: "CHAT", status: "SUCCESS" }, order: [["id", "DESC"]] });
            assert.strictEqual(log.model, "fallback-test-model");
        });

        await it("B1.11 auth errors do not fall back to other models", async () => {
            const { client, calls } = makeMockClient(() => { throw { status: 401, message: "UNAUTHENTICATED" }; });
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: "What is a lipid profile?" } });
            assert.strictEqual(res.status, 503);
            assert.strictEqual(res.body.code, "AI_AUTH");
            assert.strictEqual(calls.generate.length, 1);
            assert.strictEqual(res.body.providerStatus, undefined, "provider diagnostics must not reach the client");
        });

        await it("B1.12 empty reply with MAX_TOKENS (thinking budget) retries once with a larger budget", async () => {
            const { client, calls } = makeMockClient((params, n) => {
                if (n === 1) {
                    return { text: undefined, functionCalls: undefined, usageMetadata: { promptTokenCount: 5, thoughtsTokenCount: 2048 }, candidates: [{ finishReason: "MAX_TOKENS", content: { role: "model", parts: [] } }] };
                }
                return textResponse("Complete answer.");
            });
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: "Explain cholesterol units" } });
            assert.strictEqual(res.status, 200, JSON.stringify(res.body));
            assert.strictEqual(res.body.data.message, "Complete answer.");
            assert.strictEqual(calls.generate.length, 2);
            assert.ok(calls.generate[1].config.maxOutputTokens > calls.generate[0].config.maxOutputTokens);
            assert.strictEqual(calls.generate[1].model, "primary-test-model", "budget retry stays on the same model");
        });

        await it("B1.13 per-model quota exhaustion (429 quota) falls back to the next model", async () => {
            const { client, calls } = makeMockClient((params) => {
                if (params.model === "primary-test-model") {
                    throw { status: 429, message: "You exceeded your current quota, please check your plan and billing details. model: primary-test-model" };
                }
                return textResponse("Fallback answer after quota.");
            });
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: "What is ferritin?" } });
            assert.strictEqual(res.status, 200, JSON.stringify(res.body));
            assert.deepStrictEqual(calls.generate.map((c) => c.model), ["primary-test-model", "fallback-test-model"]);
        });

        await it("B1.14 a failing model is skipped (cooldown) on the next request", async () => {
            gemini.setGeminiClientForTesting(makeMockClient((params) => {
                if (params.model === "primary-test-model") throw { status: 503, message: "UNAVAILABLE" };
                return textResponse("ok");
            }).client);
            assert.strictEqual((await api("POST", "/api/ai/chat", { user: patientA, body: { message: "first request" } })).status, 200);

            // Primary is now cooling down: the next request must go straight to the fallback
            const { client, calls } = makeMockClient(() => textResponse("Served by healthy model."));
            gemini.setGeminiClientForTesting(client, { resetHealth: false });
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: "second request" } });
            assert.strictEqual(res.status, 200, JSON.stringify(res.body));
            assert.deepStrictEqual(calls.generate.map((c) => c.model), ["fallback-test-model"]);
        });

        await it("B1.9 rename, clear and delete conversation", async () => {
            assert.strictEqual((await api("PATCH", `/api/ai/conversations/${conversationId}`, { user: patientA, body: { title: "CBC questions" } })).status, 200);
            const cleared = await api("DELETE", `/api/ai/conversations/${conversationId}/messages`, { user: patientA });
            assert.strictEqual(cleared.status, 200);
            const after = await api("GET", `/api/ai/conversations/${conversationId}`, { user: patientA });
            assert.strictEqual(after.body.data.messages.length, 0);
            assert.strictEqual(after.body.data.conversation.title, "CBC questions");
        });

        console.log("\nB2. Ownership & security:");

        await it("B2.1 patient B cannot read, rename, clear or delete patient A's conversation", async () => {
            for (const [method, path, body] of [
                ["GET", `/api/ai/conversations/${conversationId}`],
                ["PATCH", `/api/ai/conversations/${conversationId}`, { title: "hijack" }],
                ["DELETE", `/api/ai/conversations/${conversationId}/messages`],
                ["DELETE", `/api/ai/conversations/${conversationId}`]
            ]) {
                const res = await api(method, path, { user: patientB, body });
                assert.strictEqual(res.status, 404, `${method} ${path}`);
            }
        });

        await it("B2.2 patient B cannot continue patient A's conversation via chat", async () => {
            gemini.setGeminiClientForTesting(makeMockClient(() => textResponse("x")).client);
            const res = await api("POST", "/api/ai/chat", { user: patientB, body: { conversationId, message: "hello" } });
            assert.strictEqual(res.status, 404);
        });

        await it("B2.3 patients cannot access admin knowledge or usage APIs", async () => {
            assert.strictEqual((await api("GET", "/api/admin/ai/knowledge", { user: patientA })).status, 403);
            assert.strictEqual((await api("POST", "/api/admin/ai/knowledge", { user: patientA, body: {} })).status, 403);
            assert.strictEqual((await api("GET", "/api/admin/ai/usage", { user: patientA })).status, 403);
        });

        await it("B2.4 delete removes the conversation for its owner", async () => {
            assert.strictEqual((await api("DELETE", `/api/ai/conversations/${conversationId}`, { user: patientA })).status, 200);
            assert.strictEqual((await api("GET", `/api/ai/conversations/${conversationId}`, { user: patientA })).status, 404);
        });

        console.log("\nB3. Usage limits:");

        await it("B3.1 daily per-user limit returns 429 AI_LIMIT_REACHED", async () => {
            process.env.AI_DAILY_USER_LIMIT = "2";
            gemini.setGeminiClientForTesting(makeMockClient(() => textResponse("ok")).client);
            assert.strictEqual((await api("POST", "/api/ai/chat", { user: patientC, body: { message: "q1" } })).status, 200);
            assert.strictEqual((await api("POST", "/api/ai/chat", { user: patientC, body: { message: "q2" } })).status, 200);
            const third = await api("POST", "/api/ai/chat", { user: patientC, body: { message: "q3" } });
            assert.strictEqual(third.status, 429);
            assert.strictEqual(third.body.code, "AI_LIMIT_REACHED");
            process.env.AI_DAILY_USER_LIMIT = "1000";
        });

        await it("B3.2 per-minute rate limit returns 429 AI_RATE_LIMIT_USER", async () => {
            process.env.AI_RATE_LIMIT_PER_MINUTE = "1";
            gemini.setGeminiClientForTesting(makeMockClient(() => textResponse("ok")).client);
            const statuses = [];
            for (let i = 0; i < 3; i++) {
                statuses.push((await api("POST", "/api/ai/chat", { user: patientB, body: { message: `burst ${i}` } })).body.code);
            }
            assert.ok(statuses.includes("AI_RATE_LIMIT_USER"), JSON.stringify(statuses));
            process.env.AI_RATE_LIMIT_PER_MINUTE = "1000";
        });

        await it("B3.3 usage is logged with token counts", async () => {
            const logs = await AiUsageLog.findAll({ where: { userId: patientA.id, feature: "CHAT", status: "SUCCESS" } });
            assert.ok(logs.length >= 3);
            assert.ok(logs.some((l) => l.inputTokens > 0));
        });

        console.log("\nB4. Report summarization:");

        let reportId;
        await it("B4.1 valid synthetic PDF is summarized and validated", async () => {
            const { client, calls } = makeMockClient(() => textResponse(JSON.stringify(VALID_SUMMARY)));
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/reports/summarize", { user: patientA, form: uploadForm(SYNTHETIC_PDF, "cbc-report.pdf", "application/pdf") });
            assert.strictEqual(res.status, 201, JSON.stringify(res.body));
            assert.strictEqual(res.body.data.status, "COMPLETED");
            assert.strictEqual(res.body.data.summary.observations[0].reportedValue, "12.5");
            assert.ok(res.body.data.summary.disclaimer);
            const parts = calls.generate[0].contents[0].parts;
            assert.strictEqual(parts[0].inlineData.mimeType, "application/pdf");
            assert.strictEqual(calls.generate[0].config.responseMimeType, "application/json");
            reportId = res.body.data.id;
            assert.ok(/^[0-9a-f-]{36}$/.test(reportId), "report uses a private UUID");
        });

        await it("B4.2 re-uploading the same file returns the existing summary (no duplicate)", async () => {
            const { client, calls } = makeMockClient(() => textResponse(JSON.stringify(VALID_SUMMARY)));
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/reports/summarize", { user: patientA, form: uploadForm(SYNTHETIC_PDF, "cbc-report.pdf", "application/pdf") });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.duplicate, true);
            assert.strictEqual(res.body.data.id, reportId);
            assert.strictEqual(calls.generate.length, 0);
        });

        await it("B4.3 valid PNG image is accepted", async () => {
            gemini.setGeminiClientForTesting(makeMockClient(() => textResponse(JSON.stringify(VALID_SUMMARY))).client);
            const res = await api("POST", "/api/ai/reports/summarize", { user: patientA, form: uploadForm(SYNTHETIC_PNG, "scan.png", "image/png") });
            assert.strictEqual(res.status, 201, JSON.stringify(res.body));
        });

        await it("B4.4 invalid file type is rejected", async () => {
            const res = await api("POST", "/api/ai/reports/summarize", { user: patientA, form: uploadForm(Buffer.from("hello"), "notes.txt", "text/plain") });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.code, "AI_FILE_INVALID");
            const disguised = await api("POST", "/api/ai/reports/summarize", { user: patientA, form: uploadForm(Buffer.from("not a pdf at all, just text"), "report.pdf", "application/pdf") });
            assert.strictEqual(disguised.status, 400);
        });

        await it("B4.5 oversized file returns 413", async () => {
            const big = Buffer.concat([SYNTHETIC_PDF, Buffer.alloc(1.5 * 1024 * 1024)]);
            const res = await api("POST", "/api/ai/reports/summarize", { user: patientA, form: uploadForm(big, "big.pdf", "application/pdf") });
            assert.strictEqual(res.status, 413);
            assert.strictEqual(res.body.code, "AI_FILE_TOO_LARGE");
        });

        await it("B4.6 unreadable document fails cleanly with 422", async () => {
            const unreadable = { ...VALID_SUMMARY, isReadable: false, observations: [], limitations: ["Blank page"] };
            gemini.setGeminiClientForTesting(makeMockClient(() => textResponse(JSON.stringify(unreadable))).client);
            const blank = Buffer.from("%PDF-1.4\n% blank synthetic page " + suffix + "\n%%EOF\n", "latin1");
            const res = await api("POST", "/api/ai/reports/summarize", { user: patientA, form: uploadForm(blank, "blank.pdf", "application/pdf") });
            assert.strictEqual(res.status, 422);
            assert.strictEqual(res.body.code, "AI_REPORT_UNREADABLE");
        });

        await it("B4.7 malformed model JSON fails with AI_BAD_RESPONSE and FAILED status", async () => {
            gemini.setGeminiClientForTesting(makeMockClient(() => textResponse("{ not json")).client);
            const pdf = Buffer.from("%PDF-1.4\n% malformed " + suffix + "\n%%EOF\n", "latin1");
            const res = await api("POST", "/api/ai/reports/summarize", { user: patientA, form: uploadForm(pdf, "m.pdf", "application/pdf") });
            assert.strictEqual(res.status, 502);
            assert.strictEqual(res.body.code, "AI_BAD_RESPONSE");
            const list = await api("GET", "/api/ai/reports", { user: patientA });
            assert.ok(list.body.data.some((r) => r.status === "FAILED"));
        });

        await it("B4.8 follow-up question is grounded in the selected report only", async () => {
            const { client, calls } = makeMockClient(() => textResponse("Your report shows hemoglobin 12.5 g/dL with a document flag of L."));
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", `/api/ai/reports/${reportId}/questions`, { user: patientA, body: { question: "What does the hemoglobin value mean?" } });
            assert.strictEqual(res.status, 200, JSON.stringify(res.body));
            const prompt = calls.generate[0].contents[0].parts[0].text;
            assert.ok(prompt.includes("Hemoglobin") && prompt.includes("<untrusted_data"));
        });

        await it("B4.9 patient B cannot view, question or delete patient A's report", async () => {
            assert.strictEqual((await api("GET", `/api/ai/reports/${reportId}`, { user: patientB })).status, 404);
            assert.strictEqual((await api("POST", `/api/ai/reports/${reportId}/questions`, { user: patientB, body: { question: "?" } })).status, 404);
            assert.strictEqual((await api("DELETE", `/api/ai/reports/${reportId}`, { user: patientB })).status, 404);
            const listB = await api("GET", "/api/ai/reports", { user: patientB });
            assert.strictEqual(listB.body.data.length, 0);
        });

        await it("B4.10 owner can delete the report", async () => {
            assert.strictEqual((await api("DELETE", `/api/ai/reports/${reportId}`, { user: patientA })).status, 200);
            assert.strictEqual((await api("GET", `/api/ai/reports/${reportId}`, { user: patientA })).status, 404);
            assert.strictEqual(await AiReport.count({ where: { publicId: reportId } }), 0);
        });

        console.log("\nB5. Knowledge base & RAG (keyword mode):");

        const marker = `zylotrexin${suffix}`;
        let docId;
        await it("B5.1 admin creates and indexes a knowledge document", async () => {
            const created = await api("POST", "/api/admin/ai/knowledge", {
                user: admin,
                body: {
                    title: `Test marker ${marker}`,
                    sourceType: "EDUCATIONAL",
                    sourceReference: `Phase 6 test reference ${suffix}`,
                    content: `The ${marker} assay is a synthetic test used only in automated tests. ${marker} values are illustrative and fictional.\n\nThis paragraph exists to make the document long enough.`
                }
            });
            assert.strictEqual(created.status, 201, JSON.stringify(created.body));
            docId = created.body.data.id;
            createdDocIds.push(docId);
            assert.strictEqual(created.body.data.indexingStatus, "PENDING");

            const indexed = await api("POST", `/api/admin/ai/knowledge/${docId}/index`, { user: admin, body: {} });
            assert.strictEqual(indexed.status, 200, JSON.stringify(indexed.body));
            assert.strictEqual(indexed.body.data.indexingStatus, "INDEXED");
            assert.strictEqual(indexed.body.data.retrievalMode, "keyword");
            assert.ok(indexed.body.data.chunkCount >= 1);
        });

        await it("B5.2 re-indexing unchanged content is skipped (no duplicate indexing)", async () => {
            const again = await api("POST", `/api/admin/ai/knowledge/${docId}/index`, { user: admin, body: {} });
            assert.strictEqual(again.body.skipped, true);
            assert.strictEqual(await AiKnowledgeChunk.count({ where: { documentId: docId } }), again.body.data.chunkCount);
        });

        await it("B5.3 relevant question retrieves the document and returns real source references", async () => {
            const { client, calls } = makeMockClient(() => textResponse("It is a fictional assay."));
            gemini.setGeminiClientForTesting(client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: `What is the ${marker} assay?` } });
            assert.strictEqual(res.status, 200);
            const source = res.body.data.sources.find((s) => s.documentId === Number(docId));
            assert.ok(source, JSON.stringify(res.body.data.sources));
            assert.strictEqual(source.reference, `Phase 6 test reference ${suffix}`);
            assert.ok(calls.generate[0].contents.at(-1).parts[0].text.includes(marker));
        });

        await it("B5.4 irrelevant question does not return the document as a source", async () => {
            gemini.setGeminiClientForTesting(makeMockClient(() => textResponse("General answer.")).client);
            const res = await api("POST", "/api/ai/chat", { user: patientA, body: { message: "How do volcanoes erupt underwater?" } });
            assert.strictEqual(res.status, 200);
            assert.ok(!res.body.data.sources.some((s) => s.documentId === Number(docId)));
        });

        await it("B5.5 updating content resets to PENDING and removes stale chunks", async () => {
            const updated = await api("PUT", `/api/admin/ai/knowledge/${docId}`, {
                user: admin,
                body: { content: `Updated ${marker} explanation for the reindex test. This text is long enough to satisfy validation rules.` }
            });
            assert.strictEqual(updated.status, 200);
            assert.strictEqual(updated.body.data.indexingStatus, "PENDING");
            assert.strictEqual(await AiKnowledgeChunk.count({ where: { documentId: docId } }), 0);
            const reindexed = await api("POST", `/api/admin/ai/knowledge/${docId}/index`, { user: admin, body: {} });
            assert.strictEqual(reindexed.body.skipped, false);
            assert.strictEqual(reindexed.body.data.indexingStatus, "INDEXED");
        });

        await it("B5.6 admin list/search and usage overview work", async () => {
            const list = await api("GET", `/api/admin/ai/knowledge?search=${marker}`, { user: admin });
            assert.strictEqual(list.status, 200);
            assert.strictEqual(list.body.data.length, 1);
            assert.strictEqual(list.body.data[0].content, undefined, "list must not return full content");
            const usage = await api("GET", "/api/admin/ai/usage?days=1", { user: admin });
            assert.strictEqual(usage.status, 200);
            assert.ok(usage.body.data.totals.requests > 0);
        });

        console.log("\nB6. Vector mode (mock embeddings) & failure fallback:");

        await it("B6.1 vector search hydrates real chunks from MySQL and keeps scores", async () => {
            const chunk = await AiKnowledgeChunk.findOne({ where: { documentId: docId } });
            gemini.setGeminiClientForTesting(makeMockClient(() => textResponse("x")).client);
            process.env.QDRANT_URL = "http://127.0.0.1:9";
            retrieval.setProvidersForTesting({
                qdrant: {
                    searchVector: async () => [{ vectorId: chunk.vectorId, score: 0.91 }, { vectorId: crypto.randomUUID(), score: 0.88 }],
                    upsertPoints: async () => {},
                    deleteDocumentPoints: async () => {}
                }
            });
            const result = await retrieval.search("anything");
            assert.strictEqual(result.mode, "vector");
            assert.strictEqual(result.chunks.length, 1, "unknown vector IDs must be ignored, never invented");
            assert.strictEqual(result.chunks[0].documentId, chunk.documentId);
        });

        await it("B6.2 Qdrant failure falls back to keyword retrieval and is labelled degraded", async () => {
            retrieval.setProvidersForTesting({
                qdrant: {
                    searchVector: async () => { throw new Error("connection refused"); },
                    upsertPoints: async () => { throw new Error("connection refused"); },
                    deleteDocumentPoints: async () => {}
                }
            });
            const result = await retrieval.search(`${marker} explanation`);
            assert.strictEqual(result.mode, "keyword");
            assert.strictEqual(result.degraded, true);
            assert.ok(result.chunks.some((c) => Number(c.documentId) === Number(docId)));
        });

        await it("B6.3 indexing with vector DB down marks the document FAILED with a safe message", async () => {
            const res = await api("POST", `/api/admin/ai/knowledge/${docId}/index`, { user: admin, body: { force: true } });
            assert.strictEqual(res.status, 503);
            const doc = await AiKnowledgeDocument.findByPk(docId);
            assert.strictEqual(doc.indexingStatus, "FAILED");
            assert.ok(!/connection refused/.test(doc.indexingError || ""));
            assert.strictEqual(await AiKnowledgeChunk.count({ where: { documentId: docId } }), 0, "no partial chunks left behind");
            delete process.env.QDRANT_URL;
            retrieval.setProvidersForTesting({ qdrant: require("../modules/ai/retrieval/qdrant.provider") });
        });

        await it("B6.4 deleting a document removes its chunks and vectors", async () => {
            let vectorDeleteCalledFor = null;
            process.env.QDRANT_URL = "http://127.0.0.1:9";
            retrieval.setProvidersForTesting({
                qdrant: { deleteDocumentPoints: async (id) => { vectorDeleteCalledFor = Number(id); }, upsertPoints: async () => {}, searchVector: async () => [] }
            });
            const res = await api("DELETE", `/api/admin/ai/knowledge/${docId}`, { user: admin });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(vectorDeleteCalledFor, Number(docId));
            assert.strictEqual(await AiKnowledgeChunk.count({ where: { documentId: docId } }), 0);
            delete process.env.QDRANT_URL;
            retrieval.setProvidersForTesting({ qdrant: require("../modules/ai/retrieval/qdrant.provider") });
        });

        console.log("\nB7. Logging privacy:");

        await it("B7.1 server logs never contain report content or API keys", () => {
            const joined = capturedLogs.join("\n");
            assert.ok(!joined.includes("Hemoglobin"), "report content leaked into logs");
            assert.ok(!joined.includes("AIzaSecret"), "API key leaked into logs");
        });
    } finally {
        loud();
        gemini.setGeminiClientForTesting(null);
        const userIds = [patientA.id, patientB.id, patientC.id, admin.id];
        const { Op } = require("sequelize");
        await AiUsageLog.destroy({ where: { userId: { [Op.in]: userIds } } }).catch(() => {});
        for (const id of createdDocIds) {
            await AiKnowledgeChunk.destroy({ where: { documentId: id } }).catch(() => {});
            await AiKnowledgeDocument.destroy({ where: { id } }).catch(() => {});
        }
        await AiConversation.destroy({ where: { userId: { [Op.in]: userIds } } }).catch(() => {});
        await AiReport.destroy({ where: { userId: { [Op.in]: userIds } } }).catch(() => {});
        await User.destroy({ where: { id: { [Op.in]: userIds } } }).catch((e) => console.warn("cleanup:", e.message));
        server.close();
        await sequelize.close();
    }
}

(async () => {
    await runUnitTests();
    await runIntegrationTests();

    console.log(`\n========================================`);
    console.log(`Phase 6 Test Results: ${passed} passed, ${failed} failed${skipped ? `, ${skipped} section skipped` : ""}`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
})();
