"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { doctorsService } from "@/services/doctors.service";
import { getInitials } from "@/lib/auth";
import {
  Stethoscope,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  CheckCircle2,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Lock,
  MapPin,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminDoctorsPage() {
  const { user } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorForm, setDoctorForm] = useState({
    doctorName: "",
    specialization: "",
    qualification: "",
    experienceYears: 5,
    consultationFee: 80,
    about: "",
    profileImage: "",
    city: "",
    pincode: "",
  });

  // Availability Modal
  const [availDoctor, setAvailDoctor] = useState(null);
  const [availabilityList, setAvailabilityList] = useState([]);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "13:00",
    slotDuration: 30,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDoctors = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await doctorsService.getAdminDoctors({
          page: pageToLoad,
          limit: 10,
          search: search.trim() || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        });

        const list = res?.data || res?.doctors || [];
        setDoctors(list);
        if (res?.pagination) setPagination(res.pagination);
      } catch (err) {
        console.error("Failed to load admin doctors:", err);
        toast.error("Failed to load doctor directory", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchDoctors(1);
  }, [fetchDoctors]);

  // Open Create/Edit modal
  const handleOpenCreate = () => {
    setEditingDoctor(null);
    setDoctorForm({
      doctorName: "",
      specialization: "",
      qualification: "",
      experienceYears: 5,
      consultationFee: 80,
      about: "",
      profileImage: "",
      city: "",
      pincode: "",
    });
    setIsDoctorModalOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingDoctor(doc);
    setDoctorForm({
      doctorName: doc.doctorName || "",
      specialization: doc.specialization || "",
      qualification: doc.qualification || "",
      experienceYears: doc.experienceYears || 0,
      consultationFee: doc.consultationFee || 0,
      about: doc.about || "",
      profileImage: doc.profileImage || "",
      city: doc.city || "",
      pincode: doc.pincode || "",
    });
    setIsDoctorModalOpen(true);
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingDoctor) {
        await doctorsService.updateDoctor(editingDoctor.id, doctorForm);
        toast.success("Doctor Updated Successfully");
      } else {
        await doctorsService.createDoctor(doctorForm);
        toast.success("Doctor Created Successfully");
      }
      setIsDoctorModalOpen(false);
      await fetchDoctors(pagination.page);
    } catch (err) {
      toast.error("Failed to save doctor", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (doc) => {
    try {
      const newStatus = !doc.status;
      await doctorsService.updateDoctorStatus(doc.id, newStatus);
      toast.success(`Doctor marked as ${newStatus ? "active" : "inactive"}`);
      await fetchDoctors(pagination.page);
    } catch (err) {
      toast.error("Status update failed", { description: err.message });
    }
  };

  // Availability Management
  const handleOpenAvailability = async (doc) => {
    try {
      setAvailDoctor(doc);
      const res = await doctorsService.getDoctorAvailability(doc.id);
      setAvailabilityList(res?.data || res?.availability || []);
    } catch {
      setAvailabilityList([]);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!availDoctor) return;
    try {
      setIsSubmitting(true);
      await doctorsService.addAvailability(availDoctor.id, newSlot);
      toast.success("Availability slot added");
      const res = await doctorsService.getDoctorAvailability(availDoctor.id);
      setAvailabilityList(res?.data || res?.availability || []);
    } catch (err) {
      toast.error("Failed to add slot", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!availDoctor) return;
    try {
      await doctorsService.deleteAvailability(availDoctor.id, slotId);
      toast.success("Availability slot removed");
      const res = await doctorsService.getDoctorAvailability(availDoctor.id);
      setAvailabilityList(res?.data || res?.availability || []);
    } catch (err) {
      toast.error("Failed to delete slot", { description: err.message });
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
          title="Doctor Management"
          description="Register, update credentials, configure weekly consult availability, and control practitioner statuses."
        />

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          className="font-semibold shadow-xs shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Doctor
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchDoctors(1);
          }}
          className="flex-1 relative"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by doctor name, specialty, or city..."
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
        ) : doctors.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Stethoscope}
              title="No doctors found"
              description="Register new medical practitioners to make them discoverable to patients."
              action={{ label: "Add Doctor", onClick: handleOpenCreate }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-3.5 px-6">Practitioner</th>
                  <th className="py-3.5 px-4">Specialization</th>
                  <th className="py-3.5 px-4">Experience</th>
                  <th className="py-3.5 px-4">Consultation Fee</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {getInitials(doc.doctorName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate">{doc.doctorName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{doc.qualification}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-blue-700 font-medium">{doc.specialization}</td>
                    <td className="py-3.5 px-4 text-slate-600">{doc.experienceYears} Years</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ${Number(doc.consultationFee).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{doc.city}</td>
                    <td className="py-3.5 px-4">
                      {doc.status ? (
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
                          onClick={() => handleOpenAvailability(doc)}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg cursor-pointer"
                          title="Manage Weekly Availability"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Edit Doctor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(doc)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title={doc.status ? "Deactivate" : "Activate"}
                        >
                          {doc.status ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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

      {/* Doctor Create/Edit Modal */}
      <Modal
        isOpen={isDoctorModalOpen}
        onClose={() => setIsDoctorModalOpen(false)}
        title={editingDoctor ? "Edit Doctor Credentials" : "Register New Medical Practitioner"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Doctor Name *</label>
              <input
                type="text"
                required
                placeholder="Dr. Jane Smith"
                value={doctorForm.doctorName}
                onChange={(e) => setDoctorForm({ ...doctorForm, doctorName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Specialization *</label>
              <input
                type="text"
                required
                placeholder="Cardiology"
                value={doctorForm.specialization}
                onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Qualification *</label>
              <input
                type="text"
                required
                placeholder="MD, FACC"
                value={doctorForm.qualification}
                onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Experience (Years) *</label>
              <input
                type="number"
                min="0"
                required
                value={doctorForm.experienceYears}
                onChange={(e) => setDoctorForm({ ...doctorForm, experienceYears: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Consultation Fee ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={doctorForm.consultationFee}
                onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">City *</label>
              <input
                type="text"
                required
                placeholder="San Francisco"
                value={doctorForm.city}
                onChange={(e) => setDoctorForm({ ...doctorForm, city: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Postal Pincode *</label>
              <input
                type="text"
                required
                placeholder="94102"
                value={doctorForm.pincode}
                onChange={(e) => setDoctorForm({ ...doctorForm, pincode: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Profile Photo URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={doctorForm.profileImage}
                onChange={(e) => setDoctorForm({ ...doctorForm, profileImage: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Professional Biography</label>
              <textarea
                rows={3}
                placeholder="Clinical background, interests, and treatments..."
                value={doctorForm.about}
                onChange={(e) => setDoctorForm({ ...doctorForm, about: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsDoctorModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingDoctor ? "Save Changes" : "Create Doctor"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Availability Management Modal */}
      <Modal
        isOpen={!!availDoctor}
        onClose={() => setAvailDoctor(null)}
        title={`Weekly Consultation Hours — ${availDoctor?.doctorName || ""}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5 text-xs">
          {/* Existing slots list */}
          <div className="space-y-2">
            <span className="font-bold text-slate-800 uppercase text-[11px]">Current Published Windows</span>
            {availabilityList.length === 0 ? (
              <p className="text-slate-400 italic p-3 rounded-xl bg-slate-50">No availability windows configured.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {availabilityList.map((slot) => (
                  <div key={slot.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{slot.dayOfWeek}: </span>
                      <span className="text-blue-700 font-semibold">{slot.startTime} - {slot.endTime}</span>
                      <span className="text-slate-400 ml-2">({slot.slotDuration}m slots)</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add slot form */}
          <form onSubmit={handleAddSlot} className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
            <span className="font-bold text-blue-900 uppercase text-[11px] block">Add Consultation Window</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-blue-950 block mb-1">Day of Week</label>
                <select
                  value={newSlot.dayOfWeek}
                  onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: e.target.value })}
                  className="w-full p-2 rounded-lg border border-blue-200 bg-white text-slate-800"
                >
                  {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-blue-950 block mb-1">Start Time (24h)</label>
                <input
                  type="text"
                  placeholder="09:00"
                  pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                  value={newSlot.startTime}
                  onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                  className="w-full p-2 rounded-lg border border-blue-200 bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-blue-950 block mb-1">End Time (24h)</label>
                <input
                  type="text"
                  placeholder="13:00"
                  pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                  value={newSlot.endTime}
                  onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                  className="w-full p-2 rounded-lg border border-blue-200 bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-blue-950 block mb-1">Slot Mins</label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={newSlot.slotDuration}
                  onChange={(e) => setNewSlot({ ...newSlot, slotDuration: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-blue-200 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Add Window
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

