"use client";

import React, { useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/common/PageHeader";
import SearchBar from "@/components/healthcare/SearchBar";
import TestCard from "@/components/healthcare/TestCard";
import PackageCard from "@/components/healthcare/PackageCard";
import TestDetailModal from "@/components/healthcare/TestDetailModal";
import EmptyState from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Loader";
import Button from "@/components/common/Button";
import {
  testsService,
  LAB_CATEGORIES,
  LAB_PROVIDERS,
} from "@/services/tests.service";
import { bookingsService } from "@/services/bookings.service";
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  FlaskConical,
  Package,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export default function FindLabTestsPage() {
  const [activeTab, setActiveTab] = useState("tests"); // tests or packages
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedProvider, setSelectedProvider] = useState("All Providers");
  const [sortBy, setSortBy] = useState("popular");
  const [maxPrice, setMaxPrice] = useState(250);

  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal for test booking
  const [selectedTest, setSelectedTest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      testsService.getTests({
        category: selectedCategory,
        provider: selectedProvider,
        search,
        sort: sortBy,
        maxPrice,
      }),
      testsService.getPackages(),
    ])
      .then(([testsData, packagesData]) => {
        if (isMounted) {
          setTests(testsData);
          setPackages(packagesData);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, selectedProvider, search, sortBy, maxPrice]);

  const handleBookTest = (test) => {
    setSelectedTest(test);
    setIsModalOpen(true);
  };

  const handleBookingConfirmed = async (bookingData) => {
    await bookingsService.createBooking(bookingData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Accredited Diagnostics"
        title="Find Clinical Lab Tests & Biomarkers"
        description="Search across 150+ individual pathology tests and physician-designed wellness screening packages with home phlebotomy collection."
        action={
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("tests")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "tests"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Individual Tests ({tests.length})
            </button>
            <button
              onClick={() => setActiveTab("packages")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "packages"
                  ? "bg-white text-teal-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Diagnostic Packages ({packages.length})
            </button>
          </div>
        }
      />

      {/* Main Search & Quick Filters */}
      <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch("")}
          placeholder="Search by test name, biomarker (e.g. Cholesterol, HbA1c, Vitamin D, TSH)..."
        />

        {/* Categories Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {LAB_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Filter Row: Provider, Price Range, Sort, Grid/List */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Provider Filter */}
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500"
            >
              {LAB_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="popular">Sort: Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>

            {/* Price slider */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
              <span>Max:</span>
              <input
                type="range"
                min="20"
                max="250"
                step="10"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-20 accent-blue-600 cursor-pointer"
              />
              <span className="font-bold text-slate-900">${maxPrice}</span>
            </div>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4"
            >
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 1: Individual Tests */}
      {!isLoading && activeTab === "tests" && (
        <>
          {tests.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No diagnostic tests found"
              description={`No tests match your current search "${search}" and filters.`}
              actionLabel="Clear Filters"
              onAction={() => {
                setSearch("");
                setSelectedCategory("All Categories");
                setSelectedProvider("All Providers");
                setMaxPrice(250);
              }}
            />
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {tests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  viewMode={viewMode}
                  onViewDetails={handleBookTest}
                  onBookNow={handleBookTest}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Diagnostic Packages */}
      {!isLoading && activeTab === "packages" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onBookNow={(selected) => {
                  setSelectedTest({
                    name: selected.name,
                    price: selected.price,
                    originalPrice: selected.originalPrice,
                    category: "Comprehensive Package",
                    provider: "HealthSync Central Labs",
                    description: selected.idealFor,
                    fastingRequired: "12 hours fasting required",
                  });
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>

          {/* Package Comparison Table */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Diagnostic Package Comparison Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Detailed breakdown of biomarker parameters included in each tier.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Biomarker Category</th>
                    <th className="p-3.5">Essential Baseline ($89)</th>
                    <th className="p-3.5 bg-blue-50/50 text-blue-900">Executive Vitality ($199)</th>
                    <th className="p-3.5">Cardiac Shield ($159)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3.5 font-medium text-slate-800">Complete Blood Count (CBC)</td>
                    <td className="p-3.5 text-emerald-600 font-bold">✓ Included</td>
                    <td className="p-3.5 bg-blue-50/30 text-emerald-600 font-bold">✓ Included</td>
                    <td className="p-3.5 text-emerald-600 font-bold">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-medium text-slate-800">Advanced Lipid & ApoB</td>
                    <td className="p-3.5 text-slate-400">Basic Lipid</td>
                    <td className="p-3.5 bg-blue-50/30 text-emerald-600 font-bold">✓ Advanced ApoB</td>
                    <td className="p-3.5 text-emerald-600 font-bold">✓ Full Subfractions</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-medium text-slate-800">Thyroid Hormone Trio (TSH, FT3, FT4)</td>
                    <td className="p-3.5 text-slate-400">—</td>
                    <td className="p-3.5 bg-blue-50/30 text-emerald-600 font-bold">✓ Included</td>
                    <td className="p-3.5 text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-medium text-slate-800">Vitamins D3 & B12 Vitality</td>
                    <td className="p-3.5 text-slate-400">—</td>
                    <td className="p-3.5 bg-blue-50/30 text-emerald-600 font-bold">✓ Included</td>
                    <td className="p-3.5 text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-medium text-slate-800">Home Phlebotomy Collection</td>
                    <td className="p-3.5 text-emerald-600 font-bold">✓ Free</td>
                    <td className="p-3.5 bg-blue-50/30 text-emerald-600 font-bold">✓ Priority Slot</td>
                    <td className="p-3.5 text-emerald-600 font-bold">✓ Free</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      <TestDetailModal
        test={selectedTest}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookSuccess={handleBookingConfirmed}
      />
    </div>
  );
}

