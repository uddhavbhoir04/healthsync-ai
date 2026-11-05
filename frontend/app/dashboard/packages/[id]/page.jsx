"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import { packagesService } from "@/services/packages.service";
import { bookingsService } from "@/services/bookings.service";
import { usersService } from "@/services/users.service";
import {
  Package,
  ChevronLeft,
  FlaskConical,
  Clock,
  Sparkles,
  Droplets,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  CalendarCheck,
  MapPin,
  Building,
} from "lucide-react";
import { toast } from "sonner";

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const packageId = params?.id;

  const [pkg, setPkg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [collectionType, setCollectionType] = useState("HOME");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [preferredDate, setPreferredDate] = useState(getTodayString());
  const [preferredTimeSlot, setPreferredTimeSlot] = useState("07:00 AM - 09:00 AM");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadPackage() {
      if (!packageId) return;
      try {
        setIsLoading(true);
        const res = await packagesService.getPackageById(packageId);
        setPkg(res?.data || res?.package || res);
      } catch (err) {
        console.error("Failed to load package details:", err);
        toast.error("Package not found", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadPackage();
  }, [packageId]);

  const handleOpenBooking = async () => {
    setIsBookingModalOpen(true);
    setCollectionType("HOME");
    setSelectedAddressId("");
    setPreferredDate(getTodayString());
    setPreferredTimeSlot("07:00 AM - 09:00 AM");
    setBookingNotes("");

    try {
      setAddressesLoading(true);
      const res = await usersService.getAddresses();
      const addrList = res?.data || res?.addresses || [];
      setUserAddresses(addrList);
      const defaultAddr = addrList.find((a) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else if (addrList.length > 0) {
        setSelectedAddressId(addrList[0].id);
      }
    } catch (err) {
      console.error("Failed to load addresses:", err);
    } finally {
      setAddressesLoading(false);
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!pkg) return;

    if (collectionType === "HOME" && !selectedAddressId) {
      toast.error("Please select a sample collection address");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        bookingType: "PACKAGE",
        items: [{ id: pkg.id, quantity: 1 }],
        collectionType,
        addressId: collectionType === "HOME" ? Number(selectedAddressId) : null,
        preferredDate,
        preferredTimeSlot,
        notes: bookingNotes.trim() || undefined,
      };

      const res = await bookingsService.createBooking(payload);
      toast.success("Package Booked!", {
        description: `Booking #${res?.data?.bookingNumber || "confirmed"} created. Proceed to payment or choose pay at collection.`,
      });
      setIsBookingModalOpen(false);
      const bookingId = res?.data?.id || res?.data?.booking?.id;
      if (bookingId) {
        router.push(`/dashboard/bookings/${bookingId}/payment`);
      } else {
        router.push("/dashboard/bookings");
      }
    } catch (err) {
      console.error("Package booking failed:", err);
      toast.error("Booking failed", {
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 space-y-4 animate-pulse">
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-5 bg-slate-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-700">Diagnostic package not found</p>
        <Link href="/dashboard/packages">
          <Button variant="primary" size="sm">
            Back to Packages Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const orig = Number(pkg.originalPrice) || 0;
  const offer = Number(pkg.offerPrice) || 0;
  const savings = Math.max(0, orig - offer);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/packages"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Packages Catalog
        </Link>
      </div>

      {/* Package Hero Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-6">
        <div className="md:w-64 h-48 rounded-2xl overflow-hidden bg-slate-100 shrink-0 relative">
          {pkg.image ? (
            <img
              src={pkg.image}
              alt={pkg.packageName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-700 text-white p-4 text-center">
              <Package className="w-10 h-10 mb-2 opacity-80" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Certified Health Bundle
              </span>
            </div>
          )}

          {savings > 0 && (
            <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
              Save ${savings.toFixed(0)}
            </div>
          )}
        </div>

        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100 uppercase tracking-wide">
              {pkg.packageCode}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Includes {pkg.tests?.length || 0} Clinical Assays
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">{pkg.packageName}</h1>

          <p className="text-xs text-slate-600 leading-relaxed">
            {pkg.description ||
              "Comprehensive diagnostic package curated by senior pathologists for preventive healthcare screening."}
          </p>

          <div className="pt-2 flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-extrabold text-slate-900">
              ${offer.toFixed(2)}
            </span>
            {orig > offer && (
              <span className="text-sm text-slate-400 line-through">
                ${orig.toFixed(2)}
              </span>
            )}
            {savings > 0 && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                ${savings.toFixed(2)} Institutional Discount Applied
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Included Tests List */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-600" />
            <span>Included Clinical Tests ({pkg.tests?.length || 0})</span>
          </h2>
        </div>

        {!pkg.tests || pkg.tests.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 text-center text-xs text-slate-400">
            No specific test assays mapped to this package yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pkg.tests.map((test) => (
              <div
                key={test.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">
                    {test.testName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {test.testCode}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {test.description || "Laboratory assay testing."}
                </p>

                <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-rose-500" />
                    {test.sampleType}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    {test.fastingRequired ? "Fasting Required" : "No Fasting"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Booking Card */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">
              Home Sample Collection Available
            </span>
            <p className="text-[11px] text-slate-400">
              A certified phlebotomist visits your registered address with cool-chain preservation kits.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenBooking}
            className="shadow-md shadow-blue-600/20 font-semibold"
          >
            Book Package Now (${offer.toFixed(2)})
          </Button>
        </div>
      </div>

      {/* Package Booking Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={`Book Package: ${pkg.packageName}`}
        description={`Package Code: ${pkg.packageCode} • Total: $${offer.toFixed(2)}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
          {/* Collection Type Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Specimen Collection Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCollectionType("HOME")}
                className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  collectionType === "HOME"
                    ? "border-blue-600 bg-blue-50 text-blue-900 font-bold"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Home Sample Collection</span>
              </button>

              <button
                type="button"
                onClick={() => setCollectionType("LAB_VISIT")}
                className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  collectionType === "LAB_VISIT"
                    ? "border-blue-600 bg-blue-50 text-blue-900 font-bold"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <Building className="w-4 h-4 text-blue-600" />
                <span>Lab Walk-in Diagnostic Hub</span>
              </button>
            </div>
          </div>

          {/* Address Selection if Home Collection */}
          {collectionType === "HOME" && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  Select Collection Address *
                </label>
                <Link
                  href="/dashboard/addresses"
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  + Manage Addresses
                </Link>
              </div>

              {addressesLoading ? (
                <p className="text-slate-400">Loading your saved addresses...</p>
              ) : userAddresses.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
                  <p className="font-semibold">No saved address found</p>
                  <p className="text-[11px]">
                    Please add an address first to request home sample collections.
                  </p>
                  <Link
                    href="/dashboard/addresses"
                    className="inline-block mt-1 font-bold text-blue-600 underline"
                  >
                    Go to Address Management →
                  </Link>
                </div>
              ) : (
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-blue-500"
                >
                  {userAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.addressType}: {addr.line1}, {addr.city} ({addr.pincode}){" "}
                      {addr.isDefault ? "• [Default]" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Preferred Date *
              </label>
              <input
                type="date"
                min={getTodayString()}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Preferred Time Slot *
              </label>
              <select
                value={preferredTimeSlot}
                onChange={(e) => setPreferredTimeSlot(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="07:00 AM - 09:00 AM">07:00 AM - 09:00 AM (Early Morning)</option>
                <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM (Morning)</option>
                <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM (Noon)</option>
                <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM (Afternoon)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Phlebotomy Notes / Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="e.g. Landmark instructions, call on arrival, preferred arm..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Pricing Summary */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-950 block">{pkg.packageName}</span>
              <span className="text-[11px] text-emerald-700">
                {collectionType === "HOME" ? "Home Sample Collection Included" : "Lab Walk-in"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-emerald-800 block">
                ${offer.toFixed(2)}
              </span>
              {orig > offer && (
                <span className="text-[10px] text-emerald-600">
                  Saved ${(orig - offer).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBookingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={collectionType === "HOME" && userAddresses.length === 0}
            >
              Confirm Package Booking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
