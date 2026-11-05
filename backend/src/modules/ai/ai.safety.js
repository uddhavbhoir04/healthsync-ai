/**
 * Safety helpers: disclaimers, emergency detection, and PII minimisation
 * before content is sent to the model.
 */
const CHAT_DISCLAIMER = "This information is educational and is not a medical diagnosis. Please consult a qualified healthcare professional for personal medical advice.";
const REPORT_DISCLAIMER = "This is an AI-generated explanation, not a medical diagnosis. Please review your report with a qualified doctor.";
const EMERGENCY_NOTICE = "If you or someone else may be experiencing a medical emergency, contact your local emergency services or go to the nearest emergency department immediately.";

const EMERGENCY_PATTERNS = [
    /chest pain/i,
    /can'?t breathe|cannot breathe|difficulty breathing|shortness of breath|struggling to breathe/i,
    /heart attack|stroke/i,
    /face (is )?droop|slurred speech/i,
    /unconscious|passed out|unresponsive|fainted/i,
    /seizure/i,
    /severe bleeding|bleeding (heavily|a lot)|won'?t stop bleeding/i,
    /suicid|kill (myself|me)|end my life|self[- ]harm/i,
    /overdose|poison(ed|ing)?/i,
    /anaphyla|throat (is )?(closing|swelling)/i
];

function detectEmergency(text = "") {
    return EMERGENCY_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Redact common direct identifiers. Clinical values are left intact.
 */
function redactIdentifiers(text = "") {
    return String(text)
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
        // Phone numbers: optional +country code, then 10-13 digits with single space/dash separators.
        // Lab ranges like "150000 - 450000" are not matched (spaced dash breaks the digit chain).
        .replace(/(?:\+\d{1,3}[\s-]?)?\b\d(?:[\s-]?\d){9,12}\b/g, "[phone redacted]")
        // Long ID-like digit runs (Aadhaar, SSN-like, card numbers)
        .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}(?:[\s-]?\d{4})?\b/g, "[id redacted]")
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[id redacted]");
}

/**
 * Sanitize an uploaded filename for storage/display (no paths, no control chars).
 */
function sanitizeFileName(name = "report") {
    const base = String(name).split(/[\\/]/).pop() || "report";
    const cleaned = base
        .normalize("NFKD")
        .replace(/[^\w.\- ]+/g, "")
        .replace(/\s+/g, " ")
        .replace(/^\.+/, "")
        .trim()
        .slice(0, 120);
    return cleaned || "report";
}

module.exports = {
    CHAT_DISCLAIMER,
    REPORT_DISCLAIMER,
    EMERGENCY_NOTICE,
    detectEmergency,
    redactIdentifiers,
    sanitizeFileName
};
