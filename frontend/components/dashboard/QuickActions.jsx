import React from "react";
import Link from "next/link";
import { Search, BrainCircuit, CalendarPlus, FileCheck, ArrowRight } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "Find Lab Tests",
      desc: "Explore 150+ blood & diagnostic panels",
      icon: Search,
      href: "/dashboard/tests",
      color: "from-blue-600 to-indigo-600",
    },
    {
      title: "Gemini AI Assistant",
      desc: "Ask lab preparation & report queries",
      icon: BrainCircuit,
      href: "/dashboard/ai-assistant",
      color: "from-teal-600 to-emerald-600",
    },
    {
      title: "Diagnostic Packages",
      desc: "Executive body checkup discounts",
      icon: CalendarPlus,
      href: "/dashboard/tests?tab=packages",
      color: "from-indigo-600 to-purple-600",
    },
    {
      title: "Recent Reports",
      desc: "Download verified PDF certificates",
      icon: FileCheck,
      href: "/dashboard/bookings?tab=reports",
      color: "from-amber-600 to-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <Link
            key={act.title}
            href={act.href}
            className="group relative p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${act.color} flex items-center justify-center text-white shadow-sm mb-3 group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {act.title}
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {act.desc}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
              <span>Access tool</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default QuickActions;

