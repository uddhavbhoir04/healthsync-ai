import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  variant = "blue", // blue, teal, emerald, amber, purple
  className = "",
}) {
  const iconVariants = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <div
      className={cn(
        "relative p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        {Icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
              iconVariants[variant] || iconVariants.blue
            )}
          >
            <Icon className="w-5 h-5 stroke-[1.8]" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 font-semibold",
                trendPositive ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {trendPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend}</span>
            </div>
          )}

          {subtitle && (
            <span className="text-slate-400 truncate max-w-full">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default StatCard;

