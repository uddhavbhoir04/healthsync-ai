"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { bookingsService } from "@/services/bookings.service";
import { usersService } from "@/services/users.service";
import {
  FlaskConical,
  Clock,
  ShieldCheck,
  Calendar,
  AlertCircle,
  MapPin,
  CheckCircle2,
  LogIn,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function getTomorrowString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TestDetailModal({ test, isOpen, onClose, onBookSuccess }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [collectionMethod, setCollectionMethod] = useState("home");
  const [selectedDate, setSelectedDate] = useState(getTomorrowString());
  const [selectedTime, setSelectedTime] = useState("08:30 AM");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address selection for home collection
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      async function loadUserAddresses() {
        try {
          setIsLoadingAddresses(true);
          const res = await usersService.getAddresses();
          const list = res?.data || res?.addresses || [];
          setAddresses(list);
          const def = list.find((a) => a.isDefault);
          if (def) {
            setSelectedAddressId(def.id);
          } else if (list.length > 0) {
            setSelectedAddressId(list[0].id);
          }
        } catch (err) {
          console.error("Failed to load user addresses:", err);
        } finally {
          setIsLoadingAddresses(false);
        }
      }
      loadUserAddresses();
    }
  }, [isOpen, isAuthenticated]);

  if (!test) return null;

  const testName = test.name || test.testName || "Diagnostic Test";
  const testPrice = test.price || test.offerPrice || 49;
  const isPackage = test.isPackage || test.category?.includes("Package");

  // Resolve numeric ID for database (if mock ID like 'LT-101' is passed, map to numeric fallback)
  const resolveDatabaseId = () => {
    if (typeof test.id === "number") return test.id;
    if (typeof test.id === "string" && !isNaN(Number(test.id))) return Number(test.id);
    return 1; // Fallback to primary catalog item in DB
  };

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      toast.info("Authentication Required", {
        description: "Please sign in or create an account to book this service.",
      });
      onClose();
      router.push(`/login?redirect=/dashboard/lab-tests`);
      return;
    }

    if (collectionMethod === "home" && !selectedAddressId) {
      toast.error("Address Required", {
        description: "Please select an address or switch to Walk-in Center.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const itemId = resolveDatabaseId();

      const payload = {
        bookingType: isPackage ? "PACKAGE" : "LAB_TEST",
        items: [{ id: itemId, quantity: 1 }],
        collectionType: collectionMethod === "home" ? "HOME" : "CENTER",
        addressId: collectionMethod === "home" ? Number(selectedAddressId) : null,
        preferredDate: selectedDate,
        preferredTimeSlot: selectedTime,
        notes: `Booked online for ${testName}`,
      };

      const res = await bookingsService.createBooking(payload);
      const createdBooking = res?.data || res?.booking;
      const bookingId = createdBooking?.id;

      toast.success("Booking Confirmed!", {
        description: `Booking #${createdBooking?.bookingNumber || "confirmed"} created successfully.`,
      });

      onClose();
      onBookSuccess?.(createdBooking);

      if (bookingId) {
        router.push(`/dashboard/bookings/${bookingId}/payment`);
      } else {
        router.push("/dashboard/bookings");
      }
    } catch (err) {
      console.error("Booking failed:", err);
      toast.error("Failed to confirm booking", {
        description: err.message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={testName}
      description={`Provided by ${test.provider || "HealthSync Accredited Diagnostics"}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {/* Price and Overview Banner */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-700 font-semibold uppercase tracking-wider">
              Service Price
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(testPrice)}
              </span>
              {test.originalPrice && (
                <span className="text-xs text-slate-400 line-through">
                  {formatCurrency(test.originalPrice)}
                </span>
              )}
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              CLIA Certified
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Digital Report Included</p>
          </div>
        </div>

        {/* Clinical Description */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            Clinical Overview
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {test.description || "Comprehensive clinical diagnostic pathology testing with digital verification."}
          </p>
        </div>

        {/* Preparation Guidelines */}
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900">Patient Preparation Instructions</p>
            <p className="text-amber-800 mt-0.5">
              {test.fastingRequired || "Standard fasting recommended. Drink adequate water before collection."}
            </p>
          </div>
        </div>

        {/* Booking Configuration: Collection Type */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-800 block">
            Choose Sample Collection Option
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCollectionMethod("home")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                collectionMethod === "home"
                  ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">Home Phlebotomy</span>
                {collectionMethod === "home" && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500">Certified nurse visits your residence</p>
            </button>

            <button
              type="button"
              onClick={() => setCollectionMethod("walkin")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                collectionMethod === "walkin"
                  ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">Walk-in Center</span>
                {collectionMethod === "walkin" && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500">Visit nearest HealthSync partner hub</p>
            </button>
          </div>
        </div>

        {/* Address Selection (if home collection) */}
        {collectionMethod === "home" && isAuthenticated && (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">Collection Address</label>
              <Link
                href="/dashboard/addresses"
                target="_blank"
                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Address
              </Link>
            </div>

            {isLoadingAddresses ? (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs animate-pulse">
                Loading addresses...
              </div>
            ) : addresses.length === 0 ? (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-[11px]">
                No addresses found in your profile. Please{" "}
                <Link href="/dashboard/addresses" className="font-bold underline">
                  add an address
                </Link>{" "}
                or switch to Walk-in Center above.
              </div>
            ) : (
              <select
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label ? `[${a.label}] ` : ""}
                    {a.addressLine1}, {a.city} {a.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Schedule Slot */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Date
            </label>
            <input
              type="date"
              min={getTomorrowString()}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Time Window
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="07:00 AM - 09:00 AM">07:00 AM - 09:00 AM (Fasting)</option>
              <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
              <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
              <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
              <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
            </select>
          </div>
        </div>

        {/* Not Logged In Warning */}
        {!isAuthenticated && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <LogIn className="w-4 h-4 text-blue-600" />
              Sign in required to confirm appointment
            </span>
            <Link href="/login?redirect=/dashboard/lab-tests">
              <span className="font-bold underline text-blue-700">Sign In</span>
            </Link>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            size="md"
            isLoading={isSubmitting}
            onClick={handleConfirmBooking}
            className="font-semibold shadow-md cursor-pointer"
          >
            {isAuthenticated ? "Confirm & Reserve Slot" : "Sign In & Book"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default TestDetailModal;
