import React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  badge,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/80 mb-6",
        className
      )}
    >
      <div className="space-y-1">
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 mb-1">
            {badge}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
}

export default PageHeader;

