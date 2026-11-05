"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { aiService, REPORT_ACCEPT, REPORT_MAX_MB } from "@/services/ai.service";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
  ShieldAlert,
  Loader2,
  ChevronRight,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_BADGE = {
  COMPLETED: { variant: "success", label: "Summary ready" },
  PROCESSING: { variant: "warning", label: "Processing" },
  FAILED: { variant: "danger", label: "Failed" },
};

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function ReportsPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [upload, setUpload] = useState(null); // { name, progress, phase: "uploading"|"processing" }
  const [uploadError, setUploadError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const { reports: list } = await aiService.listReports({ limit: 50 });
      setReports(list);
    } catch (error) {
      toast.error(error.message || "Could not load reports");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    aiService
      .listReports({ limit: 50 })
      .then(({ reports: list }) => !cancelled && setReports(list))
      .catch((error) => !cancelled && toast.error(error.message || "Could not load reports"))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFile = async (file) => {
    if (upload) return;
    setUploadError(null);
    const validationError = aiService.validateReportFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUpload({ name: file.name, progress: 0, phase: "uploading" });
    try {
      const result = await aiService.uploadReport(file, (progress, phase) => {
        setUpload((prev) => (prev ? { ...prev, progress, phase: phase || (progress >= 100 ? "processing" : "uploading") } : prev));
      });
      toast.success(result.duplicate ? "This report was already summarized" : "Report summary ready");
      router.push(`/dashboard/ai-assistant/reports/${result.data.id}`);
    } catch (error) {
      setUploadError(error.message || "Upload failed");
      loadReports();
    } finally {
      setUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await aiService.deleteReport(deleteTarget.id);
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success("Report deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const acceptAttr = Object.entries(REPORT_ACCEPT)
    .flatMap(([mime, exts]) => [mime, ...exts])
    .join(",");

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        badge="AI Report Insights"
        title="Medical Report Summaries"
        description="Upload a lab report to get a plain-language explanation of its contents."
        action={
          <Link href="/dashboard/ai-assistant">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              AI Assistant
            </Button>
          </Link>
        }
      />

      <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          AI summaries explain what a report contains. They are <strong>not a diagnosis</strong> and may contain
          extraction mistakes. Always review your results with a qualified doctor.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!upload) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center transition-colors bg-white",
          isDragging ? "border-blue-500 bg-blue-50/50" : "border-slate-200",
          upload && "pointer-events-none"
        )}
      >
        {upload ? (
          <div className="max-w-sm mx-auto space-y-3" aria-live="polite">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800 truncate">{upload.name}</p>
            {upload.phase === "uploading" ? (
              <>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all" style={{ width: `${upload.progress}%` }} />
                </div>
                <p className="text-xs text-slate-500">Uploading… {upload.progress}%</p>
              </>
            ) : (
              <p className="text-xs text-slate-500">Analyzing your report with AI. This can take up to a minute…</p>
            )}
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Drag and drop your report here</p>
            <p className="text-xs text-slate-500 mt-1">PDF, JPG or PNG · up to {REPORT_MAX_MB} MB</p>
            <Button variant="gradient" size="sm" className="mt-4 text-xs" onClick={() => fileInputRef.current?.click()}>
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <p className="text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" />
              Files are processed privately and are not stored after the summary is created.
            </p>
          </>
        )}
        {uploadError && (
          <p role="alert" className="mt-4 text-xs font-medium text-rose-600">
            {uploadError}
          </p>
        )}
      </div>

      {/* History */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Report history</h2>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Upload a lab report above to see an AI-generated summary."
          />
        ) : (
          <ul className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {reports.map((report) => {
              const badge = STATUS_BADGE[report.status] || STATUS_BADGE.PROCESSING;
              const Icon = report.fileType === "application/pdf" ? FileText : ImageIcon;
              const clickable = report.status === "COMPLETED";
              return (
                <li key={report.id} className="flex items-center gap-3 p-4 hover:bg-slate-50/70">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <button
                    disabled={!clickable}
                    onClick={() => router.push(`/dashboard/ai-assistant/reports/${report.id}`)}
                    className="flex-1 min-w-0 text-left cursor-pointer disabled:cursor-default"
                  >
                    <p className="text-xs font-semibold text-slate-800 truncate">{report.reportTitle || report.fileName}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {report.fileName} · {formatSize(report.fileSize)} · {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                    {report.status === "FAILED" && report.errorMessage && (
                      <p className="text-[11px] text-rose-600 mt-0.5">{report.errorMessage}</p>
                    )}
                  </button>
                  <Badge variant={badge.variant} size="sm" className="hidden sm:inline-flex">
                    {badge.label}
                  </Badge>
                  <button
                    onClick={() => setDeleteTarget(report)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    aria-label={`Delete ${report.fileName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {clickable && <ChevronRight className="w-4 h-4 text-slate-300 hidden sm:block" />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete report?"
        description="This permanently deletes the report summary and its record."
        maxWidth="max-w-sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDelete} isLoading={isDeleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
