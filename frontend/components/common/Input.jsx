import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    endIcon: EndIcon,
    onEndIconClick,
    className = "",
    containerClassName = "",
    id,
    type = "text",
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={cn("w-full space-y-1.5", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative rounded-xl shadow-xs transition-all duration-200">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200",
            "focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10",
            "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
            Icon && "pl-10",
            EndIcon && "pr-10",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10",
            className
          )}
          {...props}
        />

        {EndIcon && (
          <button
            type="button"
            onClick={onEndIconClick}
            tabIndex={onEndIconClick ? 0 : -1}
            className={cn(
              "absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400",
              onEndIconClick ? "cursor-pointer hover:text-slate-600 focus:outline-none" : "pointer-events-none"
            )}
          >
            <EndIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-500 font-medium flex items-center gap-1 mt-1">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;

