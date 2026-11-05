"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
  showClose = true,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200",
          maxWidth
        )}
        role="dialog"
        aria-modal="true"
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between p-5 border-b border-slate-100">
            <div>
              {title && (
                <h3 className="text-base font-semibold text-slate-900">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {description}
                </p>
              )}
            </div>

            {showClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default Modal;

