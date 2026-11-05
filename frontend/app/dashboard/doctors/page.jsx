"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import EmptyState from "@/components/common/EmptyState";
import { doctorsService } from "@/services/doctors.service";
import { getInitials } from "@/lib/auth";
import {
  Stethoscope,
  Search,
  Filter,
  MapPin,
  Calendar,
  GraduationCap,
  Award,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [sortBy, setSortBy] = useState("experience_years");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [isLoading, setIsLoading] = useState(true);

  // Load specializations on mount
  useEffect(() => {
    async function loadSpecs() {
      try {
        const res = await doctorsService.getSpecializations();
        setSpecializations(res?.data || res?.specializations || []);
      } catch (err) {
        console.error("Failed to load specializations:", err);
      }
    }
    loadSpecs();
  }, []);

  const fetchDoctors = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await doctorsService.getPublicDoctors({
          page: pageToLoad,
          limit: 9,
          search: search.trim() || undefined,
          specialization: selectedSpec !== "all" ? selectedSpec : undefined,
          city: selectedCity !== "all" ? selectedCity : undefined,
          sortBy,
          sortOrder,
        });

        const list = res?.data || res?.doctors || [];
        setDoctors(list);
        if (res?.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
        toast.error("Failed to load doctor directory", {
          description: err.message || "Please refresh the page.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [search, selectedSpec, selectedCity, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchDoctors(1);
  }, [fetchDoctors]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDoctors(1);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          badge="Clinical Directory"
          title="Find Medical Specialists"
          description="Browse certified medical specialists, review credentials, consultation fees, and inspect weekly clinical availability."
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by doctor name, specialty, or hospital city..."
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Specialization Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Specialty:</span>
            <select
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Specialties</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

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
              <option value="experience_years:DESC">Most Experienced</option>
              <option value="consultation_fee:ASC">Fee: Low to High</option>
              <option value="consultation_fee:DESC">Fee: High to Low</option>
              <option value="doctor_name:ASC">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <EmptyState
            icon={Stethoscope}
            title="No medical specialists found"
            description="Try adjusting your specialty filter, search keywords, or city criteria."
            action={{
              label: "Reset Search Filters",
              onClick: () => {
                setSearch("");
                setSelectedSpec("all");
                setSelectedCity("all");
              },
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => {
            return (
              <div
                key={doc.id}
                className="group flex flex-col justify-between p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-300 transition-all duration-200 shadow-xs hover:shadow-md"
              >
                <div>
                  {/* Doctor Avatar & Identity */}
                  <div className="flex items-start gap-4 mb-4">
                    {doc.profileImage ? (
                      <img
                        src={doc.profileImage}
                        alt={doc.doctorName}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-teal-500 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                        {getInitials(doc.doctorName)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 uppercase tracking-wide">
                          {doc.specialization}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {doc.doctorName}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                        {doc.qualification}
                      </p>
                    </div>
                  </div>

                  {/* Badges / Experience & Fee */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs mb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Experience
                      </span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-blue-600" />
                        {doc.experienceYears} Years
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Consultation
                      </span>
                      <span className="font-semibold text-emerald-700">
                        ${Number(doc.consultationFee).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* City / Location */}
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {doc.city} ({doc.pincode})
                    </span>

                    {doc.availability?.length > 0 && (
                      <span className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {doc.availability.length} Days/wk
                      </span>
                    )}
                  </div>
                </div>

                {/* View Details Action */}
                <div className="pt-4 mt-2">
                  <Link href={`/dashboard/doctors/${doc.id}`} className="block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between font-semibold group-hover:border-blue-500 group-hover:text-blue-600"
                    >
                      <span>View Profile & Availability</span>
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
      {doctors.length > 0 && (
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
            of{" "}
            <span className="font-semibold text-slate-800">{pagination.total}</span>{" "}
            doctors
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDoctors(pagination.page - 1)}
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
              onClick={() => fetchDoctors(pagination.page + 1)}
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

