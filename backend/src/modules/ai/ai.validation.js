const { z } = require("zod");
const { AiKnowledgeDocument } = require("../../models");

const chatSchema = z.object({
    conversationId: z.coerce.number().int().positive().nullable().optional().default(null),
    message: z.string().trim().min(1, "Message is required").max(20000)
});

const renameConversationSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(150)
});

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

const reportQuestionSchema = z.object({
    question: z.string().trim().min(1, "Question is required").max(20000)
});

const knowledgeSchema = z.object({
    title: z.string().trim().min(3, "Title is required").max(200),
    sourceType: z.enum(AiKnowledgeDocument.SOURCE_TYPES),
    sourceReference: z.string().trim().min(3, "Source reference is required").max(500),
    content: z.string().trim().min(50, "Content must be at least 50 characters").max(200000)
});

const updateKnowledgeSchema = knowledgeSchema.partial().refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required"
});

const queryKnowledgeSchema = paginationSchema.extend({
    search: z.string().trim().max(100).optional(),
    status: z.enum(AiKnowledgeDocument.INDEXING_STATUSES).optional(),
    sourceType: z.enum(AiKnowledgeDocument.SOURCE_TYPES).optional()
});

const indexKnowledgeSchema = z.object({
    force: z.boolean().optional().default(false)
});

const usageQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(90).default(7)
});

module.exports = {
    chatSchema,
    renameConversationSchema,
    paginationSchema,
    reportQuestionSchema,
    knowledgeSchema,
    updateKnowledgeSchema,
    queryKnowledgeSchema,
    indexKnowledgeSchema,
    usageQuerySchema
};
