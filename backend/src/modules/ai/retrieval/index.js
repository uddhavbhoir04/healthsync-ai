/**
 * Retrieval layer. Chooses the vector provider (Qdrant) when QDRANT_URL is configured,
 * otherwise the MySQL keyword fallback. Providers are swappable behind this interface.
 *
 * search() returns { chunks, mode } where mode is "vector" or "keyword".
 * Chunk texts always come from MySQL (AI_KNOWLEDGE_CHUNKS) so sources are real records.
 */
const { Op } = require("sequelize");
const { AiKnowledgeChunk, AiKnowledgeDocument } = require("../../../models");
const { getAiConfig } = require("../ai.config");
const gemini = require("../gemini.client");
const keywordProvider = require("./keyword.provider");
const qdrantProvider = require("./qdrant.provider");

let providers = { keyword: keywordProvider, qdrant: qdrantProvider };

function isVectorMode() {
    const { qdrantUrl } = getAiConfig();
    return Boolean(qdrantUrl) && gemini.isConfigured();
}

function getMode() {
    return isVectorMode() ? "vector" : "keyword";
}

/**
 * Store vectors for chunks (vector mode only). Chunk rows must already exist in MySQL.
 * @param {object} document AiKnowledgeDocument
 * @param {object[]} chunks AiKnowledgeChunk rows
 */
async function indexChunks(document, chunks) {
    if (!isVectorMode() || !chunks.length) {
        return { mode: "keyword" };
    }
    const batchSize = 20;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const vectors = await gemini.embed(batch.map((c) => `${document.title}\n\n${c.content}`), "RETRIEVAL_DOCUMENT");
        await providers.qdrant.upsertPoints(
            batch.map((chunk, idx) => ({
                vectorId: chunk.vectorId,
                vector: vectors[idx],
                payload: {
                    documentId: Number(document.id),
                    chunkId: Number(chunk.id),
                    title: document.title,
                    sourceReference: document.sourceReference
                }
            }))
        );
    }
    return { mode: "vector" };
}

async function deleteDocumentVectors(documentId) {
    if (!getAiConfig().qdrantUrl) return;
    await providers.qdrant.deleteDocumentPoints(documentId);
}

async function hydrateVectorHits(hits) {
    if (!hits.length) return [];
    const chunks = await AiKnowledgeChunk.findAll({
        where: { vectorId: { [Op.in]: hits.map((h) => h.vectorId) } },
        include: [{
            model: AiKnowledgeDocument,
            as: "document",
            where: { indexingStatus: "INDEXED" },
            attributes: ["id", "title", "sourceReference", "sourceType"]
        }]
    });
    const byVector = new Map(chunks.map((c) => [c.vectorId, c]));
    return hits
        .map((hit) => {
            const chunk = byVector.get(hit.vectorId);
            if (!chunk) return null;
            return {
                chunkId: chunk.id,
                documentId: chunk.document.id,
                content: chunk.content,
                title: chunk.document.title,
                sourceReference: chunk.document.sourceReference,
                sourceType: chunk.document.sourceType,
                score: hit.score
            };
        })
        .filter(Boolean);
}

/**
 * Retrieve relevant approved knowledge for a question.
 * @returns {Promise<{ chunks: object[], mode: "vector"|"keyword", degraded: boolean }>}
 */
async function search(query) {
    const { ragTopK, ragSimilarityThreshold } = getAiConfig();

    if (isVectorMode()) {
        try {
            const [queryVector] = await gemini.embed([query], "RETRIEVAL_QUERY");
            const hits = await providers.qdrant.searchVector(queryVector, {
                topK: ragTopK,
                scoreThreshold: ragSimilarityThreshold
            });
            return { chunks: await hydrateVectorHits(hits), mode: "vector", degraded: false };
        } catch (err) {
            console.warn(`Vector retrieval unavailable, using keyword fallback (${err.name || "Error"})`);
            const chunks = await providers.keyword.search(query, { topK: ragTopK }).catch(() => []);
            return { chunks, mode: "keyword", degraded: true };
        }
    }

    try {
        const chunks = await providers.keyword.search(query, { topK: ragTopK });
        return { chunks, mode: "keyword", degraded: false };
    } catch (err) {
        console.warn("Keyword retrieval failed:", err.message);
        return { chunks: [], mode: "keyword", degraded: true };
    }
}

/**
 * Convert retrieved chunks into deduplicated source references (one per document).
 */
function toSources(chunks) {
    const seen = new Map();
    for (const chunk of chunks) {
        if (!seen.has(chunk.documentId)) {
            seen.set(chunk.documentId, {
                documentId: Number(chunk.documentId),
                title: chunk.title,
                reference: chunk.sourceReference,
                sourceType: chunk.sourceType,
                score: Number(Number(chunk.score).toFixed(3))
            });
        }
    }
    return [...seen.values()];
}

function setProvidersForTesting(overrides) {
    providers = { ...providers, ...overrides };
}

module.exports = { search, indexChunks, deleteDocumentVectors, toSources, getMode, setProvidersForTesting };
