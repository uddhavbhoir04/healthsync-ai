"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import { paymentsService } from "@/services/payments.service";
import { formatCurrency } from "@/lib/utils";
import {
  CreditCard,
  ChevronLeft,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Receipt,
  RotateCcw,
  User,
  MapPin,
  Stethoscope,
  FlaskConical,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export default function PaymentDetailPage() {
  const params = useParams();
  const paymentId = params?.id;

  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPayment() {
      if (!paymentId) return;
      try {
        setIsLoading(true);
        const res = await paymentsService.getPaymentById(paymentId);
        setPayment(res?.data || res);
      } catch (err) {
        console.error("Failed to load payment detail:", err);
        toast.error("Transaction not found", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadPayment();
  }, [paymentId]);

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

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-20 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-700">Transaction record not found</p>
        <Link href="/dashboard/payments">
          <Button variant="primary" size="sm">
            Back to Payments
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Payment History
        </Link>
      </div>

      <PageHeader
        badge="Payment Dossier"
        title={`Transaction #${payment.id}`}
        description={`Registered on ${payment.createdAt?.slice(0, 10)} • Gateway: ${payment.gateway}`}
      />

      {/* Main Payment Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Amount Captured
          </span>
          <span className="text-3xl font-extrabold text-slate-900">
            {formatCurrency(payment.amount)}
          </span>
          <span className="text-xs text-slate-500 block mt-1">
            Currency: {payment.currency} • Method: {payment.paymentMethod || "Razorpay Gateway"}
          </span>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          <Badge variant={getStatusBadgeVariant(payment.paymentStatus)}>
            {payment.paymentStatus}
          </Badge>
          {payment.paidAt && (
            <span className="text-[11px] text-slate-500">
              Paid at: {new Date(payment.paidAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Details Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 text-xs">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Associated Booking Details</span>
          </h3>

          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-500">Booking Reference:</span>
              <span className="font-mono font-bold text-slate-900">
                {payment.booking?.bookingNumber}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Service Type:</span>
              <span className="font-semibold text-slate-800">
                {payment.booking?.bookingType}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Booking Status:</span>
              <Badge variant={payment.booking?.bookingStatus === "CONFIRMED" ? "primary" : "warning"}>
                {payment.booking?.bookingStatus}
              </Badge>
            </div>
          </div>

          {/* Line items snapshot */}
          {payment.booking?.items && payment.booking.items.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Item Breakdown
              </span>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                {payment.booking.items.map((it) => (
                  <div key={it.id} className="p-2.5 flex justify-between bg-white text-[11px]">
                    <span className="text-slate-700">
                      {it.itemName} (x{it.quantity})
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(it.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <Link href="/dashboard/bookings">
              <Button variant="outline" size="sm" className="w-full">
                View in My Bookings
              </Button>
            </Link>
          </div>
        </div>

        {/* Gateway Audit Identifiers */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 text-xs">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cryptographic Gateway Audit</span>
          </h3>

          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 font-sans block text-[10px] uppercase">
                Gateway Order ID
              </span>
              <span className="font-bold text-slate-800 break-all">
                {payment.gatewayOrderId}
              </span>
            </div>

            {payment.gatewayPaymentId && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 font-sans block text-[10px] uppercase">
                  Gateway Payment ID
                </span>
                <span className="font-bold text-emerald-700 break-all">
                  {payment.gatewayPaymentId}
                </span>
              </div>
            )}

            {payment.idempotencyKey && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 font-sans block text-[10px] uppercase">
                  Idempotency Key
                </span>
                <span className="text-slate-600 break-all">
                  {payment.idempotencyKey}
                </span>
              </div>
            )}
          </div>

          {/* Refund Breakdown if exists */}
          {payment.refunds && payment.refunds.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="font-bold text-purple-950 uppercase text-[11px] block">
                Refund History
              </span>
              <div className="space-y-2">
                {payment.refunds.map((ref) => (
                  <div key={ref.id} className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 flex justify-between items-center text-[11px]">
                    <div>
                      <span className="font-bold text-purple-950 block">Refund #{ref.id}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{ref.gatewayRefundId}</span>
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
        </div>
      </div>
    </div>
  );
}

