"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { paymentsService, PAYMENT_STATUSES } from "@/services/payments.service";
import { formatCurrency } from "@/lib/utils";
import {
  CreditCard,
  Search,
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

export default function MyPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchBooking, setSearchBooking] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchPayments = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await paymentsService.getMyPayments({
          page: pageToLoad,
          limit: 10,
          status: selectedStatus !== "All" ? selectedStatus : undefined,
          bookingNumber: searchBooking.trim() || undefined,
        });

        const list = res?.data || res?.payments || [];
        setPayments(list);
        if (res?.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error("Failed to fetch payments:", err);
        toast.error("Could not load payment transactions", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedStatus, searchBooking]
  );

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayments(1);
  };

  const handleOpenDetail = (p) => {
    setSelectedPayment(p);
    setIsDetailOpen(true);
  };

  const getStatusBadgeVariant = (status) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
        return "success";
      case "FAILED":
        return "danger";
      case "REFUNDED":
        return "purple";
      case "PARTIALLY_REFUNDED":
        return "teal";
      case "PENDING":
      case "CREATED":
      default:
        return "warning";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        badge="Financial History"
        title="Payment & Billing Transactions"
        description="Review all payments made for medical consultations, clinical diagnostics, and home phlebotomy visits."
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchBooking}
              onChange={(e) => setSearchBooking(e.target.value)}
              placeholder="Search by Booking Number (e.g. HS-DOC-...)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" className="font-semibold">
            Search
          </Button>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs pt-1 border-t border-slate-100">
          {PAYMENT_STATUSES.map((st) => (
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

      {/* Transactions Table */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading your transactions...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <EmptyState
            icon={Receipt}
            title="No payment transactions found"
            description="You haven't completed any payment transactions matching these filter criteria."
            actionLabel="Reset Filters"
            onAction={() => {
              setSelectedStatus("All");
              setSearchBooking("");
            }}
          />
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Transaction ID & Booking</th>
                <th className="px-5 py-3.5">Gateway Order / Payment ID</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-slate-900">
                        TXN #{p.id}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {p.booking?.bookingNumber || `Booking #${p.bookingId}`}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 font-mono text-[11px] text-slate-600">
                    <div>Order: {p.gatewayOrderId}</div>
                    {p.gatewayPaymentId && (
                      <div className="text-slate-800 font-semibold">Pay: {p.gatewayPaymentId}</div>
                    )}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.createdAt?.slice(0, 10)}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap font-bold text-slate-900">
                    {formatCurrency(p.amount)}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    <Badge variant={getStatusBadgeVariant(p.paymentStatus)}>
                      {p.paymentStatus}
                    </Badge>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(p)}
                        className="font-semibold text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>

                      {p.paymentStatus === "FAILED" && (
                        <Link href={`/dashboard/bookings/${p.bookingId}/payment`}>
                          <Button variant="primary" size="sm" className="font-semibold text-xs">
                            Retry
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {payments.length > 0 && (
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
            of <span className="font-semibold text-slate-800">{pagination.total}</span> payments
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPayments(pagination.page - 1)}
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
              onClick={() => fetchPayments(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Payment Detail Modal Drawer */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Transaction Details: TXN #${selectedPayment?.id}`}
        description={`Gateway: ${selectedPayment?.gateway} • Status: ${selectedPayment?.paymentStatus}`}
        maxWidth="max-w-xl"
      >
        {selectedPayment && (
          <div className="space-y-4 text-xs">
            {/* Top Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Amount Transacted
                </span>
                <span className="text-xl font-extrabold text-slate-900">
                  {formatCurrency(selectedPayment.amount)}
                </span>
              </div>
              <Badge variant={getStatusBadgeVariant(selectedPayment.paymentStatus)}>
                {selectedPayment.paymentStatus}
              </Badge>
            </div>

            {/* Gateway Identifiers */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
              <span className="font-bold text-slate-800 uppercase text-[11px] block">
                Razorpay Cryptographic Audit Identifiers
              </span>

              <div className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Order ID:</span>
                  <span className="font-bold text-slate-800">{selectedPayment.gatewayOrderId}</span>
                </div>
                {selectedPayment.gatewayPaymentId && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Payment ID:</span>
                    <span className="font-bold text-emerald-700">{selectedPayment.gatewayPaymentId}</span>
                  </div>
                )}
                {selectedPayment.idempotencyKey && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Idempotency Key:</span>
                    <span className="text-slate-600">{selectedPayment.idempotencyKey}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Refund History if present */}
            {selectedPayment.refunds && selectedPayment.refunds.length > 0 && (
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
                <span className="font-bold text-purple-900 uppercase text-[11px] block">
                  Processed Refunds ({selectedPayment.refunds.length})
                </span>

                <div className="space-y-1.5">
                  {selectedPayment.refunds.map((ref) => (
                    <div key={ref.id} className="p-2.5 rounded-xl bg-white border border-purple-100 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-purple-950 block">Refund #{ref.id}</span>
                        <span className="text-slate-500 font-mono">{ref.gatewayRefundId || "Pending Gateway"}</span>
                        {ref.reason && <p className="text-slate-600 mt-0.5">{ref.reason}</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-purple-800 block">
                          -{formatCurrency(ref.amount)}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          {ref.refundStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Link href={`/dashboard/payments/${selectedPayment.id}`}>
                <Button variant="secondary" size="sm" className="gap-1">
                  <span>Full Transaction Dossier</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>

              <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

