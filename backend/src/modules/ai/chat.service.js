/**
 * AI healthcare chat: conversation management, RAG grounding, read-only tools.
 */
const sequelize = require("../../config/database");
const { AiConversation, AiMessage } = require("../../models");
const gemini = require("./gemini.client");
const retrieval = require("./retrieval");
const { executeTool, functionDeclarations } = require("./ai.tools");
const { CHAT_SYSTEM_INSTRUCTION, buildKnowledgeContext, wrapUntrusted } = require("./ai.prompts");
const { CHAT_DISCLAIMER, EMERGENCY_NOTICE, detectEmergency, redactIdentifiers } = require("./ai.safety");
const { assertWithinLimits, logUsage } = require("./usage.service");
const { getAiConfig } = require("./ai.config");
const { AiError } = require("./ai.errors");

const MAX_TOOL_ROUNDS = 2;

async function findOwnedConversation(userId, conversationId) {
    const conversation = await AiConversation.findOne({ where: { id: conversationId, userId } });
    if (!conversation) {
        // Same response for "missing" and "belongs to someone else"
        throw new AiError("AI_NOT_FOUND", "Conversation not found");
    }
    return conversation;
}

function makeTitle(message) {
    const clean = message.replace(/\s+/g, " ").trim();
    return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean || "New conversation";
}

/**
 * Run Gemini with the read-only tool loop.
 */
async function generateWithTools(userId, contents) {
    const usage = { inputTokens: 0, outputTokens: 0 };
    let toolsUsed = [];
    let model;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const allowTools = round < MAX_TOOL_ROUNDS;
        const result = await gemini.generate({
            contents,
            systemInstruction: CHAT_SYSTEM_INSTRUCTION,
            tools: allowTools ? [{ functionDeclarations }] : undefined
        });
        model = result.model;
        usage.inputTokens += result.usage.inputTokens;
        usage.outputTokens += result.usage.outputTokens;

        if (!allowTools || !result.functionCalls.length) {
            return { text: result.text, usage, model, toolsUsed };
        }

        const modelContent = result.response?.candidates?.[0]?.content || {
            role: "model",
            parts: result.functionCalls.map((call) => ({ functionCall: call }))
        };
        contents.push(modelContent);

        const responseParts = [];
        for (const call of result.functionCalls.slice(0, 4)) {
            const output = await executeTool(call.name, call.args, userId);
            toolsUsed.push(call.name);
            responseParts.push({
                functionResponse: {
                    id: call.id,
                    name: call.name,
                    response: { result: wrapUntrusted(`tool:${call.name}`, output) }
                }
            });
        }
        contents.push({ role: "user", parts: responseParts });
    }
    return { text: "", usage, model, toolsUsed };
}

/**
 * Send a chat message.
 * @param {number} userId authenticated user (never from the client body)
 * @param {{ conversationId?: number|null, message: string }} payload
 */
async function sendMessage(userId, { conversationId = null, message }) {
    const config = getAiConfig();
    const trimmed = String(message || "").trim();
    if (!trimmed) throw new AiError("AI_INPUT_TOO_LONG", "Message cannot be empty");
    if (trimmed.length > config.maxInputChars) {
        throw new AiError("AI_INPUT_TOO_LONG", `Message is too long (maximum ${config.maxInputChars} characters).`);
    }

    // Ownership check before spending quota
    const existing = conversationId ? await findOwnedConversation(userId, conversationId) : null;

    if (!gemini.isConfigured()) throw new AiError("AI_NOT_CONFIGURED");
    await assertWithinLimits(userId, "CHAT");

    const safeMessage = redactIdentifiers(trimmed);
    const isEmergency = detectEmergency(trimmed);

    // Recent history for context
    const history = existing
        ? (await AiMessage.findAll({
            where: { conversationId: existing.id },
            order: [["id", "DESC"]],
            limit: config.contextMessages,
            attributes: ["role", "content"]
        })).reverse()
        : [];

    const { chunks, mode: retrievalMode, degraded } = await retrieval.search(safeMessage);
    const sources = retrieval.toSources(chunks);

    const contents = history.map((m) => ({
        role: m.role === "USER" ? "user" : "model",
        parts: [{ text: m.content }]
    }));
    contents.push({
        role: "user",
        parts: [{ text: `${buildKnowledgeContext(chunks)}\n\nUser question:\n${safeMessage}` }]
    });

    let result;
    try {
        result = await generateWithTools(userId, contents);
    } catch (err) {
        await logUsage({ userId, feature: "CHAT", status: "ERROR", errorCode: err.code || "AI_UNAVAILABLE" });
        throw err;
    }

    let answer = (result.text || "").trim();
    if (!answer) {
        await logUsage({ userId, feature: "CHAT", model: result.model, usage: result.usage, status: "ERROR", errorCode: "AI_BAD_RESPONSE" });
        throw new AiError("AI_BAD_RESPONSE");
    }
    if (isEmergency && !answer.includes(EMERGENCY_NOTICE)) {
        answer = `**${EMERGENCY_NOTICE}**\n\n${answer}`;
    }

    const conversation = await sequelize.transaction(async (transaction) => {
        const conv = existing || await AiConversation.create({ userId, title: makeTitle(safeMessage) }, { transaction });
        await AiMessage.create({ conversationId: conv.id, role: "USER", content: safeMessage }, { transaction });
        await AiMessage.create(
            { conversationId: conv.id, role: "ASSISTANT", content: answer, sourcesJson: { sources, retrievalMode } },
            { transaction }
        );
        conv.lastMessageAt = new Date();
        conv.changed("updatedAt", true);
        await conv.save({ transaction });
        return conv;
    });

    await logUsage({ userId, feature: "CHAT", model: result.model, usage: result.usage, status: "SUCCESS" });

    return {
        conversationId: Number(conversation.id),
        title: conversation.title,
        message: answer,
        sources,
        retrievalMode,
        retrievalDegraded: degraded,
        toolsUsed: [...new Set(result.toolsUsed)],
        emergency: isEmergency,
        disclaimer: CHAT_DISCLAIMER
    };
}

async function listConversations(userId, { page = 1, limit = 20 } = {}) {
    const { count, rows } = await AiConversation.findAndCountAll({
        where: { userId },
        order: [["updatedAt", "DESC"]],
        offset: (page - 1) * limit,
        limit
    });
    return {
        conversations: rows,
        pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) || 1 }
    };
}

async function getConversation(userId, conversationId, { page = 1, limit = 50 } = {}) {
    const conversation = await findOwnedConversation(userId, conversationId);
    const { count, rows } = await AiMessage.findAndCountAll({
        where: { conversationId: conversation.id },
        order: [["id", "DESC"]],
        offset: (page - 1) * limit,
        limit
    });
    return {
        conversation,
        messages: rows.reverse().map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: m.sourcesJson?.sources || [],
            retrievalMode: m.sourcesJson?.retrievalMode || null,
            createdAt: m.createdAt
        })),
        pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) || 1 }
    };
}

async function renameConversation(userId, conversationId, title) {
    const conversation = await findOwnedConversation(userId, conversationId);
    await conversation.update({ title });
    return conversation;
}

async function deleteConversation(userId, conversationId) {
    const conversation = await findOwnedConversation(userId, conversationId);
    await sequelize.transaction(async (transaction) => {
        await AiMessage.destroy({ where: { conversationId: conversation.id }, transaction });
        await conversation.destroy({ transaction });
    });
    return { id: Number(conversationId) };
}

async function clearMessages(userId, conversationId) {
    const conversation = await findOwnedConversation(userId, conversationId);
    const deleted = await AiMessage.destroy({ where: { conversationId: conversation.id } });
    return { id: Number(conversationId), deleted };
}

module.exports = {
    sendMessage,
    listConversations,
    getConversation,
    renameConversation,
    deleteConversation,
    clearMessages
};
