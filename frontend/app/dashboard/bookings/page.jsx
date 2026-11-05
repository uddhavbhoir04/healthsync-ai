"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import BookingTable from "@/components/dashboard/BookingTable";
import StatCard from "@/components/dashboard/StatCard";
import EmptyState from "@/components/common/EmptyState";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import { formatCurrency } from "@/lib/utils";
import {
  bookingsService,
  BOOKING_STATUSES,
} from "@/services/bookings.service";
import {
  CalendarDays,
  Clock,
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  MapPin,
  Download,
  XCircle,
  Sparkles,
  Stethoscope,
  FlaskConical,
  Package,
  Video,
  User,
  Phone,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedType, setSelectedType] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [activeBooking, setActiveBooking] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await bookingsService.getMyBookings({
        status: selectedStatus !== "All" ? selectedStatus : undefined,
        type: selectedType !== "all" ? selectedType : undefined,
      });

      const list = res?.data || res?.bookings || [];
      setBookings(list);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      toast.error("Could not load bookings", {
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedType]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSelectBooking = (booking) => {
    setActiveBooking(booking);
    setCancellationReason("");
    setIsDetailOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    try {
      setIsCancelling(true);
      await bookingsService.cancelBooking(activeBooking.id, cancellationReason);
      toast.success("Booking Cancelled", {
        description: `Booking #${activeBooking.bookingNumber || activeBooking.id} has been successfully cancelled.`,
      });
      setIsDetailOpen(false);
      fetchBookings();
    } catch (err) {
      toast.error("Cancellation failed", {
        description: err.message,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getBadgeVariant = (status) => {
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

  // Filtered by local search query if provided
  const filteredBookings = bookings.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const num = (b.bookingNumber || b.id || "").toString().toLowerCase();
    const docName = b.appointment?.doctor?.doctorName?.toLowerCase() || "";
    const itemsStr = b.items?.map((i) => i.itemName.toLowerCase()).join(" ") || "";
    return num.includes(q) || docName.includes(q) || itemsStr.includes(q);
  });

  const activeCount = bookings.filter(
    (b) => b.bookingStatus === "CONFIRMED" || b.bookingStatus === "RESCHEDULED"
  ).length;
  const completedCount = bookings.filter((b) => b.bookingStatus === "COMPLETED").length;
  const pendingCount = bookings.filter((b) => b.paymentStatus === "PENDING").length;

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        badge="Appointments & Orders"
        title="My Bookings & Consultation History"
        description="Track live doctor appointments, home sample collections, diagnostic reports, and order statuses."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Bookings"
          value={activeCount}
          subtitle="Confirmed & upcoming appointments"
          icon={CalendarDays}
          variant="blue"
        />
        <StatCard
          title="Completed Services"
          value={completedCount}
          subtitle="Consultations & diagnostics"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Pending Payments"
          value={pendingCount}
          subtitle="Pay online or at venue"
          icon={Clock}
          variant="teal"
        />
        <StatCard
          title="Total Requests"
          value={bookings.length}
          subtitle="All healthcare services"
          icon={FileText}
          variant="purple"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Booking # (e.g. HS-DOC-...), doctor, or test name..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>

          {/* Service Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Service Types</option>
              <option value="DOCTOR">Doctor Consultation</option>
              <option value="LAB_TEST">Lab Test</option>
              <option value="PACKAGE">Diagnostic Package</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs pt-1">
          {BOOKING_STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all cursor-pointer ${
                selectedStatus === st
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Booking History Table */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading your healthcare bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings found"
          description="You haven't scheduled any appointments or laboratory bookings matching these filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSelectedStatus("All");
            setSelectedType("all");
            setSearch("");
          }}
        />
      ) : (
        <BookingTable
          bookings={filteredBookings}
          onSelectBooking={handleSelectBooking}
        />
      )}

      {/* Booking Details Drawer / Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Booking #${activeBooking?.bookingNumber || activeBooking?.id}`}
        description={`Registered on ${activeBooking?.createdAt?.slice(0, 10)} • Status: ${activeBooking?.bookingStatus || "CONFIRMED"}`}
        maxWidth="max-w-2xl"
      >
        {activeBooking && (
          <div className="space-y-5 text-xs">
            {/* Top Status & Payment Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Service Type
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {activeBooking.bookingType === "DOCTOR"
                    ? "Doctor Consultation"
                    : activeBooking.bookingType === "LAB_TEST"
                    ? "Clinical Lab Test"
                    : "Diagnostic Health Package"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={getBadgeVariant(activeBooking.bookingStatus)}>
                  {activeBooking.bookingStatus}
                </Badge>
                {activeBooking.paymentStatus === "PENDING" && activeBooking.bookingStatus !== "CANCELLED" ? (
                  <Link href={`/dashboard/bookings/${activeBooking.id}/payment`}>
                    <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold gap-1 shadow-xs">
                      <span>Pay {formatCurrency(activeBooking.totalAmount)}</span>
                      <CreditCard className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    Payment: {activeBooking.paymentStatus}
                  </span>
                )}
              </div>
            </div>

            {/* Doctor Appointment Details */}
            {activeBooking.appointment && (
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>Consultation Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Doctor</span>
                    <span className="font-bold text-slate-900">
                      Dr. {activeBooking.appointment.doctor?.doctorName}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {activeBooking.appointment.doctor?.specialization} • {activeBooking.appointment.doctor?.qualification}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Appointment Slot</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {activeBooking.appointment.appointmentDate}
                    </span>
                    <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {activeBooking.appointment.startTime?.slice(0, 5)} - {activeBooking.appointment.endTime?.slice(0, 5)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Patient Name</span>
                    <span className="font-semibold text-slate-800">
                      {activeBooking.appointment.patientName}
                    </span>
                    {activeBooking.appointment.patientPhone && (
                      <span className="text-slate-500 block text-[11px]">
                        Phone: {activeBooking.appointment.patientPhone}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Mode</span>
                    <span className="font-semibold text-slate-800 inline-flex items-center gap-1">
                      {activeBooking.appointment.consultationType === "ONLINE" ? (
                        <>
                          <Video className="w-3.5 h-3.5 text-blue-600" />
                          Online Video Consultation
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5 text-teal-600" />
                          In-Person Clinic Visit ({activeBooking.appointment.doctor?.city})
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {activeBooking.appointment.cancellationReason && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-[11px]">
                    <span className="font-bold">Cancellation Reason: </span>
                    {activeBooking.appointment.cancellationReason}
                  </div>
                )}
              </div>
            )}

            {/* Lab Collection Logistics */}
            {activeBooking.labCollection && (
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <FlaskConical className="w-4 h-4 text-teal-600" />
                  <span>Specimen Collection Logistics</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Collection Mode</span>
                    <span className="font-bold text-slate-800">
                      {activeBooking.labCollection.collectionType === "HOME"
                        ? "Home Sample Collection"
                        : "Walk-in Diagnostic Center"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Preferred Time Window</span>
                    <span className="font-bold text-slate-800">
                      {activeBooking.labCollection.preferredDate} ({activeBooking.labCollection.preferredTimeSlot})
                    </span>
                  </div>

                  {activeBooking.labCollection.collectionType === "HOME" && activeBooking.address && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Collection Address</span>
                      <p className="font-medium text-slate-700 flex items-start gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span>
                          {activeBooking.address.line1}
                          {activeBooking.address.line2 ? `, ${activeBooking.address.line2}` : ""},{" "}
                          {activeBooking.address.city}, {activeBooking.address.state} - {activeBooking.address.pincode}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Laboratory Sample Status</span>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {activeBooking.labCollection.sampleStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Line Items Snapshot */}
            {activeBooking.items && activeBooking.items.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
                  Booked Services & Price Snapshot
                </span>

                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/60 overflow-hidden">
                  {activeBooking.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{item.itemName}</span>
                        <span className="text-[11px] text-slate-400 block">
                          Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))}

                  <div className="p-3 bg-white flex items-center justify-between font-bold text-slate-900 border-t border-slate-200">
                    <span>Total Amount</span>
                    <span className="text-sm text-emerald-700">
                      {formatCurrency(activeBooking.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Form if active */}
            {(activeBooking.bookingStatus === "CONFIRMED" ||
              activeBooking.bookingStatus === "PENDING" ||
              activeBooking.bookingStatus === "RESCHEDULED") && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Need to cancel this booking?</span>
                <input
                  type="text"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Reason for cancellation (optional)..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-rose-500"
                />
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isCancelling}
                  onClick={handleCancelBooking}
                  className="w-full text-xs"
                >
                  Confirm Cancellation
                </Button>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                Close Window
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
