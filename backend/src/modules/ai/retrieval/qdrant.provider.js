/**
 * Qdrant vector provider using the REST API via fetch (no extra npm package).
 * Points use the chunk's vector_id (UUID) as ID and carry source metadata in the payload.
 */
const { getAiConfig } = require("../ai.config");

class QdrantError extends Error {
    constructor(message) {
        super(message);
        this.name = "QdrantError";
    }
}

let ensuredCollection = null;

async function request(path, { method = "GET", body } = {}) {
    const { qdrantUrl, qdrantApiKey } = getAiConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(`${qdrantUrl}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(qdrantApiKey ? { "api-key": qdrantApiKey } : {})
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const error = new QdrantError(`Qdrant request failed (${res.status})`);
            error.status = res.status;
            throw error;
        }
        return data;
    } catch (err) {
        if (err instanceof QdrantError) throw err;
        throw new QdrantError("Qdrant is unreachable");
    } finally {
        clearTimeout(timer);
    }
}

async function ensureCollection(dimension) {
    const { qdrantCollection } = getAiConfig();
    const cacheKey = `${qdrantCollection}:${dimension}`;
    if (ensuredCollection === cacheKey) return;

    try {
        const info = await request(`/collections/${encodeURIComponent(qdrantCollection)}`);
        const size = info?.result?.config?.params?.vectors?.size;
        if (size && size !== dimension) {
            throw new QdrantError(
                `Qdrant collection dimension (${size}) does not match embedding dimension (${dimension})`
            );
        }
    } catch (err) {
        if (err.status !== 404) throw err;
        await request(`/collections/${encodeURIComponent(qdrantCollection)}`, {
            method: "PUT",
            body: { vectors: { size: dimension, distance: "Cosine" } }
        });
        await request(`/collections/${encodeURIComponent(qdrantCollection)}/index`, {
            method: "PUT",
            body: { field_name: "documentId", field_schema: "integer" }
        }).catch(() => {});
    }
    ensuredCollection = cacheKey;
}

/**
 * @param {{ vectorId: string, vector: number[], payload: object }[]} points
 */
async function upsertPoints(points) {
    if (!points.length) return;
    await ensureCollection(points[0].vector.length);
    const { qdrantCollection } = getAiConfig();
    await request(`/collections/${encodeURIComponent(qdrantCollection)}/points?wait=true`, {
        method: "PUT",
        body: {
            points: points.map((p) => ({ id: p.vectorId, vector: p.vector, payload: p.payload }))
        }
    });
}

async function deleteDocumentPoints(documentId) {
    const { qdrantCollection } = getAiConfig();
    try {
        await request(`/collections/${encodeURIComponent(qdrantCollection)}/points/delete?wait=true`, {
            method: "POST",
            body: { filter: { must: [{ key: "documentId", match: { value: Number(documentId) } }] } }
        });
    } catch (err) {
        if (err.status === 404) return; // Collection not created yet: nothing to delete
        throw err;
    }
}

/**
 * @returns {Promise<{ vectorId: string, score: number, payload: object }[]>}
 */
async function searchVector(vector, { topK = 4, scoreThreshold = 0.65 } = {}) {
    const { qdrantCollection } = getAiConfig();
    try {
        const data = await request(`/collections/${encodeURIComponent(qdrantCollection)}/points/search`, {
            method: "POST",
            body: { vector, limit: topK, with_payload: true, score_threshold: scoreThreshold }
        });
        return (data?.result || []).map((hit) => ({ vectorId: String(hit.id), score: hit.score, payload: hit.payload || {} }));
    } catch (err) {
        if (err.status === 404) return []; // No collection yet means nothing indexed
        throw err;
    }
}

function resetForTesting() {
    ensuredCollection = null;
}

module.exports = { upsertPoints, deleteDocumentPoints, searchVector, QdrantError, resetForTesting };
