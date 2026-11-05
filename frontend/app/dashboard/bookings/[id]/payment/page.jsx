"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import RazorpayModal from "@/components/payments/RazorpayModal";
import { bookingsService } from "@/services/bookings.service";
import { paymentsService } from "@/services/payments.service";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Lock,
  Sparkles,
  ArrowRight,
  Receipt,
  User,
  Phone,
  Mail,
  Stethoscope,
  FlaskConical,
  Package,
  Banknote,
  Building,
  Smartphone,
  Check
} from "lucide-react";
import { toast } from "sonner";

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id;
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPayOnCollectionLoading, setIsPayOnCollectionLoading] = useState(false);

  // Selected Option: 'online' | 'collection'
  const [selectedMethod, setSelectedMethod] = useState("online");

  // Razorpay Simulated / Real Modal State
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [activeOrderData, setActiveOrderData] = useState(null);

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId) return;
      try {
        setIsLoading(true);
        const res = await bookingsService.getBookingById(bookingId);
        setBooking(res?.data || res);
      } catch (err) {
        console.error("Failed to fetch booking for payment:", err);
        toast.error("Booking not found", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadBooking();
  }, [bookingId]);

  // Initiate Online Payment via Razorpay
  const handleInitiateOnlinePayment = async () => {
    if (!booking) return;

    try {
      setIsProcessing(true);
      const res = await paymentsService.createOrder({ bookingId: booking.id });
      const orderData = res?.data;
      setActiveOrderData(orderData);
      setIsRazorpayModalOpen(true);
    } catch (err) {
      console.error("Payment initiation failed:", err);
      toast.error("Could not initiate payment", {
        description: err.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Called when payment succeeds inside the Razorpay modal
  const handlePaymentSuccess = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    try {
      setIsRazorpayModalOpen(false);
      toast.loading("Verifying transaction with healthcare backend...", { id: "payment-verify" });

      const verifyRes = await paymentsService.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      toast.success("Payment Verified Successfully!", { id: "payment-verify" });
      router.push(
        `/dashboard/payment/result?bookingId=${booking.id}&status=success&txId=${verifyRes?.data?.transactionId || ""}`
      );
    } catch (vErr) {
      console.error("Verification error:", vErr);
      toast.error("Signature verification failed", {
        id: "payment-verify",
        description: vErr.message,
      });
      router.push(`/dashboard/payment/result?bookingId=${booking.id}&status=failed`);
    }
  };

  // Handle Pay at Collection / Clinic Visit
  const handlePayOnCollection = async () => {
    if (!booking) return;

    try {
      setIsPayOnCollectionLoading(true);
      await paymentsService.payOnCollection({
        bookingId: booking.id,
        paymentMethod: "PAY_ON_COLLECTION",
      });

      toast.success("Payment at Collection Selected!", {
        description: "Your booking is confirmed. You can pay during your visit or pay online anytime.",
      });

      router.push(`/dashboard/payment/result?bookingId=${booking.id}&status=pay_on_collection`);
    } catch (err) {
      console.error("Pay on collection selection failed:", err);
      toast.error("Failed to set pay on collection", {
        description: err.message,
      });
    } finally {
      setIsPayOnCollectionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-24 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-200 rounded w-1/4" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-700">Booking not found</p>
        <Link href="/dashboard/bookings">
          <Button variant="primary" size="sm">
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  const isAlreadyPaid = booking.paymentStatus === "PAID";
  const isCancelled = booking.bookingStatus === "CANCELLED";

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Bookings
        </Link>
      </div>

      <PageHeader
        badge="Payment Checkout"
        title="Choose How You Want to Pay"
        description="Select Pay Now via Razorpay Standard Checkout (UPI, Cards, NetBanking) or Pay at Collection / Clinic Visit."
      />

      {/* Warning if already paid */}
      {isAlreadyPaid && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">This booking has already been paid successfully.</span>
              <p className="text-[11px] text-emerald-700">No further payment is required.</p>
            </div>
          </div>
          <Link href="/dashboard/bookings">
            <Button variant="primary" size="sm">
              View Bookings
            </Button>
          </Link>
        </div>
      )}

      {/* Warning if cancelled */}
      {isCancelled && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <span className="font-bold">This booking was cancelled.</span>
            <p className="text-[11px] text-rose-700">Payment cannot be accepted for cancelled bookings.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Payment Options & Booking Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Method Selection Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Select Payment Option
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Pay Online Now */}
              <div
                onClick={() => !isAlreadyPaid && !isCancelled && setSelectedMethod("online")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedMethod === "online"
                    ? "border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-600/30"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                } ${isAlreadyPaid || isCancelled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === "online"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}>
                    {selectedMethod === "online" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Pay Now Online</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Instant
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Razorpay Gateway: UPI (GPay, PhonePe, Paytm), Debit/Credit Cards & NetBanking.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Secure 256-Bit SSL Checkout</span>
                </div>
              </div>

              {/* Option 2: Pay on Collection / Clinic Visit */}
              <div
                onClick={() => !isAlreadyPaid && !isCancelled && setSelectedMethod("collection")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedMethod === "collection"
                    ? "border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-600/30"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                } ${isAlreadyPaid || isCancelled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === "collection"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}>
                    {selectedMethod === "collection" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Pay at Collection</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Pay Later
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pay via Cash, Card or UPI when practitioner arrives or at clinic reception.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Pay during visit / You can still pay online later</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Summary Box */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Booking Number
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {booking.bookingNumber}
                </span>
              </div>
              <Badge variant={booking.bookingStatus === "CONFIRMED" ? "primary" : "warning"}>
                {booking.bookingStatus}
              </Badge>
            </div>

            {/* Service & Items List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Order Summary & Items
              </span>

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/70 overflow-hidden">
                {booking.items && booking.items.length > 0 ? (
                  booking.items.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{item.itemName}</span>
                        <span className="text-[11px] text-slate-500">
                          Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Standard Healthcare Consultation
                  </div>
                )}
              </div>
            </div>

            {/* Logistics Snapshot */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Scheduled Date:
                </span>
                <span className="font-semibold text-slate-800">{booking.bookingDate}</span>
              </div>

              {booking.appointment?.startTime && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Consultation Time:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {booking.appointment.startTime.slice(0, 5)} - {booking.appointment.endTime?.slice(0, 5)}
                  </span>
                </div>
              )}

              {booking.labCollection?.collectionType && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    Collection Mode:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {booking.labCollection.collectionType === "HOME"
                      ? "Home Phlebotomy Visit"
                      : "Lab Walk-in Center"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Final CTA */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Bill Breakdown</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(booking.subtotal || booking.totalAmount)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Discount / Offer</span>
                <span className="text-emerald-700">
                  -{formatCurrency(booking.discountAmount || 0)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Platform & Convenience Fee</span>
                <span className="text-emerald-700">Free</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900">
                <span className="text-sm">Total Payable</span>
                <span className="text-xl text-emerald-800">
                  {formatCurrency(booking.totalAmount)}
                </span>
              </div>
            </div>

            {/* Patient prefill info */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1 text-slate-600">
              <span className="font-bold text-slate-800 block">Patient / Payer</span>
              <p className="flex items-center gap-1.5 truncate">
                <User className="w-3 h-3 text-slate-400" />
                {user?.name || booking.user?.name || "Patient"}
              </p>
              <p className="flex items-center gap-1.5 truncate">
                <Mail className="w-3 h-3 text-slate-400" />
                {user?.email || booking.user?.email}
              </p>
            </div>

            {/* Dynamic CTA depending on chosen method */}
            {selectedMethod === "online" ? (
              <Button
                variant="primary"
                size="lg"
                onClick={handleInitiateOnlinePayment}
                isLoading={isProcessing}
                disabled={isAlreadyPaid || isCancelled || isProcessing}
                className="w-full font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Now {formatCurrency(booking.totalAmount)}</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handlePayOnCollection}
                isLoading={isPayOnCollectionLoading}
                disabled={isAlreadyPaid || isCancelled || isPayOnCollectionLoading}
                className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                <span>Confirm Pay on Collection</span>
              </Button>
            )}

            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              {selectedMethod === "online"
                ? "Simulated Razorpay Gateway • Instant verification with UPI & Cards"
                : "Pay in person • You can also return to your dashboard and Pay Now online anytime"}
            </p>
          </div>

          {/* Trust Banner */}
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 text-xs text-slate-700">
            <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold block text-slate-900">HealthSync AI Assurance</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Automated invoice generation, instant appointment slot holding, and hassle-free cancellation refunds.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Realistic Simulated Razorpay Checkout Modal */}
      <RazorpayModal
        isOpen={isRazorpayModalOpen}
        onClose={() => setIsRazorpayModalOpen(false)}
        orderData={activeOrderData}
        booking={booking}
        user={user}
        onSuccess={handlePaymentSuccess}
        onFailure={() => {
          setIsRazorpayModalOpen(false);
          router.push(`/dashboard/payment/result?bookingId=${booking.id}&status=failed`);
        }}
      />
    </div>
  );
}
