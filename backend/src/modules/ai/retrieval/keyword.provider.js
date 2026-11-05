/**
 * Keyword retrieval fallback — NOT semantic vector search (results are labelled retrievalMode "keyword").
 *
 * 1. MySQL FULLTEXT (natural language mode) selects candidate chunks containing any query term.
 * 2. Candidates are re-scored by query-term coverage (fraction of meaningful query terms found
 *    in the chunk, with light suffix stemming). InnoDB's raw relevance is unreliable for small
 *    knowledge bases (a term present in every row gets an IDF of ~0), so it is only used for ordering.
 * 3. Chunks below RAG_KEYWORD_MIN_COVERAGE are discarded so irrelevant content is not used.
 */
const sequelize = require("../../../config/database");

const STOPWORDS = new Set(
    ("a an and are as at be but by can could do does did for from had has have how i if in into is it its me my " +
        "of on or our should so than that the their them then there these they this to was we what when where which " +
        "who why will with would you your about explain tell please mean means meaning help understand know")
        .split(" ")
);

function getMinCoverage() {
    const value = Number(process.env.RAG_KEYWORD_MIN_COVERAGE);
    return Number.isFinite(value) && value > 0 && value <= 1 ? value : 0.5;
}

function stem(word) {
    return word.replace(/(ations?|ing|ed|es|s|e)$/i, "");
}

/**
 * Extract meaningful lowercase terms from a question.
 */
function extractTerms(query) {
    const words = String(query).toLowerCase().match(/[a-z0-9]+/g) || [];
    const terms = words.filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    return [...new Set(terms)].slice(0, 20);
}

function coverage(terms, content) {
    if (!terms.length) return 0;
    const text = String(content).toLowerCase();
    const hits = terms.filter((term) => {
        const root = stem(term);
        return text.includes(term) || (root.length >= 4 && text.includes(root));
    }).length;
    return hits / terms.length;
}

function cleanQuery(query) {
    return String(query).replace(/[+\-<>()~*"@]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
}

async function search(query, { topK = 4 } = {}) {
    const q = cleanQuery(query);
    const terms = extractTerms(q);
    if (!q || !terms.length) return [];

    const candidates = await sequelize.query(
        `SELECT c.id AS chunkId, c.document_id AS documentId, c.content,
                d.title, d.source_reference AS sourceReference, d.source_type AS sourceType,
                MATCH(c.content) AGAINST (:q IN NATURAL LANGUAGE MODE) AS ftScore
         FROM AI_KNOWLEDGE_CHUNKS c
         JOIN AI_KNOWLEDGE_DOCUMENTS d ON d.id = c.document_id
         WHERE d.indexing_status = 'INDEXED'
           AND MATCH(c.content) AGAINST (:q IN NATURAL LANGUAGE MODE)
         ORDER BY ftScore DESC
         LIMIT :limit`,
        { replacements: { q: terms.join(" "), limit: Math.max(topK * 5, 20) }, type: sequelize.QueryTypes.SELECT }
    );

    const minCoverage = getMinCoverage();
    return candidates
        .map((row) => {
            const { ftScore, ...rest } = row;
            return { ...rest, score: coverage(terms, `${row.title}\n${row.content}`), ftScore: Number(ftScore) };
        })
        .filter((row) => row.score >= minCoverage)
        .sort((a, b) => b.score - a.score || b.ftScore - a.ftScore)
        .slice(0, topK)
        .map(({ ftScore, ...row }) => row);
}

module.exports = { search, extractTerms, coverage };
