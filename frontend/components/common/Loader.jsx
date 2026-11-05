import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Loader({
  size = "md",
  label = "Loading...",
  className = "",
  fullScreen = false,
}) {
  const sizes = {
    sm: "w-4 h-4 text-blue-600",
    md: "w-8 h-8 text-blue-600",
    lg: "w-12 h-12 text-blue-600",
  };

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-3 p-4", className)}>
      <div className="relative">
        <Loader2 className={cn("animate-spin", sizes[size])} />
        <div className="absolute inset-0 rounded-full border border-blue-100 -z-10 scale-150 animate-ping opacity-25" />
      </div>
      {label && <p className="text-xs font-medium text-slate-500 animate-pulse">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return content;
}

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-100", className)}
      {...props}
    />
  );
}

export default Loader;

