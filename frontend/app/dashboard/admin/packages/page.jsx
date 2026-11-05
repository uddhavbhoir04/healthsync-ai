"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { packagesService } from "@/services/packages.service";
import { labTestsService } from "@/services/labTests.service";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Lock,
  FlaskConical,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminPackagesPage() {
  const { user } = useAuth();

  const [packages, setPackages] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [pkgForm, setPkgForm] = useState({
    packageName: "",
    packageCode: "",
    description: "",
    image: "",
    originalPrice: 150,
    offerPrice: 99,
    testIds: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load lab tests for mapping selector
  useEffect(() => {
    async function loadTests() {
      try {
        const res = await labTestsService.getPublicLabTests({ limit: 100 });
        setAvailableTests(res?.data || res?.tests || []);
      } catch (err) {
        console.error("Failed to load tests for selector:", err);
      }
    }
    loadTests();
  }, []);

  const fetchPackages = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await packagesService.getAdminPackages({
          page: pageToLoad,
          limit: 10,
          search: search.trim() || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        });

        const list = res?.data || res?.packages || [];
        setPackages(list);
        if (res?.pagination) setPagination(res.pagination);
      } catch (err) {
        toast.error("Failed to load packages", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchPackages(1);
  }, [fetchPackages]);

  const handleOpenCreate = () => {
    setEditingPkg(null);
    setPkgForm({
      packageName: "",
      packageCode: "",
      description: "",
      image: "",
      originalPrice: 150,
      offerPrice: 99,
      testIds: [],
    });
    setIsPkgModalOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPkg(pkg);
    setPkgForm({
      packageName: pkg.packageName || "",
      packageCode: pkg.packageCode || "",
      description: pkg.description || "",
      image: pkg.image || "",
      originalPrice: Number(pkg.originalPrice) || 0,
      offerPrice: Number(pkg.offerPrice) || 0,
      testIds: pkg.tests?.map((t) => t.id) || [],
    });
    setIsPkgModalOpen(true);
  };

  const handleToggleTestSelection = (testId) => {
    setPkgForm((prev) => {
      const exists = prev.testIds.includes(testId);
      return {
        ...prev,
        testIds: exists
          ? prev.testIds.filter((id) => id !== testId)
          : [...prev.testIds, testId],
      };
    });
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (Number(pkgForm.offerPrice) > Number(pkgForm.originalPrice)) {
      toast.error("Validation Error", {
        description: "Offer price cannot be greater than the original price.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingPkg) {
        await packagesService.updatePackage(editingPkg.id, pkgForm);
        toast.success("Package Updated Successfully");
      } else {
        await packagesService.createPackage(pkgForm);
        toast.success("Package Created Successfully");
      }
      setIsPkgModalOpen(false);
      await fetchPackages(pagination.page);
    } catch (err) {
      toast.error("Failed to save package", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (pkg) => {
    try {
      const newStatus = !pkg.status;
      await packagesService.updatePackageStatus(pkg.id, newStatus);
      toast.success(`Package marked as ${newStatus ? "active" : "inactive"}`);
      await fetchPackages(pagination.page);
    } catch (err) {
      toast.error("Status update failed", { description: err.message });
    }
  };

  if (user && user.role !== "ADMIN") {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
        <Link href="/dashboard">
          <Button variant="primary" size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          badge="Admin Catalog"
          title="Diagnostic Package Management"
          description="Build multi-test preventive packages, configure bundle savings, and manage promotional offerings."
        />

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          className="font-semibold shadow-xs shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Package
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchPackages(1);
          }}
          className="flex-1 relative"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by package name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-20 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium"
          >
            <option value="all">All</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Package}
              title="No diagnostic packages found"
              description="Create a bundled package and attach lab tests."
              action={{ label: "Add Package", onClick: handleOpenCreate }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-3.5 px-6">Package Code & Name</th>
                  <th className="py-3.5 px-4">Included Tests</th>
                  <th className="py-3.5 px-4">Original Price</th>
                  <th className="py-3.5 px-4">Offer Price</th>
                  <th className="py-3.5 px-4">Savings</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.map((p) => {
                  const orig = Number(p.originalPrice) || 0;
                  const offer = Number(p.offerPrice) || 0;
                  const savings = Math.max(0, orig - offer);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        <div>
                          <p className="truncate">{p.packageName}</p>
                          <p className="text-[10px] font-mono text-slate-400">{p.packageCode}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 font-semibold">
                        {p.testCount || p.tests?.length || 0} Assays
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 line-through">
                        ${orig.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        ${offer.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        ${savings.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.status ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="Edit Package"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title={p.status ? "Deactivate" : "Activate"}
                          >
                            {p.status ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Package Create/Edit Modal */}
      <Modal
        isOpen={isPkgModalOpen}
        onClose={() => setIsPkgModalOpen(false)}
        title={editingPkg ? "Edit Diagnostic Package" : "Create New Diagnostic Package"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Package Name *</label>
              <input
                type="text"
                required
                placeholder="Executive Health Battery"
                value={pkgForm.packageName}
                onChange={(e) => setPkgForm({ ...pkgForm, packageName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Package Code *</label>
              <input
                type="text"
                required
                placeholder="PKG-EXEC-01"
                value={pkgForm.packageCode}
                onChange={(e) => setPkgForm({ ...pkgForm, packageCode: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Original Price ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={pkgForm.originalPrice}
                onChange={(e) => setPkgForm({ ...pkgForm, originalPrice: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Discounted Offer Price ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={pkgForm.offerPrice}
                onChange={(e) => setPkgForm({ ...pkgForm, offerPrice: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Must be less than or equal to original price.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Banner Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={pkgForm.image}
                onChange={(e) => setPkgForm({ ...pkgForm, image: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Package Description</label>
              <textarea
                rows={2}
                placeholder="Description of clinical coverage and target patients..."
                value={pkgForm.description}
                onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            {/* Test Selection Mapping */}
            <div className="sm:col-span-2 space-y-1.5 pt-2 border-t border-slate-100">
              <label className="font-semibold text-slate-800 block">
                Map Included Laboratory Assays ({pkgForm.testIds.length} Selected)
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50">
                {availableTests.map((t) => {
                  const isChecked = pkgForm.testIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-blue-50 border-blue-200 text-blue-900 font-semibold"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTestSelection(t.id)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="truncate">{t.testName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsPkgModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingPkg ? "Save Changes" : "Create Package"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

