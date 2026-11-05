"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { paymentsService } from "@/services/payments.service";
import { formatCurrency } from "@/lib/utils";
import {
  CreditCard,
  Search,
  Filter,
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Receipt,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Refund Modal State
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundType, setRefundType] = useState("FULL"); // "FULL" or "PARTIAL"
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const fetchAdminPayments = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await paymentsService.adminGetPayments({
          page: pageToLoad,
          limit: 10,
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          search: search.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        const list = res?.data || res?.payments || [];
        setPayments(list);
        if (res?.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error("Admin payments load error:", err);
        toast.error("Failed to load platform payment transactions", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedStatus, search, startDate, endDate]
  );

  useEffect(() => {
    fetchAdminPayments(1);
  }, [fetchAdminPayments]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdminPayments(1);
  };

  const handleOpenRefund = (p) => {
    setSelectedPayment(p);
    setRefundType("FULL");
    setRefundAmount("");
    setRefundReason("");
    setIsRefundModalOpen(true);
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;

    try {
      setIsProcessingRefund(true);
      const payload = {
        reason: refundReason.trim() || "Administrative refund request",
      };

      if (refundType === "PARTIAL") {
        if (!refundAmount || parseFloat(refundAmount) <= 0) {
          toast.error("Please enter a valid positive partial refund amount");
          setIsProcessingRefund(false);
          return;
        }
        payload.amount = parseFloat(refundAmount);
      }

      const res = await paymentsService.adminInitiateRefund(selectedPayment.id, payload);
      toast.success("Refund Processed Successfully", {
        description: `Refund ID #${res.data?.id || "completed"} for ${formatCurrency(res.data?.amount || refundAmount)}.`,
      });
      setIsRefundModalOpen(false);
      fetchAdminPayments(pagination.page);
    } catch (err) {
      console.error("Refund failed:", err);
      toast.error("Refund failed", {
        description: err.message,
      });
    } finally {
      setIsProcessingRefund(false);
    }
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

  // Calculate max refundable
  let maxRefundable = 0;
  if (selectedPayment) {
    const captured = parseFloat(selectedPayment.amount);
    const prevRefunded = (selectedPayment.refunds || [])
      .filter((r) => r.refundStatus === "PROCESSED" || r.refundStatus === "PENDING")
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);
    maxRefundable = Math.max(0, parseFloat((captured - prevRefunded).toFixed(2)));
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        badge="Financial Governance"
        title="Payment & Transaction Management"
        description="Audit all platform payments, examine Razorpay gateway signatures, process partial/full refunds, and verify reconciliation."
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
              placeholder="Search by Razorpay Order ID (order_...), Payment ID (pay_...), or Idempotency key..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" className="font-semibold">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {(search || selectedStatus !== "all" || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedStatus("all");
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-rose-600 hover:underline cursor-pointer sm:ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading platform transactions...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <EmptyState
            icon={CreditCard}
            title="No platform transactions found"
            description="Try modifying search keywords or clearing date range filters."
            actionLabel="Reset Search"
            onAction={() => {
              setSearch("");
              setSelectedStatus("all");
              setStartDate("");
              setEndDate("");
            }}
          />
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">TXN # & Patient</th>
                <th className="px-5 py-3.5">Booking Reference</th>
                <th className="px-5 py-3.5">Gateway Order / Payment ID</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => {
                const canRefund =
                  (p.paymentStatus === "SUCCESS" || p.paymentStatus === "PARTIALLY_REFUNDED") &&
                  p.gatewayPaymentId;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900">
                          TXN #{p.id}
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {p.user?.name || "Patient"} ({p.user?.email})
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px] text-slate-700">
                      {p.booking?.bookingNumber || `Booking #${p.bookingId}`}
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px] text-slate-600">
                      <div>Order: {p.gatewayOrderId}</div>
                      {p.gatewayPaymentId && (
                        <div className="text-emerald-700 font-bold">Pay: {p.gatewayPaymentId}</div>
                      )}
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
                        {canRefund && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenRefund(p)}
                            className="font-semibold text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Refund
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
            of <span className="font-semibold text-slate-800">{pagination.total}</span> total
            transactions
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAdminPayments(pagination.page - 1)}
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
              onClick={() => fetchAdminPayments(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Admin Refund Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title={`Process Refund: TXN #${selectedPayment?.id}`}
        description={`Booking Reference: ${selectedPayment?.booking?.bookingNumber} • Patient: ${selectedPayment?.user?.name}`}
        maxWidth="max-w-md"
      >
        {selectedPayment && (
          <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
            {/* Financial Balances Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Captured Payment Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(selectedPayment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Maximum Refundable Balance:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(maxRefundable)}</span>
              </div>
            </div>

            {/* Refund Type Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Refund Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundType("FULL")}
                  className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    refundType === "FULL"
                      ? "border-purple-600 bg-purple-50 text-purple-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  Full Refund ({formatCurrency(maxRefundable)})
                </button>

                <button
                  type="button"
                  onClick={() => setRefundType("PARTIAL")}
                  className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    refundType === "PARTIAL"
                      ? "border-purple-600 bg-purple-50 text-purple-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  Partial Refund
                </button>
              </div>
            </div>

            {/* Partial Amount Input if selected */}
            {refundType === "PARTIAL" && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Partial Refund Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxRefundable}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Enter amount (max: $${maxRefundable.toFixed(2)})`}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Reason for Refund (Optional)
              </label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Patient schedule cancellation, double charge refund..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRefundModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isProcessingRefund}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                Confirm Refund
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

