/**
 * Admin-managed healthcare knowledge base: CRUD, chunking and (re)indexing.
 */
const crypto = require("crypto");
const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const { AiKnowledgeDocument, AiKnowledgeChunk } = require("../../models");
const retrieval = require("./retrieval");
const { AiError } = require("./ai.errors");
const { logUsage } = require("./usage.service");

const CHUNK_TARGET = 900;
const CHUNK_MAX = 1100;
const CHUNK_OVERLAP = 150;

const hashContent = (content) => crypto.createHash("sha256").update(content).digest("hex");

/**
 * Split text into ~900 char chunks on paragraph/sentence boundaries with ~150 char overlap.
 * @param {string} text
 * @returns {string[]}
 */
function chunkText(text) {
    const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!normalized) return [];

    // Split into paragraphs, then break any oversized paragraph into sentences
    const units = [];
    for (const para of normalized.split(/\n{2,}/)) {
        const p = para.trim();
        if (!p) continue;
        if (p.length <= CHUNK_MAX) {
            units.push(p);
            continue;
        }
        const sentences = p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [p];
        for (const s of sentences) {
            let sentence = s.trim();
            while (sentence.length > CHUNK_MAX) {
                units.push(sentence.slice(0, CHUNK_MAX));
                sentence = sentence.slice(CHUNK_MAX - CHUNK_OVERLAP);
            }
            if (sentence) units.push(sentence);
        }
    }

    const chunks = [];
    let current = "";
    for (const unit of units) {
        if (!current) {
            current = unit;
        } else if (current.length + unit.length + 2 <= CHUNK_TARGET) {
            current += `\n\n${unit}`;
        } else {
            chunks.push(current);
            const tail = current.slice(-CHUNK_OVERLAP);
            const overlap = tail.includes(" ") ? tail.slice(tail.indexOf(" ") + 1) : tail;
            current = `${overlap}\n\n${unit}`.trim();
            if (current.length > CHUNK_MAX) current = unit;
        }
    }
    if (current) chunks.push(current);
    return chunks;
}

async function listDocuments({ page = 1, limit = 20, search, status, sourceType } = {}) {
    const where = {};
    if (search) {
        where[Op.or] = [
            { title: { [Op.like]: `%${search}%` } },
            { sourceReference: { [Op.like]: `%${search}%` } }
        ];
    }
    if (status) where.indexingStatus = status;
    if (sourceType) where.sourceType = sourceType;

    const { count, rows } = await AiKnowledgeDocument.findAndCountAll({
        where,
        attributes: { exclude: ["content"] },
        order: [["updatedAt", "DESC"]],
        offset: (page - 1) * limit,
        limit
    });
    return {
        documents: rows,
        retrievalMode: retrieval.getMode(),
        pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) || 1 }
    };
}

async function getDocument(id) {
    const doc = await AiKnowledgeDocument.findByPk(id);
    if (!doc) throw new AiError("AI_NOT_FOUND", "Knowledge document not found");
    return doc;
}

async function createDocument(payload, adminId) {
    return AiKnowledgeDocument.create({
        title: payload.title,
        sourceType: payload.sourceType,
        sourceReference: payload.sourceReference,
        content: payload.content,
        contentHash: hashContent(payload.content),
        indexingStatus: "PENDING",
        createdBy: adminId
    });
}

async function removeIndexedData(documentId) {
    await retrieval.deleteDocumentVectors(documentId);
    await AiKnowledgeChunk.destroy({ where: { documentId } });
}

async function updateDocument(id, payload) {
    const doc = await getDocument(id);
    const updates = { ...payload };

    if (payload.content !== undefined) {
        const newHash = hashContent(payload.content);
        if (newHash !== doc.contentHash) {
            updates.contentHash = newHash;
        }
    }
    const metadataChanged =
        (payload.title !== undefined && payload.title !== doc.title) ||
        (payload.sourceReference !== undefined && payload.sourceReference !== doc.sourceReference);

    if (updates.contentHash || metadataChanged) {
        // Old chunks/vectors no longer match the document: remove them, require reindex
        await removeIndexedData(doc.id);
        updates.indexingStatus = "PENDING";
        updates.indexedHash = null;
        updates.chunkCount = 0;
        updates.indexingError = null;
    }

    await doc.update(updates);
    return doc;
}

async function deleteDocument(id) {
    const doc = await getDocument(id);
    await removeIndexedData(doc.id);
    await doc.destroy();
    return { id: Number(id) };
}

/**
 * (Re)build chunks and embeddings for a document.
 * Skips work when the content was already indexed in the current retrieval mode,
 * unless force=true.
 */
async function indexDocument(id, { force = false } = {}) {
    const doc = await getDocument(id);
    const mode = retrieval.getMode();

    if (!force && doc.indexingStatus === "INDEXED" && doc.indexedHash === doc.contentHash && doc.retrievalMode === mode) {
        return { document: doc, skipped: true };
    }
    if (doc.indexingStatus === "INDEXING" && !force) {
        throw new AiError("AI_REPORT_NOT_READY", "This document is already being indexed");
    }

    await doc.update({ indexingStatus: "INDEXING", indexingError: null });

    try {
        await removeIndexedData(doc.id);

        const texts = chunkText(doc.content);
        const chunks = await sequelize.transaction(async (transaction) =>
            AiKnowledgeChunk.bulkCreate(
                texts.map((content, chunkIndex) => ({
                    documentId: doc.id,
                    chunkIndex,
                    content,
                    vectorId: crypto.randomUUID()
                })),
                { transaction }
            )
        );

        const result = await retrieval.indexChunks(doc, chunks);
        if (result.mode === "vector") {
            await logUsage({ userId: doc.createdBy || null, feature: "EMBEDDING", status: "SUCCESS" });
        }

        await doc.update({
            indexingStatus: "INDEXED",
            indexedHash: doc.contentHash,
            retrievalMode: result.mode,
            chunkCount: chunks.length,
            lastIndexedAt: new Date(),
            indexingError: null
        });
        return { document: doc, skipped: false };
    } catch (err) {
        // Do not leave partially indexed data that retrieval could use
        await AiKnowledgeChunk.destroy({ where: { documentId: doc.id } }).catch(() => {});
        const safeMessage = err.code ? err.message : "Indexing failed. Check the vector database and AI configuration.";
        await doc.update({ indexingStatus: "FAILED", indexingError: safeMessage.slice(0, 250), chunkCount: 0 });
        if (!err.code) console.warn("Knowledge indexing error:", err.name, err.message);
        throw err.code ? err : new AiError("AI_KNOWLEDGE_UNAVAILABLE", safeMessage);
    }
}

module.exports = {
    chunkText,
    hashContent,
    listDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    indexDocument
};
