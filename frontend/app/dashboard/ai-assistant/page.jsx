"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import MarkdownMessage from "@/components/healthcare/MarkdownMessage";
import { aiService, SUGGESTED_PROMPTS } from "@/services/ai.service";
import {
  Send,
  Plus,
  Trash2,
  Eraser,
  ShieldAlert,
  Bot,
  User,
  MessageSquare,
  BookOpen,
  RotateCcw,
  AlertTriangle,
  Pencil,
  Check,
  X,
  Menu,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const formatDay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

function SourceList({ sources, retrievalMode }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <BookOpen className="w-3 h-3" />
        <span>Sources</span>
        {retrievalMode === "keyword" && (
          <span
            className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-200/70 text-slate-600 normal-case tracking-normal font-medium"
            title="Sources were found by keyword matching, not semantic vector search."
          >
            keyword search
          </span>
        )}
      </div>
      <ul className="space-y-1">
        {sources.map((source) => (
          <li key={source.documentId} className="text-[11px] text-slate-600 leading-snug">
            <span className="font-medium text-slate-700">{source.title}</span>
            <span className="text-slate-400"> — {source.reference}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-md" aria-live="polite">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-1.5 text-xs">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
        <span className="text-[11px] font-medium text-slate-500 ml-1">Assistant is thinking...</span>
      </div>
    </div>
  );
}

function WelcomePanel({ onPick, disabled }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-md mb-4">
        <Bot className="w-6 h-6" />
      </div>
      <h2 className="text-base font-bold text-slate-900">How can I help you today?</h2>
      <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
        Ask about lab tests, report terminology, test preparation, or your own bookings and appointments.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt.title}
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt.query)}
            className="text-left px-3.5 py-3 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-xs text-slate-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {prompt.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [failedMessage, setFailedMessage] = useState(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmAction, setConfirmAction] = useState(null); // { type: "delete"|"clear", id }
  const [usage, setUsage] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const { conversations: list } = await aiService.listConversations();
      setConversations(list);
    } catch (error) {
      toast.error(error.message || "Could not load conversations");
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      setUsage(await aiService.getMyUsage());
    } catch {
      // Usage display is optional
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    aiService
      .listConversations()
      .then(({ conversations: list }) => !cancelled && setConversations(list))
      .catch((error) => !cancelled && toast.error(error.message || "Could not load conversations"))
      .finally(() => !cancelled && setIsLoadingConversations(false));
    aiService
      .getMyUsage()
      .then((data) => !cancelled && setUsage(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, failedMessage]);

  const openConversation = async (id) => {
    setMobileListOpen(false);
    if (id === activeConvId) return;
    setActiveConvId(id);
    setFailedMessage(null);
    setIsLoadingMessages(true);
    setMessages([]);
    try {
      const data = await aiService.getConversation(id);
      setMessages(data.messages || []);
    } catch (error) {
      toast.error(error.status === 404 ? "Conversation not found" : error.message);
      setActiveConvId(null);
      loadConversations();
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setFailedMessage(null);
    setMobileListOpen(false);
    inputRef.current?.focus();
  };

  const sendMessage = async (text) => {
    const query = (text ?? inputPrompt).trim();
    if (!query || isTyping) return;

    const optimistic = { id: `local-${Date.now()}`, role: "USER", content: query, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setInputPrompt("");
    setFailedMessage(null);
    setIsTyping(true);

    try {
      const data = await aiService.sendMessage({ conversationId: activeConvId, message: query });
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "ASSISTANT",
          content: data.message,
          sources: data.sources,
          retrievalMode: data.retrievalMode,
          emergency: data.emergency,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (!activeConvId) {
        setActiveConvId(data.conversationId);
      }
      loadConversations();
      loadUsage();
    } catch (error) {
      // Remove optimistic message; show retry bubble with the original text
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setFailedMessage({ text: query, error: error.message || "The assistant is unavailable right now." });
      if (error.status === 404) {
        setActiveConvId(null);
        loadConversations();
      }
    } finally {
      setIsTyping(false);
    }
  };

  const submitRename = async (id) => {
    const title = renameValue.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }
    try {
      await aiService.renameConversation(id, title);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
      toast.success("Conversation renamed");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRenamingId(null);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    try {
      if (type === "delete") {
        await aiService.deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConvId === id) startNewConversation();
        toast.success("Conversation deleted");
      } else {
        await aiService.clearConversation(id);
        if (activeConvId === id) setMessages([]);
        toast.success("Conversation cleared");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setConfirmAction(null);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const conversationList = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Conversations</span>
        <button
          onClick={startNewConversation}
          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
          title="New conversation"
          aria-label="New conversation"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 py-3">
        {isLoadingConversations ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-[11px] text-slate-400 text-center py-6">No conversations yet.</p>
        ) : (
          conversations.map((conv) => {
            const isActive = activeConvId === conv.id;
            return (
              <div
                key={conv.id}
                className={cn(
                  "group w-full p-3 rounded-2xl transition-all flex items-start gap-2.5",
                  isActive
                    ? "bg-white shadow-xs border border-blue-200 text-slate-900"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent"
                )}
              >
                <MessageSquare className={cn("w-4 h-4 shrink-0 mt-0.5", isActive ? "text-blue-600" : "text-slate-400")} />
                {renamingId === conv.id ? (
                  <form
                    className="flex-1 flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitRename(conv.id);
                    }}
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      maxLength={150}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 min-w-0 text-xs px-2 py-1 rounded-lg border border-blue-300 focus:outline-none"
                    />
                    <button type="submit" className="p-1 text-emerald-600 cursor-pointer" aria-label="Save title">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setRenamingId(null)} className="p-1 text-slate-400 cursor-pointer" aria-label="Cancel">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <button onClick={() => openConversation(conv.id)} className="min-w-0 flex-1 text-left cursor-pointer">
                      <p className={cn("text-xs truncate", isActive && "font-semibold")}>{conv.title}</p>
                      <span className="text-[10px] text-slate-400">{formatDay(conv.updatedAt)}</span>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setRenamingId(conv.id);
                          setRenameValue(conv.title);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 cursor-pointer"
                        aria-label="Rename conversation"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: "delete", id: conv.id })}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 cursor-pointer"
                        aria-label="Delete conversation"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <Link
        href="/dashboard/ai-assistant/reports"
        className="p-3.5 rounded-2xl bg-gradient-to-tr from-teal-50 to-blue-50 border border-teal-100/80 text-xs text-teal-900 space-y-1 hover:border-teal-300 transition-colors"
      >
        <div className="flex items-center gap-1.5 font-bold text-teal-800">
          <FileText className="w-3.5 h-3.5 text-teal-600" />
          <span>Report Insights</span>
        </div>
        <p className="text-[11px] text-teal-700 leading-relaxed">
          Upload a lab report (PDF or image) for an easy-to-read AI summary.
        </p>
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Powered by Google Gemini"
        title="AI Healthcare Assistant"
        description="Educational assistant for lab tests, report terminology, test preparation and your bookings."
        action={
          <div className="flex items-center gap-2">
            {activeConvId && messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction({ type: "clear", id: activeConvId })}
                className="text-xs gap-1.5"
              >
                <Eraser className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear</span>
              </Button>
            )}
            <Button variant="gradient" size="sm" onClick={startNewConversation} className="text-xs font-semibold gap-1.5 shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>New Conversation</span>
            </Button>
          </div>
        }
      />

      <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Safety notice:</strong> This assistant provides general health education only. It does not diagnose
          conditions or prescribe treatment. For a medical emergency, contact your local emergency services immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 h-[calc(100dvh-16rem)] min-h-[520px] max-h-[760px] rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Conversation sidebar (desktop) */}
        <aside className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col border-r border-slate-100 bg-slate-50/60 p-4 min-h-0">
          {conversationList}
        </aside>

        {/* Chat window */}
        <section className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0 bg-white relative">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
            <button
              onClick={() => setMobileListOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Show conversations"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-700 truncate">
              {activeConversation?.title || "New conversation"}
            </span>
          </div>

          <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-5">
            {isLoadingMessages ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : messages.length === 0 && !isTyping && !failedMessage ? (
              <WelcomePanel onPick={sendMessage} disabled={isTyping} />
            ) : (
              messages.map((msg) => {
                const isAssistant = msg.role === "ASSISTANT";
                return (
                  <div key={msg.id} className={cn("flex gap-3 max-w-2xl", isAssistant ? "mr-auto" : "ml-auto flex-row-reverse")}>
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                        isAssistant ? "bg-gradient-to-tr from-blue-600 to-teal-500 text-white" : "bg-slate-900 text-white"
                      )}
                    >
                      {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div
                        className={cn(
                          "p-4 rounded-2xl text-xs leading-relaxed",
                          isAssistant
                            ? "bg-slate-50 text-slate-800 border border-slate-200/80 shadow-2xs"
                            : "bg-blue-600 text-white shadow-xs font-medium whitespace-pre-wrap break-words"
                        )}
                      >
                        {isAssistant ? (
                          <>
                            <MarkdownMessage content={msg.content} />
                            <SourceList sources={msg.sources} retrievalMode={msg.retrievalMode} />
                          </>
                        ) : (
                          msg.content
                        )}
                      </div>
                      <span className={cn("text-[10px] text-slate-400 block px-1", !isAssistant && "text-right")}>
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {isTyping && <TypingIndicator />}

            {failedMessage && !isTyping && (
              <div className="ml-auto max-w-md">
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold">Message not sent</p>
                      <p className="text-rose-700 mt-0.5">{failedMessage.error}</p>
                      <p className="text-rose-600/80 mt-1.5 italic truncate">&ldquo;{failedMessage.text}&rdquo;</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setInputPrompt(failedMessage.text);
                        setFailedMessage(null);
                        inputRef.current?.focus();
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-rose-700 hover:bg-rose-100 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => sendMessage(failedMessage.text)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length > 0 && (
            <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-400 font-semibold text-[11px] shrink-0">Suggested:</span>
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  disabled={isTyping}
                  onClick={() => sendMessage(p.query)}
                  className="px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 whitespace-nowrap text-[11px] font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 sm:p-4 border-t border-slate-200/80 bg-white"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputPrompt}
                maxLength={4000}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about lab tests, report terms, or test preparation..."
                className="flex-1 resize-none max-h-32 text-xs px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 transition-all placeholder:text-slate-400"
                aria-label="Message"
              />
              <Button
                type="submit"
                variant="gradient"
                size="md"
                disabled={!inputPrompt.trim() || isTyping}
                className="font-semibold shadow-xs shrink-0"
                aria-label="Send message"
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-400">
              <span>Educational information only — not a medical diagnosis.</span>
              {usage && (
                <span>
                  {Math.max(usage.chat.limit - usage.chat.used, 0)} of {usage.chat.limit} AI requests left today
                </span>
              )}
            </div>
          </form>

          {/* Mobile conversation drawer */}
          {mobileListOpen && (
            <div className="lg:hidden absolute inset-0 z-20 flex">
              <div className="w-4/5 max-w-xs h-full bg-slate-50 p-4 shadow-xl border-r border-slate-200 flex flex-col">
                <div className="flex justify-end mb-1">
                  <button onClick={() => setMobileListOpen(false)} className="p-1 text-slate-500 cursor-pointer" aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0">{conversationList}</div>
              </div>
              <button className="flex-1 bg-slate-900/30" onClick={() => setMobileListOpen(false)} aria-label="Close conversations" />
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === "delete" ? "Delete conversation?" : "Clear conversation?"}
        description={
          confirmAction?.type === "delete"
            ? "This permanently deletes the conversation and all its messages."
            : "This permanently deletes all messages in this conversation. The conversation itself is kept."
        }
        maxWidth="max-w-sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={runConfirmedAction}>
            {confirmAction?.type === "delete" ? "Delete" : "Clear"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
