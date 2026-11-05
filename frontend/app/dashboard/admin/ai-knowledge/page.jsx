"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { aiService } from "@/services/ai.service";
import {
  Lock,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Database,
  BookOpen,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const SOURCE_TYPES = ["FAQ", "LAB_TEST", "TERMINOLOGY", "PREPARATION", "EDUCATIONAL", "DOCUMENTATION"];

const STATUS_VARIANT = {
  INDEXED: "success",
  PENDING: "warning",
  INDEXING: "primary",
  FAILED: "danger",
};

const EMPTY_FORM = { title: "", sourceType: "EDUCATIONAL", sourceReference: "", content: "" };

function UsageOverview() {
  const [days, setDays] = useState(7);
  const [usage, setUsage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    aiService
      .getUsageOverview(days)
      .then((data) => !cancelled && setUsage(data))
      .catch((error) => !cancelled && toast.error(error.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const stat = (label, value) => (
    <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
    </div>
  );

  return (
    <section className="rounded-2xl bg-white border border-slate-200/80 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Activity className="w-4 h-4 text-blue-600" />
          AI usage overview
        </h2>
        <select
          value={days}
          onChange={(e) => {
            setIsLoading(true);
            setDays(Number(e.target.value));
          }}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
          aria-label="Usage period"
        >
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {isLoading || !usage ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stat("Requests", usage.totals.requests.toLocaleString())}
            {stat("Input tokens", usage.totals.inputTokens.toLocaleString())}
            {stat("Output tokens", usage.totals.outputTokens.toLocaleString())}
            {stat("Errors / limited", usage.errors.reduce((sum, e) => sum + e.count, 0).toLocaleString())}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">By feature</h3>
              {usage.byFeature.length === 0 ? (
                <p className="text-slate-400">No usage in this period.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-500 border-b border-slate-100">
                      <th className="py-1.5 font-semibold">Feature</th>
                      <th className="py-1.5 font-semibold">Status</th>
                      <th className="py-1.5 font-semibold text-right">Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.byFeature.map((row) => (
                      <tr key={`${row.feature}-${row.status}`} className="border-b border-slate-50">
                        <td className="py-1.5 text-slate-700">{row.feature}</td>
                        <td className="py-1.5 text-slate-500">{row.status}</td>
                        <td className="py-1.5 text-right tabular-nums">{row.requests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Top users</h3>
              {usage.topUsers.length === 0 ? (
                <p className="text-slate-400">No usage in this period.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-500 border-b border-slate-100">
                      <th className="py-1.5 font-semibold">User</th>
                      <th className="py-1.5 font-semibold text-right">Requests</th>
                      <th className="py-1.5 font-semibold text-right">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.topUsers.map((u) => (
                      <tr key={u.userId} className="border-b border-slate-50">
                        <td className="py-1.5 text-slate-700 truncate max-w-[180px]">{u.name || `User #${u.userId}`}</td>
                        <td className="py-1.5 text-right tabular-nums">{u.requests}</td>
                        <td className="py-1.5 text-right tabular-nums">{u.tokens.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Limits: {usage.limits.dailyUserLimit} chat requests and {usage.limits.dailyReportLimit} report uploads per user per day,{" "}
            {usage.limits.ratePerMinute} requests per minute.
          </p>
        </>
      )}
    </section>
  );
}

export default function AdminAiKnowledgePage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [retrievalMode, setRetrievalMode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [indexingIds, setIndexingIds] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await aiService.listKnowledge({ page, search, status: statusFilter });
      setDocuments(result.documents);
      setPagination(result.pagination);
      setRetrievalMode(result.retrievalMode);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    const timer = setTimeout(loadDocuments, 250);
    return () => clearTimeout(timer);
  }, [loadDocuments, user?.role]);

  if (user && user.role !== "ADMIN") {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
        <Link href="/dashboard">
          <Button variant="primary" size="sm">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEdit = async (doc) => {
    setFormErrors({});
    try {
      const full = await aiService.getKnowledge(doc.id);
      setEditingId(doc.id);
      setForm({
        title: full.title,
        sourceType: full.sourceType,
        sourceReference: full.sourceReference,
        content: full.content,
      });
      setIsModalOpen(true);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (form.title.trim().length < 3) errors.title = "Title is required (min 3 characters)";
    if (form.sourceReference.trim().length < 3) errors.sourceReference = "Source reference is required";
    if (form.content.trim().length < 50) errors.content = "Content must be at least 50 characters";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveDocument = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await aiService.updateKnowledge(editingId, form);
        toast.success("Document updated. Re-index it to refresh search results.");
      } else {
        await aiService.createKnowledge(form);
        toast.success("Document created. Index it to make it searchable.");
      }
      setIsModalOpen(false);
      loadDocuments();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const reindex = async (doc) => {
    setIndexingIds((prev) => new Set(prev).add(doc.id));
    try {
      const res = await aiService.indexKnowledge(doc.id, doc.indexingStatus === "INDEXED");
      toast.success(res.message || "Document indexed");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIndexingIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
      loadDocuments();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await aiService.deleteKnowledge(deleteTarget.id);
      toast.success("Document deleted");
      loadDocuments();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const fieldClass = "w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs";

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        badge="Admin"
        title="AI Knowledge Base"
        description="Approved healthcare content the AI assistant retrieves before answering."
        action={
          <Button variant="gradient" size="sm" onClick={openCreate} className="text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add document
          </Button>
        }
      />

      {retrievalMode && (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-700">
          <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Retrieval mode:{" "}
            {retrievalMode === "vector" ? (
              <strong>Semantic vector search (Gemini embeddings + Qdrant)</strong>
            ) : (
              <>
                <strong>Keyword search (MySQL full-text)</strong> — this is not semantic vector search. Set{" "}
                <code className="px-1 rounded bg-slate-200/70">QDRANT_URL</code> on the server to enable vector search.
              </>
            )}{" "}
            Documents in another mode need to be re-indexed after switching.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title or source reference…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_VARIANT).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No knowledge documents"
          description="Add approved healthcare content for the assistant to use."
          actionLabel="Add document"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200/80 overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50/70">
                <th className="py-3 px-4 font-semibold">Document</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Chunks</th>
                <th className="py-3 px-4 font-semibold">Last indexed</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => {
                const isIndexing = indexingIds.has(doc.id) || doc.indexingStatus === "INDEXING";
                return (
                  <tr key={doc.id} className="align-top hover:bg-slate-50/50">
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-slate-800">{doc.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 break-words">{doc.sourceReference}</p>
                      {doc.indexingStatus === "FAILED" && doc.indexingError && (
                        <p className="text-[11px] text-rose-600 mt-1 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          {doc.indexingError}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{doc.sourceType}</td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_VARIANT[doc.indexingStatus]} size="sm">{doc.indexingStatus}</Badge>
                      {doc.retrievalMode && doc.indexingStatus === "INDEXED" && (
                        <p className="text-[10px] text-slate-400 mt-1">{doc.retrievalMode}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">{doc.chunkCount}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {doc.lastIndexedAt ? new Date(doc.lastIndexedAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => reindex(doc)}
                          disabled={isIndexing}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1 cursor-pointer disabled:opacity-60"
                        >
                          <RefreshCw className={`w-3 h-3 ${isIndexing ? "animate-spin" : ""}`} />
                          {doc.indexingStatus === "INDEXED" ? "Reindex" : "Index"}
                        </button>
                        <button onClick={() => openEdit(doc)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 cursor-pointer" aria-label={`Edit ${doc.title}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(doc)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" aria-label={`Delete ${doc.title}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-slate-500">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <UsageOverview />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit knowledge document" : "Add knowledge document"}
        description="Only add verified, approved healthcare content. Do not paste unreviewed internet content."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={saveDocument} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Title *</label>
              <input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldClass} />
              {formErrors.title && <p className="text-rose-600 mt-1">{formErrors.title}</p>}
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Source type *</label>
              <select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })} className={fieldClass}>
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Source reference *</label>
            <input
              value={form.sourceReference}
              maxLength={500}
              placeholder="e.g. HealthSync Clinical Content Team — Lab Test Guide v2"
              onChange={(e) => setForm({ ...form, sourceReference: e.target.value })}
              className={fieldClass}
            />
            {formErrors.sourceReference && <p className="text-rose-600 mt-1">{formErrors.sourceReference}</p>}
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Content *</label>
            <textarea
              value={form.content}
              rows={12}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className={`${fieldClass} font-mono leading-relaxed`}
              placeholder="Separate topics with blank lines so they are chunked cleanly."
            />
            <div className="flex justify-between mt-1">
              {formErrors.content ? <p className="text-rose-600">{formErrors.content}</p> : <span />}
              <span className="text-slate-400 tabular-nums">{form.content.length.toLocaleString()} characters</span>
            </div>
          </div>
          {editingId && (
            <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Changing the title, reference or content removes the old index. Re-index the document after saving.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="gradient" size="sm" isLoading={isSaving}>
              {editingId ? "Save changes" : "Create document"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete knowledge document?"
        description={`"${deleteTarget?.title}" and its search index will be permanently removed.`}
        maxWidth="max-w-sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
