"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import EmptyState from "@/components/common/EmptyState";
import { packagesService } from "@/services/packages.service";
import {
  Package,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Tag,
  CheckCircle2,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPackages = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await packagesService.getPublicPackages({
          page: pageToLoad,
          limit: 9,
          search: search.trim() || undefined,
          sortBy,
          sortOrder,
        });

        const list = res?.data || res?.packages || [];
        setPackages(list);
        if (res?.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error("Failed to load diagnostic packages:", err);
        toast.error("Failed to load packages", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [search, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchPackages(1);
  }, [fetchPackages]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPackages(1);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          badge="Bundled Diagnostics"
          title="Preventive Healthcare Packages"
          description="Curated multi-parameter health checkup bundles providing comprehensive biomarker screening at discounted rates."
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by package name or health check battery..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-20 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Sort By */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">Sort:</span>
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split(":");
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="createdAt:DESC">Newest Packages</option>
            <option value="offer_price:ASC">Price: Low to High</option>
            <option value="offer_price:DESC">Price: High to Low</option>
            <option value="package_name:ASC">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Packages Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 animate-pulse"
            >
              <div className="h-32 bg-slate-200 rounded-2xl" />
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <EmptyState
            icon={Package}
            title="No diagnostic packages found"
            description="Try modifying your keyword search or clear current filters."
            action={{
              label: "Reset Search",
              onClick: () => {
                setSearch("");
              },
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => {
            const orig = Number(pkg.originalPrice) || 0;
            const offer = Number(pkg.offerPrice) || 0;
            const savings = Math.max(0, orig - offer);

            return (
              <div
                key={pkg.id}
                className="group flex flex-col justify-between p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-300 transition-all duration-200 shadow-xs hover:shadow-md"
              >
                <div>
                  {/* Package Image or Banner */}
                  <div className="relative mb-4 overflow-hidden rounded-2xl bg-slate-100 h-36">
                    {pkg.image ? (
                      <img
                        src={pkg.image}
                        alt={pkg.packageName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 text-white">
                        <Package className="w-12 h-12 opacity-80" />
                      </div>
                    )}

                    {/* Savings Badge */}
                    {savings > 0 && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-600/95 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Save ${savings.toFixed(0)}
                      </div>
                    )}

                    {/* Included Tests Pill */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-0.5 bg-white/95 backdrop-blur-xs text-slate-800 text-[10px] font-bold rounded-lg shadow-xs flex items-center gap-1">
                      <FlaskConical className="w-3 h-3 text-blue-600" />
                      {pkg.testCount || pkg.tests?.length || 0} Clinical Assays
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
                    {pkg.packageName}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                    {pkg.description || "Comprehensive multi-parameter screening panel."}
                  </p>

                  {/* Pricing Overview */}
                  <div className="flex items-baseline gap-2 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 mb-4">
                    <span className="text-lg font-black text-slate-900">
                      ${offer.toFixed(2)}
                    </span>
                    {orig > offer && (
                      <span className="text-xs text-slate-400 line-through">
                        ${orig.toFixed(2)}
                      </span>
                    )}
                    <span className="text-[10px] text-teal-700 font-semibold ml-auto bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                      Bundle Discount
                    </span>
                  </div>
                </div>

                {/* View Details Link */}
                <div className="pt-2">
                  <Link href={`/dashboard/packages/${pkg.id}`} className="block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between font-semibold group-hover:border-blue-500 group-hover:text-blue-600"
                    >
                      <span>Inspect Included Tests</span>
                      <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {packages.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-slate-800">{pagination.total}</span> packages
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPackages(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            <span className="px-3 py-1 text-slate-700 font-semibold bg-slate-50 rounded-lg border border-slate-200">
              {pagination.page} / {pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPackages(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

