import React from "react";
import { 
  FlaskConical, 
  Clock, 
  ShieldCheck, 
  Star, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";

export function TestCard({
  test,
  onViewDetails,
  onBookNow,
  viewMode = "grid", // grid or list
}) {
  if (viewMode === "list") {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <FlaskConical className="w-6 h-6 stroke-[1.8]" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => onViewDetails?.(test)}>
                {test.name}
              </h4>
              {test.badge && (
                <Badge variant="primary" size="sm">
                  {test.badge}
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-500 max-w-xl line-clamp-1">
              {test.description}
            </p>

            <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
              <span className="font-semibold text-slate-700">{test.provider}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {test.turnaroundTime}
              </span>
              <span>•</span>
              <span className="text-teal-700 font-medium">{test.sampleType}</span>
            </div>
          </div>
        </div>

        <div className="flex sm:items-center justify-between md:flex-col md:items-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="text-right">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(test.price)}
              </span>
              {test.originalPrice && (
                <span className="text-xs text-slate-400 line-through">
                  {formatCurrency(test.originalPrice)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">Home Sample Included</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onViewDetails?.(test)}>
              Details
            </Button>
            <Button variant="primary" size="sm" onClick={() => onBookNow?.(test)}>
              Book Test
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div className="group rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all duration-200 flex flex-col justify-between overflow-hidden">
      <div className="p-5">
        {/* Top Badges & Category */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
            {test.category}
          </span>
          {test.badge && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {test.badge}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          onClick={() => onViewDetails?.(test)}
          className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-1 mb-1.5"
        >
          {test.name}
        </h3>

        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4 min-h-8">
          {test.description}
        </p>

        {/* Meta details */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Accredited Lab:</span>
            <span className="font-semibold text-slate-800 truncate max-w-44 text-right">
              {test.provider}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Turnaround:</span>
            <span className="font-medium text-slate-700 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {test.turnaroundTime}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Preparation:</span>
            <span className="font-medium text-amber-700 truncate max-w-44 text-right">
              {test.fastingRequired}
            </span>
          </div>
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-slate-900">
              {formatCurrency(test.price)}
            </span>
            {test.originalPrice && (
              <span className="text-[11px] text-slate-400 line-through">
                {formatCurrency(test.originalPrice)}
              </span>
            )}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block">
            Home Phlebotomy
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails?.(test)}
            className="text-xs"
          >
            Details
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onBookNow?.(test)}
            className="text-xs font-semibold gap-1"
          >
            <span>Book</span>
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TestCard;

