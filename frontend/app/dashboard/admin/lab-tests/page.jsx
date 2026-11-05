"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { labTestsService } from "@/services/labTests.service";
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Lock,
  Droplets,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminLabTestsPage() {
  const { user } = useAuth();

  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [testForm, setTestForm] = useState({
    testName: "",
    testCode: "",
    description: "",
    category: "",
    sampleType: "Blood",
    fastingRequired: false,
    preparationInstructions: "",
    price: 30,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCats() {
      try {
        const res = await labTestsService.getCategories();
        setCategories(res?.data || res?.categories || []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCats();
  }, []);

  const fetchTests = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await labTestsService.getAdminLabTests({
          page: pageToLoad,
          limit: 10,
          search: search.trim() || undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        });

        const list = res?.data || res?.tests || [];
        setTests(list);
        if (res?.pagination) setPagination(res.pagination);
      } catch (err) {
        toast.error("Failed to load lab tests", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    },
    [search, categoryFilter, statusFilter]
  );

  useEffect(() => {
    fetchTests(1);
  }, [fetchTests]);

  const handleOpenCreate = () => {
    setEditingTest(null);
    setTestForm({
      testName: "",
      testCode: "",
      description: "",
      category: "",
      sampleType: "Blood",
      fastingRequired: false,
      preparationInstructions: "",
      price: 30,
    });
    setIsTestModalOpen(true);
  };

  const handleOpenEdit = (test) => {
    setEditingTest(test);
    setTestForm({
      testName: test.testName || "",
      testCode: test.testCode || "",
      description: test.description || "",
      category: test.category || "",
      sampleType: test.sampleType || "Blood",
      fastingRequired: !!test.fastingRequired,
      preparationInstructions: test.preparationInstructions || "",
      price: test.price || 0,
    });
    setIsTestModalOpen(true);
  };

  const handleSaveTest = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingTest) {
        await labTestsService.updateLabTest(editingTest.id, testForm);
        toast.success("Lab Test Updated");
      } else {
        await labTestsService.createLabTest(testForm);
        toast.success("Lab Test Created");
      }
      setIsTestModalOpen(false);
      await fetchTests(pagination.page);
    } catch (err) {
      toast.error("Failed to save lab test", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (test) => {
    try {
      const newStatus = !test.status;
      await labTestsService.updateLabTestStatus(test.id, newStatus);
      toast.success(`Test marked as ${newStatus ? "active" : "inactive"}`);
      await fetchTests(pagination.page);
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
          title="Lab Test Catalog Management"
          description="Maintain individual laboratory assays, sample guidelines, preparation directives, and pricing."
        />

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          className="font-semibold shadow-xs shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Test
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTests(1);
          }}
          className="flex-1 relative"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by test name, code, or clinical category..."
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium"
            >
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={FlaskConical}
              title="No laboratory tests found"
              description="Add lab tests to populate the patient diagnostic catalog."
              action={{ label: "Add Lab Test", onClick: handleOpenCreate }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-3.5 px-6">Test Code & Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Sample Type</th>
                  <th className="py-3.5 px-4">Fasting Window</th>
                  <th className="py-3.5 px-4">Assay Price</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tests.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      <div>
                        <p className="truncate">{t.testName}</p>
                        <p className="text-[10px] font-mono text-slate-400">{t.testCode}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-blue-700 font-medium">{t.category}</td>
                    <td className="py-3.5 px-4 text-slate-600">{t.sampleType}</td>
                    <td className="py-3.5 px-4">
                      {t.fastingRequired ? (
                        <span className="text-amber-700 font-medium">10-12 hrs</span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ${Number(t.price).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.status ? (
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
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Edit Lab Test"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title={t.status ? "Deactivate" : "Activate"}
                        >
                          {t.status ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Test Create/Edit Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title={editingTest ? "Edit Laboratory Assay" : "Create New Diagnostic Assay"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveTest} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Test Name *</label>
              <input
                type="text"
                required
                placeholder="Complete Blood Count"
                value={testForm.testName}
                onChange={(e) => setTestForm({ ...testForm, testName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Test Code *</label>
              <input
                type="text"
                required
                placeholder="CBC-101"
                value={testForm.testCode}
                onChange={(e) => setTestForm({ ...testForm, testCode: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Category *</label>
              <input
                type="text"
                required
                placeholder="Hematology"
                value={testForm.category}
                onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sample Type *</label>
              <input
                type="text"
                required
                placeholder="Blood (Serum)"
                value={testForm.sampleType}
                onChange={(e) => setTestForm({ ...testForm, sampleType: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Price ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={testForm.price}
                onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={testForm.fastingRequired}
                  onChange={(e) => setTestForm({ ...testForm, fastingRequired: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
                <span>Fasting Required (10-12 hrs)</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Test Description</label>
              <textarea
                rows={2}
                placeholder="Clinical diagnostics covered..."
                value={testForm.description}
                onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Patient Preparation Instructions</label>
              <textarea
                rows={2}
                placeholder="Fasting instructions or restrictions..."
                value={testForm.preparationInstructions}
                onChange={(e) => setTestForm({ ...testForm, preparationInstructions: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsTestModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingTest ? "Save Changes" : "Create Test"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

