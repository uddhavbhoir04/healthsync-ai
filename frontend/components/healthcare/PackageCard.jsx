import React from "react";
import { Check, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import Button from "@/components/common/Button";

export function PackageCard({ pkg, onBookNow }) {
  const isRecommended = pkg.recommended;

  return (
    <div
      className={cn(
        "relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200",
        isRecommended
          ? "bg-gradient-to-b from-blue-900 via-slate-900 to-slate-900 text-white shadow-xl ring-2 ring-blue-500 shadow-blue-500/10"
          : "bg-white text-slate-900 border border-slate-200/90 shadow-xs hover:shadow-md"
      )}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-teal-400 text-white shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Recommended by Physicians</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={cn(
              "text-xs font-semibold px-2.5 py-0.5 rounded-full border",
              isRecommended
                ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                : "bg-slate-100 text-slate-700 border-slate-200"
            )}
          >
            {pkg.badge}
          </span>
          <span
            className={cn(
              "text-xs font-semibold",
              isRecommended ? "text-teal-400" : "text-teal-600"
            )}
          >
            {pkg.parametersCount}+ Vital Biomarkers
          </span>
        </div>

        <h3 className="text-lg font-bold tracking-tight mb-1">
          {pkg.name}
        </h3>
        <p
          className={cn(
            "text-xs leading-relaxed mb-6",
            isRecommended ? "text-slate-300" : "text-slate-500"
          )}
        >
          {pkg.idealFor}
        </p>

        {/* Pricing */}
        <div className="flex items-baseline gap-2 mb-6 pb-6 border-b border-slate-200/20">
          <span className="text-3xl font-extrabold tracking-tight">
            {formatCurrency(pkg.price)}
          </span>
          {pkg.originalPrice && (
            <span
              className={cn(
                "text-sm line-through",
                isRecommended ? "text-slate-400" : "text-slate-400"
              )}
            >
              {formatCurrency(pkg.originalPrice)}
            </span>
          )}
          <span className="text-xs font-medium text-emerald-400 ml-auto">
            Save {Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)}%
          </span>
        </div>

        {/* Feature bullets */}
        <div className="space-y-2.5 mb-8">
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-wider",
              isRecommended ? "text-slate-300" : "text-slate-400"
            )}
          >
            Included in this package:
          </p>
          <ul className="space-y-2 text-xs">
            {pkg.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    isRecommended
                      ? "bg-teal-500/20 text-teal-300"
                      : "bg-blue-50 text-blue-600"
                  )}
                >
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className={isRecommended ? "text-slate-200" : "text-slate-600"}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Button
        variant={isRecommended ? "gradient" : "outline"}
        size="lg"
        onClick={() => onBookNow?.(pkg)}
        className="w-full gap-2 font-semibold shadow-md"
      >
        <span>Book Full Package</span>
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default PackageCard;

