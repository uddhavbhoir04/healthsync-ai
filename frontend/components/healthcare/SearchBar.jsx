import React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({
  value = "",
  onChange,
  onClear,
  placeholder = "Search blood tests, biomarker profiles, health packages...",
  className = "",
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
        <Search className="w-5 h-5 text-blue-600" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-3.5 text-sm rounded-2xl bg-white border border-slate-200/90 shadow-xs placeholder:text-slate-400 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
      />

      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default SearchBar;

