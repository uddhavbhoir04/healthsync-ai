"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { bookingsService } from "@/services/bookings.service";
import { formatCurrency } from "@/lib/utils";
import {
  CalendarDays,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  FlaskConical,
  Package,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  User,
  CreditCard,
  Video,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Management Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [updateBookingStatus, setUpdateBookingStatus] = useState("");
  const [updatePaymentStatus, setUpdatePaymentStatus] = useState("");
  const [updateSampleStatus, setUpdateSampleStatus] = useState("");
  const [updateAppointmentStatus, setUpdateAppointmentStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAdminBookings = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await bookingsService.adminGetBookings({
          page: pageToLoad,
          limit: 10,
          type: selectedType !== "all" ? selectedType : undefined,
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          search: search.trim() || undefined,
        });

        const list = res?.data || res?.bookings || [];
        setBookings(list);
        if (res?.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error("Admin bookings load error:", err);
        toast.error("Failed to load platform bookings", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedType, selectedStatus, search]
  );

  useEffect(() => {
    fetchAdminBookings(1);
  }, [fetchAdminBookings]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdminBookings(1);
  };

  const handleOpenManage = (b) => {
    setSelectedBooking(b);
    setUpdateBookingStatus(b.bookingStatus || "CONFIRMED");
    setUpdatePaymentStatus(b.paymentStatus || "PENDING");
    setUpdateSampleStatus(b.labCollection?.sampleStatus || "PENDING");
    setUpdateAppointmentStatus(b.appointment?.appointmentStatus || "SCHEDULED");
    setIsManageModalOpen(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;

    try {
      setIsUpdating(true);
      const payload = {
        bookingStatus: updateBookingStatus,
        paymentStatus: updatePaymentStatus,
      };

      if (selectedBooking.labCollection) {
        payload.sampleStatus = updateSampleStatus;
      }
      if (selectedBooking.appointment) {
        payload.appointmentStatus = updateAppointmentStatus;
      }

      await bookingsService.adminUpdateBookingStatus(selectedBooking.id, payload);
      toast.success("Booking Status Updated", {
        description: `Booking #${selectedBooking.bookingNumber} statuses successfully synchronized.`,
      });
      setIsManageModalOpen(false);
      fetchAdminBookings(pagination.page);
    } catch (err) {
      console.error("Status update failed:", err);
      toast.error("Failed to update status", {
        description: err.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status?.toUpperCase()) {
      case "CONFIRMED":
        return "primary";
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "danger";
      case "RESCHEDULED":
        return "teal";
      case "PENDING":
      default:
        return "warning";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        badge="Platform Governance"
        title="Booking & Order Management"
        description="Audit patient bookings, update fulfillment workflows, change payment verification, and track home phlebotomy visits."
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Booking # (e.g. HS-DOC-...), patient name, notes..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" className="font-semibold">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Service Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Service Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Service Types</option>
              <option value="DOCTOR">Doctor Consultation</option>
              <option value="LAB_TEST">Clinical Lab Test</option>
              <option value="PACKAGE">Diagnostic Package</option>
            </select>
          </div>

          {/* Booking Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Booking Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RESCHEDULED">Rescheduled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading platform bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <EmptyState
            icon={CalendarDays}
            title="No platform bookings match criteria"
            description="Try modifying search keywords or clearing filters."
            actionLabel="Reset Search"
            onAction={() => {
              setSearch("");
              setSelectedType("all");
              setSelectedStatus("all");
            }}
          />
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Booking # & Patient</th>
                <th className="px-5 py-3.5">Service Details</th>
                <th className="px-5 py-3.5">Schedule</th>
                <th className="px-5 py-3.5">Total Amount</th>
                <th className="px-5 py-3.5">Booking Status</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => {
                const isDoctor = b.bookingType === "DOCTOR";
                let serviceTitle = "";
                if (isDoctor && b.appointment?.doctor) {
                  serviceTitle = `Dr. ${b.appointment.doctor.doctorName} (${b.appointment.consultationType})`;
                } else if (b.items && b.items.length > 0) {
                  serviceTitle = b.items.map((i) => i.itemName).join(", ");
                } else {
                  serviceTitle = b.bookingType;
                }

                const scheduleDate =
                  b.appointment?.appointmentDate ||
                  b.labCollection?.preferredDate ||
                  b.bookingDate;

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900">
                          {b.bookingNumber}
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {b.user?.name || "Patient"} ({b.user?.email})
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        {isDoctor ? (
                          <Stethoscope className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : b.bookingType === "LAB_TEST" ? (
                          <FlaskConical className="w-4 h-4 text-teal-600 shrink-0" />
                        ) : (
                          <Package className="w-4 h-4 text-purple-600 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {serviceTitle}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-slate-600">
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {scheduleDate}
                        </span>
                        {b.appointment?.startTime && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {b.appointment.startTime.slice(0, 5)} - {b.appointment.endTime?.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap font-bold text-slate-900">
                      {formatCurrency(b.totalAmount)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(b.bookingStatus)}>
                        {b.bookingStatus}
                      </Badge>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {b.paymentStatus}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenManage(b)}
                        className="font-semibold text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {bookings.length > 0 && (
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
            of <span className="font-semibold text-slate-800">{pagination.total}</span> total
            bookings
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAdminBookings(pagination.page - 1)}
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
              onClick={() => fetchAdminBookings(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Admin Management Modal */}
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        title={`Manage Booking: ${selectedBooking?.bookingNumber}`}
        description={`Registered Patient: ${selectedBooking?.user?.name} (${selectedBooking?.user?.email})`}
        maxWidth="max-w-xl"
      >
        {selectedBooking && (
          <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
            {/* Service & Items Overview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 uppercase text-[11px] block">
                Services Summary
              </span>

              {selectedBooking.items && selectedBooking.items.length > 0 && (
                <div className="space-y-1">
                  {selectedBooking.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-slate-700">
                      <span>
                        {it.itemName} (x{it.quantity})
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(it.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total Registered Amount</span>
                <span className="text-emerald-700">
                  {formatCurrency(selectedBooking.totalAmount)}
                </span>
              </div>
            </div>

            {/* Status Transition Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Overall Booking Status
                </label>
                <select
                  value={updateBookingStatus}
                  onChange={(e) => setUpdateBookingStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="RESCHEDULED">RESCHEDULED</option>
                  <option value="NO_SHOW">NO_SHOW</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Verification Status
                </label>
                <select
                  value={updatePaymentStatus}
                  onChange={(e) => setUpdatePaymentStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              {selectedBooking.labCollection && (
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Laboratory Sample Progress
                  </label>
                  <select
                    value={updateSampleStatus}
                    onChange={(e) => setUpdateSampleStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="COLLECTED">COLLECTED</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="RECEIVED">RECEIVED</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              )}

              {selectedBooking.appointment && (
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Doctor Appointment Status
                  </label>
                  <select
                    value={updateAppointmentStatus}
                    onChange={(e) => setUpdateAppointmentStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="RESCHEDULED">RESCHEDULED</option>
                    <option value="NO_SHOW">NO_SHOW</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsManageModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isUpdating}
                className="font-semibold"
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

