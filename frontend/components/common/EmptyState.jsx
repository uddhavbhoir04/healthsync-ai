import React from "react";
import { FolderSearch } from "lucide-react";
import Button from "./Button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = FolderSearch,
  title = "No records found",
  description = "We couldn't find any items matching your criteria.",
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 bg-white/60",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/60 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>

      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">{description}</p>

      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;

