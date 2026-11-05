import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function Button({
  children,
  className = "",
  variant = "primary", // primary, secondary, outline, ghost, danger, link
  size = "md", // sm, md, lg, icon
  isLoading = false,
  disabled = false,
  type = "button",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const variants = {
    primary:
      "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30",
    gradient:
      "bg-gradient-to-r from-blue-600 via-blue-700 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35",
    secondary:
      "bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-500/20 hover:shadow-md",
    outline:
      "border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-xs",
    ghost:
      "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20",
    subtle:
      "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5 font-medium",
    md: "text-sm px-4 py-2.5 gap-2",
    lg: "text-base px-6 py-3.5 gap-2.5 font-semibold",
    icon: "p-2.5 h-10 w-10",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}

export default Button;

