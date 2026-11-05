"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/dashboard/StatCard";
import ActivityChart from "@/components/dashboard/ActivityChart";
import BookingTable from "@/components/dashboard/BookingTable";
import QuickActions from "@/components/dashboard/QuickActions";
import UpcomingAppointments from "@/components/dashboard/UpcomingAppointments";
import TestDetailModal from "@/components/healthcare/TestDetailModal";
import { bookingsService } from "@/services/bookings.service";
import { DEMO_LAB_TESTS } from "@/services/tests.service";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  FileText,
  BrainCircuit,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  FlaskConical,
  Activity,
  Plus,
  CreditCard,
} from "lucide-react";
import Button from "@/components/common/Button";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bookingsService
      .getBookings()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || data?.bookings || [];
        setBookings(list);
      })
      .catch((err) => {
        console.error("Failed to load dashboard bookings:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const upcoming = bookings.filter(
    (b) => b.status === "Confirmed" || b.status === "In Progress" || b.bookingStatus === "CONFIRMED"
  );
  const completed = bookings.filter((b) => b.status === "Completed" || b.bookingStatus === "COMPLETED");
  const pendingReports = bookings.filter(
    (b) => b.reportStatus && b.reportStatus.includes("Pending")
  );
  const pendingPayments = bookings.filter(
    (b) => (b.paymentStatus === "PENDING" || b.payment_status === "PENDING") && b.bookingStatus !== "CANCELLED"
  );

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-900 via-slate-900 to-teal-950 text-white overflow-hidden shadow-lg border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>HealthSync Verified Patient Portal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {greeting()}, {user?.name || "Alex Morgan"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Your home sample collection is confirmed for tomorrow. All vital biomarker metrics and laboratory certificates will synchronize to your portal automatically.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/dashboard/tests">
              <Button variant="gradient" size="sm" className="font-semibold gap-1.5 shadow-md">
                <Plus className="w-3.5 h-3.5" />
                <span>Book Diagnostic Test</span>
              </Button>
            </Link>
            <Link href="/dashboard/ai-assistant">
              <Button variant="outline" size="sm" className="text-white border-white/20 bg-white/10 hover:bg-white/20 font-semibold gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-teal-300" />
                <span>Gemini Health Assistant</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Subtle decorative background pulse */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-teal-500/10 via-blue-500/10 to-transparent pointer-events-none hidden lg:block" />
      </div>

      {/* Unpaid Bookings Action Banner */}
      {pendingPayments.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {pendingPayments.length} Booking{pendingPayments.length > 1 ? "s" : ""} Pending Payment
                </h3>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Complete payment online now via UPI, Cards, NetBanking or confirm Pay at Collection for your upcoming appointment.
              </p>
            </div>
          </div>
          <Link href={`/dashboard/bookings/${pendingPayments[0].id}/payment`}>
            <Button variant="primary" size="sm" className="whitespace-nowrap font-bold gap-1.5 shadow-xs cursor-pointer">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Now ({pendingPayments[0].bookingNumber || `#${pendingPayments[0].id}`})</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bookings"
          value={bookings.length}
          subtitle="Lifetime healthcare orders"
          icon={CalendarDays}
          variant="blue"
          trend="Real-time synchronized"
          trendPositive={true}
        />
        <StatCard
          title="Upcoming Appointments"
          value={upcoming.length}
          subtitle="Confirmed appointments"
          icon={Clock}
          variant="teal"
          trend={upcoming.length > 0 ? "Upcoming scheduled" : "No pending slots"}
          trendPositive={upcoming.length > 0}
        />
        <StatCard
          title="Completed Services"
          value={completed.length}
          subtitle="Pathology verified"
          icon={CheckCircle2}
          variant="emerald"
          trend="Completed appointments"
          trendPositive={true}
        />
        <StatCard
          title="Pending Payments"
          value={pendingPayments.length}
          subtitle="Payment action needed"
          icon={FileText}
          variant="amber"
          trend={pendingPayments.length > 0 ? "Action required" : "All cleared"}
          trendPositive={pendingPayments.length === 0}
        />
      </div>

      {/* Quick Access Tools */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Quick Actions & Clinical Tools
          </h2>
        </div>
        <QuickActions />
      </div>

      {/* Main Charts & Upcoming Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Activity Chart (Left 8 cols) */}
        <div className="lg:col-span-8">
          <ActivityChart />
        </div>

        {/* Upcoming Appointments (Right 4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Upcoming Appointments</span>
            </h3>
            <Link
              href="/dashboard/bookings"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <UpcomingAppointments appointments={upcoming} />
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Diagnostic Bookings</h3>
            <p className="text-xs text-slate-500">Track sample pickup, laboratory status, and digital report availability.</p>
          </div>
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="sm" className="text-xs font-semibold">
              Manage All Bookings ({bookings.length})
            </Button>
          </Link>
        </div>

        <BookingTable
          bookings={bookings}
          limit={4}
          onSelectBooking={(b) => {
            setSelectedBooking({
              name: b.testName,
              provider: b.address,
              price: b.amount,
              description: b.instructions,
              category: b.category,
              fastingRequired: b.instructions,
            });
            setIsModalOpen(true);
          }}
        />
      </div>

      {/* Recommended Healthcare Services */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Recommended Preventative Tests for You</span>
            </h3>
            <p className="text-xs text-slate-500">Based on standard adult age and cardiovascular guidelines.</p>
          </div>
          <Link href="/dashboard/tests" className="text-xs font-semibold text-blue-600 hover:underline">
            Browse Full Catalog →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_LAB_TESTS.slice(0, 3).map((test) => (
            <div
              key={test.id}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  {test.category}
                </span>
                <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-1">{test.name}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{test.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">${test.price}</span>
                <Button
                  variant="subtle"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setSelectedBooking(test);
                    setIsModalOpen(true);
                  }}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Details Modal */}
      <TestDetailModal
        test={selectedBooking}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookSuccess={(newBooking) => {
          bookingsService.createBooking(newBooking).then((created) => {
            setBookings((prev) => [created, ...prev]);
          });
        }}
      />
    </div>
  );
}

