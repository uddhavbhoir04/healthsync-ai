"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  Lock,
  X,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function RazorpayModal({
  isOpen,
  onClose,
  orderData,
  booking,
  user,
  onSuccess,
  onFailure
}) {
  const [activeTab, setActiveTab] = useState("upi"); // 'upi' | 'card' | 'netbanking'
  const [upiOption, setUpiOption] = useState("apps"); // 'apps' | 'id' | 'qr'
  const [upiId, setUpiId] = useState("");
  const [selectedApp, setSelectedApp] = useState("gpay");

  // Card Form State
  const [cardNumber, setCardNumber] = useState("4532 8190 2341 5529");
  const [cardExpiry, setCardExpiry] = useState("08/29");
  const [cardCvv, setCardCvv] = useState("892");
  const [cardName, setCardName] = useState(user?.name || "Alex Morgan");

  // Netbanking State
  const [selectedBank, setSelectedBank] = useState("HDFC");

  // Payment Processing Animation States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0); // 0: idle, 1: connecting, 2: authorizing, 3: success

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setProcessingStep(0);
      setActiveTab("upi");
      setUpiOption("apps");
    }
  }, [isOpen]);

  if (!isOpen || !orderData) return null;

  const totalAmount = booking?.totalAmount || (orderData.amount ? orderData.amount / 100 : 0);

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + "/" + raw.slice(2);
    }
    setCardExpiry(raw);
  };

  const handlePay = async () => {
    setIsProcessing(true);
    setProcessingStep(1); // Connecting to gateway

    // Step 1: Connecting (600ms)
    setTimeout(() => {
      setProcessingStep(2); // Authorizing transaction with bank (800ms)
      setTimeout(async () => {
        setProcessingStep(3); // Success checkmark
        setTimeout(() => {
          // Send simulated success to backend verification
          const simulatedPaymentId = `pay_sim_${Date.now()}`;
          const simulatedSignature = "simulated_razorpay_signature";
          onSuccess?.({
            razorpay_order_id: orderData.razorpayOrderId || orderData.id,
            razorpay_payment_id: simulatedPaymentId,
            razorpay_signature: simulatedSignature
          });
        }, 700);
      }, 900);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 transition-all flex flex-col"
        style={{ minHeight: "530px" }}
      >
        {/* Razorpay Authentic Branded Header */}
        <div className="bg-[#0c2340] text-white p-4 sm:p-5 relative select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-inner">
                H
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight leading-tight">HealthSync AI Healthcare</h3>
                <p className="text-[11px] text-blue-200 font-mono">
                  Ref: {orderData.bookingNumber || booking?.bookingNumber || "ORD-2026"}
                </p>
              </div>
            </div>

            <div className="text-right flex items-center gap-3">
              <div>
                <span className="text-[10px] text-blue-200 uppercase tracking-wider block font-medium">
                  Amount to Pay
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-white">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              {!isProcessing && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close payment window"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-400" />
              Secured by <span className="font-bold text-white tracking-wide">Razorpay</span> Standard Checkout
            </span>
            <span className="bg-blue-900/60 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-blue-400/20">
              Simulated Gateway Ready
            </span>
          </div>
        </div>

        {/* Processing State Overlay */}
        {isProcessing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50">
            {processingStep < 3 ? (
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-600 animate-in zoom-in">
                <CheckCircle2 className="w-9 h-9" />
              </div>
            )}

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                {processingStep === 1 && "Connecting to Razorpay Secure Gateway..."}
                {processingStep === 2 && "Authorizing with Issuing Bank..."}
                {processingStep === 3 && "Payment Verified Successfully!"}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {processingStep === 3
                  ? "Redirecting to your confirmed booking summary..."
                  : "Please do not refresh or hit the back button while we finalize your medical appointment order."}
              </p>
            </div>
          </div>
        ) : (
          /* Main Payment Body */
          <div className="flex-1 flex flex-col sm:flex-row">
            {/* Left Tab Navigation */}
            <div className="w-full sm:w-44 bg-slate-50 border-b sm:border-b-0 sm:border-r border-slate-200 p-2 sm:p-3 flex sm:flex-col gap-1.5 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("upi")}
                className={`flex-1 sm:flex-none flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  activeTab === "upi"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-200/60"
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={`flex-1 sm:flex-none flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  activeTab === "card"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-200/60"
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("netbanking")}
                className={`flex-1 sm:flex-none flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  activeTab === "netbanking"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-200/60"
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span>NetBanking</span>
              </button>
            </div>

            {/* Right Tab Content */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
              {/* UPI Tab */}
              {activeTab === "upi" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setUpiOption("apps")}
                      className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        upiOption === "apps" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      UPI Apps
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiOption("id")}
                      className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        upiOption === "id" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      UPI ID / VPA
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiOption("qr")}
                      className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        upiOption === "qr" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Scan QR
                    </button>
                  </div>

                  {upiOption === "apps" && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { id: "gpay", name: "Google Pay", color: "from-blue-50 to-indigo-50 border-blue-200 text-blue-800" },
                        { id: "phonepe", name: "PhonePe", color: "from-purple-50 to-indigo-50 border-purple-200 text-purple-800" },
                        { id: "paytm", name: "Paytm UPI", color: "from-sky-50 to-cyan-50 border-sky-200 text-sky-800" },
                        { id: "bhim", name: "BHIM UPI", color: "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800" }
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setSelectedApp(app.id)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedApp === app.id
                              ? "border-blue-600 bg-blue-50/70 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                              {app.name.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-800">{app.name}</span>
                          </div>
                          {selectedApp === app.id && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {upiOption === "id" && (
                    <div className="space-y-3 pt-1 text-xs">
                      <label className="block text-slate-700 font-semibold">
                        Enter any Virtual Payment Address (UPI ID)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. mobile@okaxis, user@okhdfcbank"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["@okhdfcbank", "@okaxis", "@oksbi", "@paytm", "@ybl"].map((suffix) => (
                          <button
                            key={suffix}
                            type="button"
                            onClick={() => setUpiId((prev) => (prev.split("@")[0] || "user") + suffix)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 font-mono transition-colors cursor-pointer"
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {upiOption === "qr" && (
                    <div className="flex flex-col items-center justify-center py-2 space-y-2 text-center">
                      <div className="p-3 bg-white rounded-2xl border-2 border-slate-800 shadow-sm relative">
                        {/* Realistic Mock QR Code Grid */}
                        <div className="w-36 h-36 bg-gradient-to-br from-slate-900 to-slate-800 p-2 rounded-lg flex flex-col justify-between">
                          <div className="flex justify-between">
                            <div className="w-8 h-8 bg-white rounded-xs p-1">
                              <div className="w-full h-full bg-slate-900" />
                            </div>
                            <div className="w-8 h-8 bg-white rounded-xs p-1">
                              <div className="w-full h-full bg-slate-900" />
                            </div>
                          </div>
                          <div className="flex justify-center items-center">
                            <span className="text-[9px] font-bold text-white bg-blue-600 px-1 rounded tracking-widest">
                              UPI
                            </span>
                          </div>
                          <div className="flex justify-start">
                            <div className="w-8 h-8 bg-white rounded-xs p-1">
                              <div className="w-full h-full bg-slate-900" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Scan with GPay, PhonePe, Paytm or BHIM
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Card Tab */}
              {activeTab === "card" && (
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4532 •••• •••• ••••"
                        maxLength={19}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs pl-10"
                      />
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        VISA / MC
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Valid Thru</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM / YY"
                        maxLength={5}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">CVV / CVC</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.slice(0, 4))}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Name on Card</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Cardholder Name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* NetBanking Tab */}
              {activeTab === "netbanking" && (
                <div className="space-y-3 pt-1 text-xs">
                  <span className="block text-slate-700 font-semibold">Select Popular Bank</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: "HDFC", name: "HDFC Bank" },
                      { code: "ICICI", name: "ICICI Bank" },
                      { code: "SBI", name: "State Bank of India" },
                      { code: "AXIS", name: "Axis Bank" },
                      { code: "KOTAK", name: "Kotak Mahindra" },
                      { code: "OTHER", name: "Other 50+ Banks" }
                    ].map((bank) => (
                      <button
                        key={bank.code}
                        type="button"
                        onClick={() => setSelectedBank(bank.code)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          selectedBank === bank.code
                            ? "border-blue-600 bg-blue-50/70 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-800">{bank.name}</span>
                        {selectedBank === bank.code && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Pay Button */}
              <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handlePay}
                  className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span>Pay {formatCurrency(totalAmount)}</span>
                </button>

                <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-Bit SSL Encrypted • PCI-DSS Compliant</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

