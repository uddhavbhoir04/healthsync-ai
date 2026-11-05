"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import { bookingsService } from "@/services/bookings.service";
import { paymentsService } from "@/services/payments.service";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Receipt,
  CalendarDays,
  Home,
  ShieldCheck,
  Banknote,
  CreditCard,
  MapPin
} from "lucide-react";

export default function PaymentResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingId = searchParams.get("bookingId");
  const statusParam = searchParams.get("status") || "pending";
  const transactionId = searchParams.get("txId");

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!bookingId) {
        setIsLoading(false);
        return;
      }
      try {
        const [bkRes, txRes] = await Promise.all([
          bookingsService.getBookingById(bookingId).catch(() => null),
          transactionId ? paymentsService.getPaymentById(transactionId).catch(() => null) : null,
        ]);
        setBooking(bkRes?.data || bkRes);
        setPayment(txRes?.data || txRes);
      } catch (err) {
        console.error("Failed to load result details:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [bookingId, transactionId]);

  const isPayOnCollection = statusParam === "pay_on_collection";
  const isSuccess = (statusParam === "success" || booking?.paymentStatus === "PAID") && !isPayOnCollection;
  const isFailed = statusParam === "failed" || booking?.paymentStatus === "FAILED";

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm text-center space-y-5">
        {/* Status Icon */}
        <div className="flex justify-center">
          {isSuccess ? (
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-600 shadow-md shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : isPayOnCollection ? (
            <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center text-blue-600 shadow-md shadow-blue-500/10">
              <Banknote className="w-8 h-8" />
            </div>
          ) : isFailed ? (
            <div className="w-16 h-16 rounded-full bg-rose-50 border-4 border-rose-100 flex items-center justify-center text-rose-600 shadow-md shadow-rose-500/10">
              <XCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center text-amber-600 shadow-md shadow-amber-500/10">
              <Clock className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Status Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900">
            {isSuccess
              ? "Payment Successful!"
              : isPayOnCollection
              ? "Booking Confirmed — Pay at Collection"
              : isFailed
              ? "Payment Failed"
              : "Verifying Payment Status..."}
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {isSuccess
              ? "Your healthcare booking order is confirmed. A receipt and confirmation has been generated in your account."
              : isPayOnCollection
              ? "Your healthcare order is confirmed! You can pay cash, UPI or card when our practitioner arrives or at clinic visit, or pay online anytime."
              : isFailed
              ? "Your payment attempt could not be completed or signature verification was unsuccessful. Your booking remains active for retry."
              : "We are waiting for final gateway settlement. This usually takes just a few seconds."}
          </p>
        </div>

        {/* Transaction Summary Box */}
        {booking && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2.5 text-left">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Booking Reference:</span>
              <span className="font-mono font-bold text-slate-900">
                {booking.bookingNumber}
              </span>
            </div>

            {payment?.gatewayPaymentId && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment ID:</span>
                <span className="font-mono font-bold text-slate-800">
                  {payment.gatewayPaymentId}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500">
                {isPayOnCollection ? "Amount Due on Visit:" : "Amount Paid:"}
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {formatCurrency(payment?.amount || booking.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-500">Payment Status:</span>
              <Badge variant={isSuccess ? "success" : isPayOnCollection ? "warning" : isFailed ? "danger" : "warning"}>
                {isSuccess ? "PAID" : isPayOnCollection ? "PENDING (PAY AT VISIT)" : isFailed ? "FAILED" : "PENDING"}
              </Badge>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          {isPayOnCollection && bookingId && (
            <Link href={`/dashboard/bookings/${bookingId}/payment`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-auto font-bold gap-2">
                <CreditCard className="w-4 h-4" />
                <span>Pay Online Now</span>
              </Button>
            </Link>
          )}

          {isFailed && bookingId && (
            <Link href={`/dashboard/bookings/${bookingId}/payment`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-auto font-bold gap-2">
                <RotateCcw className="w-4 h-4" />
                <span>Retry Payment</span>
              </Button>
            </Link>
          )}

          <Link href="/dashboard/bookings" className="w-full sm:w-auto">
            <Button
              variant={isSuccess ? "primary" : isPayOnCollection ? "outline" : "outline"}
              size="md"
              className="w-full sm:w-auto font-semibold gap-2"
            >
              <CalendarDays className="w-4 h-4" />
              <span>View Bookings</span>
            </Button>
          </Link>

          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full sm:w-auto font-semibold gap-2">
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
