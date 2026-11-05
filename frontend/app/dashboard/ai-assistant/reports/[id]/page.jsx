"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import MarkdownMessage from "@/components/healthcare/MarkdownMessage";
import { aiService } from "@/services/ai.service";
import {
  ArrowLeft,
  ShieldAlert,
  Loader2,
  FileText,
  BookOpen,
  HelpCircle,
  Info,
  Trash2,
  Send,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

function Card({ icon: Icon, title, children, className = "" }) {
  return (
    <section className={`rounded-2xl bg-white border border-slate-200/80 p-5 shadow-2xs ${className}`}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
        {Icon && <Icon className="w-4 h-4 text-blue-600" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

const Unavailable = () => <span className="text-slate-400 italic">Not available</span>;

export default function ReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [askError, setAskError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await aiService.getReport(id);
        if (!cancelled) setReport(data);
      } catch (error) {
        if (!cancelled) {
          if (error.status === 404) setNotFound(true);
          else toast.error(error.message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const ask = async (event) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || isAsking) return;
    setIsAsking(true);
    setAskError(null);
    try {
      const data = await aiService.askReportQuestion(id, text);
      setAnswers((prev) => [...prev, { question: text, answer: data.answer }]);
      setQuestion("");
    } catch (error) {
      setAskError(error.message || "Could not get an answer. Please try again.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleDelete = async () => {
    try {
      await aiService.deleteReport(id);
      toast.success("Report deleted");
      router.push("/dashboard/ai-assistant/reports");
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <FileText className="w-10 h-10 text-slate-300 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Report not found</h2>
        <p className="text-xs text-slate-500">It may have been deleted, or you may not have access to it.</p>
        <Link href="/dashboard/ai-assistant/reports">
          <Button variant="primary" size="sm">Back to reports</Button>
        </Link>
      </div>
    );
  }

  const summary = report.summary;

  if (report.status !== "COMPLETED" || !summary) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Summary not available</h2>
        <p className="text-xs text-slate-500">{report.errorMessage || "This report has not been summarized yet."}</p>
        <Link href="/dashboard/ai-assistant/reports">
          <Button variant="primary" size="sm">Back to reports</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        badge="AI Report Summary"
        title={summary.reportTitle || report.fileName}
        description={`Uploaded ${new Date(report.createdAt).toLocaleString()} · ${report.fileName}${summary.reportDate ? ` · Report date: ${summary.reportDate}` : ""}`}
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/ai-assistant/reports">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                All reports
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 text-rose-600" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>{summary.disclaimer}</strong> Values below were extracted by AI from your document and have not been
          verified. Check them against your original report.
        </p>
      </div>

      <Card icon={Info} title="Summary">
        <p className="text-xs text-slate-700 leading-relaxed">{summary.summary}</p>
      </Card>

      <Card icon={FileText} title={`Observations (${summary.observations.length})`}>
        {summary.observations.length === 0 ? (
          <p className="text-xs text-slate-500">No individual values could be extracted from this document.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2 px-2 font-semibold">Parameter</th>
                    <th className="py-2 px-2 font-semibold">Value</th>
                    <th className="py-2 px-2 font-semibold">Unit</th>
                    <th className="py-2 px-2 font-semibold">Reference range</th>
                    <th className="py-2 px-2 font-semibold">Flag from document</th>
                    <th className="py-2 px-2 font-semibold w-2/5">What it measures (AI explanation)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.observations.map((o, index) => (
                    <tr key={`${o.parameter}-${index}`} className="align-top">
                      <td className="py-2.5 px-2 font-semibold text-slate-800">
                        {o.parameter}
                        {o.uncertain && (
                          <Badge variant="warning" size="sm" className="ml-1.5">uncertain</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-800">{o.reportedValue ?? <Unavailable />}</td>
                      <td className="py-2.5 px-2 text-slate-600">{o.unit ?? <Unavailable />}</td>
                      <td className="py-2.5 px-2 text-slate-600">{o.referenceRange ?? <Unavailable />}</td>
                      <td className="py-2.5 px-2">
                        {o.documentFlag ? <Badge variant="purple" size="sm">{o.documentFlag}</Badge> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 leading-relaxed">{o.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden space-y-3">
              {summary.observations.map((o, index) => (
                <li key={`${o.parameter}-m-${index}`} className="p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{o.parameter}</span>
                    <div className="flex gap-1">
                      {o.documentFlag && <Badge variant="purple" size="sm">{o.documentFlag}</Badge>}
                      {o.uncertain && <Badge variant="warning" size="sm">uncertain</Badge>}
                    </div>
                  </div>
                  <p className="font-mono text-slate-800">
                    {o.reportedValue ?? <Unavailable />} {o.unit}
                  </p>
                  <p className="text-slate-500">Reference range: {o.referenceRange ?? <Unavailable />}</p>
                  <p className="text-slate-600 leading-relaxed">{o.explanation}</p>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-400 mt-3">
              &ldquo;Report flag&rdquo; shows only flags printed on your document (e.g. H or L). The AI does not decide whether a value is normal.
            </p>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {summary.termsExplained.length > 0 && (
          <Card icon={BookOpen} title="Terms explained">
            <dl className="space-y-2.5 text-xs">
              {summary.termsExplained.map((t) => (
                <div key={t.term}>
                  <dt className="font-semibold text-slate-800">{t.term}</dt>
                  <dd className="text-slate-600 leading-relaxed">{t.explanation}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        {summary.questionsForDoctor.length > 0 && (
          <Card icon={HelpCircle} title="Questions to ask your doctor">
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              {summary.questionsForDoctor.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {summary.limitations.length > 0 && (
        <Card icon={AlertTriangle} title="Limitations of this summary">
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            {summary.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card icon={Bot} title="Ask about this report">
        <div className="space-y-4">
          {answers.map((item, index) => (
            <div key={index} className="space-y-2">
              <p className="text-xs font-semibold text-slate-800 bg-blue-50 rounded-xl px-3 py-2">{item.question}</p>
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2.5">
                <MarkdownMessage content={item.answer} />
              </div>
            </div>
          ))}
          {isAsking && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Looking at your report…
            </p>
          )}
          {askError && <p role="alert" className="text-xs text-rose-600">{askError}</p>}
          <form onSubmit={ask} className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={4000}
              placeholder="e.g. What does the hemoglobin value in my report mean?"
              className="flex-1 text-xs px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500"
              aria-label="Question about this report"
            />
            <Button type="submit" variant="gradient" size="md" disabled={!question.trim() || isAsking} aria-label="Ask">
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-[11px] text-slate-400">Answers use only this report&apos;s extracted data and general educational information.</p>
        </div>
      </Card>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete report?"
        description="This permanently deletes the report summary and its record."
        maxWidth="max-w-sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
