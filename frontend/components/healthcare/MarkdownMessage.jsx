"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * Safe Markdown renderer for AI responses.
 * react-markdown does not render raw HTML by default, so model output cannot inject markup.
 */
const components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h3 className="text-sm font-bold text-slate-900 mt-3 mb-1.5">{children}</h3>,
  h2: ({ children }) => <h3 className="text-sm font-bold text-slate-900 mt-3 mb-1.5">{children}</h3>,
  h3: ({ children }) => <h4 className="text-xs font-bold text-slate-900 mt-2.5 mb-1">{children}</h4>,
  h4: ({ children }) => <h4 className="text-xs font-bold text-slate-900 mt-2 mb-1">{children}</h4>,
  code: ({ children }) => (
    <code className="px-1 py-0.5 rounded bg-slate-200/70 text-[11px] font-mono text-slate-800">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] overflow-x-auto mb-2">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-blue-300 pl-3 text-slate-600 italic mb-2">{children}</blockquote>
  ),
  a: ({ href, children }) => {
    const safe = typeof href === "string" && /^(https?:|mailto:|\/)/i.test(href);
    return safe ? (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 underline underline-offset-2">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    );
  },
  img: () => null,
  hr: () => <hr className="my-3 border-slate-200" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="text-[11px] border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-slate-200 px-2 py-1 bg-slate-100 text-left">{children}</th>,
  td: ({ children }) => <td className="border border-slate-200 px-2 py-1">{children}</td>,
};

export function MarkdownMessage({ content, className = "" }) {
  return (
    <div className={cn("text-xs text-slate-800 break-words", className)}>
      <ReactMarkdown components={components} skipHtml>
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownMessage;
