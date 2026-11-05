"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchService } from "@/services/search.service";
import {
  Search,
  Stethoscope,
  FlaskConical,
  Package,
  X,
  Loader2,
  ArrowRight,
  TrendingDown,
} from "lucide-react";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await searchService.globalSearch({ q: query.trim(), limit: 5 });
        setResults(res?.results || res?.data?.results || null);
        setIsOpen(true);
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  const hasDoctors = results?.doctors?.length > 0;
  const hasTests = results?.labTests?.length > 0;
  const hasPackages = results?.packages?.length > 0;
  const hasAny = hasDoctors || hasTests || hasPackages;

  return (
    <div ref={dropdownRef} className="relative w-64 lg:w-96">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search doctors, lab tests, packages..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim().length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (results && hasAny) setIsOpen(true);
          }}
          className="w-full pl-9.5 pr-8 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
        />

        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600 animate-spin" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-96 overflow-y-auto">
          {isLoading && !results && (
            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              Searching clinical directory...
            </div>
          )}

          {!isLoading && !hasAny && (
            <div className="p-4 text-center text-xs text-slate-400">
              No clinical entities found for &quot;{query}&quot;
            </div>
          )}

          {hasAny && (
            <div className="space-y-3 divide-y divide-slate-100 text-xs">
              {/* Doctors Category */}
              {hasDoctors && (
                <div className="space-y-1 pt-1 first:pt-0">
                  <div className="flex items-center gap-1.5 px-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <Stethoscope className="w-3 h-3 text-blue-600" />
                    <span>Doctors & Specialists</span>
                  </div>
                  {results.doctors.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelect(`/dashboard/doctors/${doc.id}`)}
                      className="w-full text-left p-2 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600 truncate">
                          {doc.doctorName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {doc.specialization} • {doc.city}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 shrink-0 ml-2">
                        ${Number(doc.consultationFee).toFixed(0)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Lab Tests Category */}
              {hasTests && (
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-1.5 px-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <FlaskConical className="w-3 h-3 text-teal-600" />
                    <span>Laboratory Tests</span>
                  </div>
                  {results.labTests.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelect("/dashboard/lab-tests")}
                      className="w-full text-left p-2 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600 truncate">
                          {t.testName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Code: {t.testCode} • {t.category}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-900 shrink-0 ml-2">
                        ${Number(t.price).toFixed(0)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Diagnostic Packages Category */}
              {hasPackages && (
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-1.5 px-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <Package className="w-3 h-3 text-indigo-600" />
                    <span>Diagnostic Packages</span>
                  </div>
                  {results.packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handleSelect(`/dashboard/packages/${pkg.id}`)}
                      className="w-full text-left p-2 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600 truncate">
                          {pkg.packageName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {pkg.testCount || pkg.tests?.length || 0} Assays Included
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-[11px] font-bold text-slate-900">
                          ${Number(pkg.offerPrice).toFixed(0)}
                        </span>
                        {pkg.savings > 0 && (
                          <span className="block text-[9px] font-semibold text-emerald-700">
                            Save ${pkg.savings.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

