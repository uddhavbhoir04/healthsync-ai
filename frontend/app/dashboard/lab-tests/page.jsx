"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import EmptyState from "@/components/common/EmptyState";
import { labTestsService } from "@/services/labTests.service";
import { bookingsService } from "@/services/bookings.service";
import { usersService } from "@/services/users.service";
import {
  FlaskConical,
  Search,
  Filter,
  AlertCircle,
  Clock,
  Sparkles,
  Droplets,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  CheckCircle2,
  MapPin,
  Calendar,
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

export default function LabTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [fastingFilter, setFastingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [isLoading, setIsLoading] = useState(true);

  // Selected test for info modal
  const [selectedTest, setSelectedTest] = useState(null);

  // Booking Flow State
  const [bookingTest, setBookingTest] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [collectionType, setCollectionType] = useState("HOME");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [preferredDate, setPreferredDate] = useState(getTodayString());
  const [preferredTimeSlot, setPreferredTimeSlot] = useState("07:00 AM - 09:00 AM");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await labTestsService.getCategories();
        setCategories(res?.data || res?.categories || []);
      } catch (err) {
        console.error("Failed to load test categories:", err);
      }
    }
    loadCategories();
  }, []);

  const fetchTests = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const res = await labTestsService.getPublicLabTests({
          page: pageToLoad,
          limit: 9,
          search: search.trim() || undefined,
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          fastingRequired: fastingFilter !== "all" ? fastingFilter : undefined,
          sortBy,
          sortOrder,
        });

        const list = res?.data || res?.tests || [];
        setTests(list);
        if (res?.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error("Failed to fetch lab tests:", err);
        toast.error("Failed to load lab catalog", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [search, selectedCategory, fastingFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchTests(1);
  }, [fetchTests]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTests(1);
  };

  const handleOpenBooking = async (test) => {
    setBookingTest(test);
    setSelectedAddressId("");
    setCollectionType("HOME");
    setPreferredDate(getTodayString());
    setPreferredTimeSlot("07:00 AM - 09:00 AM");
    setBookingNotes("");

    // Load addresses for home collection
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
      console.error("Failed to fetch user addresses:", err);
    } finally {
      setAddressesLoading(false);
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingTest) return;

    if (collectionType === "HOME" && !selectedAddressId) {
      toast.error("Please select a sample collection address");
      return;
    }

    try {
      setIsSubmittingBooking(true);
      const payload = {
        bookingType: "LAB_TEST",
        items: [{ id: bookingTest.id, quantity: 1 }],
        collectionType,
        addressId: collectionType === "HOME" ? Number(selectedAddressId) : null,
        preferredDate,
        preferredTimeSlot,
        notes: bookingNotes.trim() || undefined,
      };

      const res = await bookingsService.createBooking(payload);
      toast.success("Lab Test Booked!", {
        description: `Booking #${res?.data?.bookingNumber || "confirmed"} created. Proceed to payment or choose pay at collection.`,
      });
      setBookingTest(null);
      setSelectedTest(null);
      const bookingId = res?.data?.id || res?.data?.booking?.id;
      if (bookingId) {
        router.push(`/dashboard/bookings/${bookingId}/payment`);
      } else {
        router.push("/dashboard/bookings");
      }
    } catch (err) {
      console.error("Booking failed:", err);
      toast.error("Failed to confirm booking", {
        description: err.message,
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          badge="Diagnostic Catalog"
          title="Clinical Laboratory Tests"
          description="Explore certified individual assays, sample collection guidelines, fasting windows, and transparent clinical pricing."
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests by name, assay code (e.g. CBC-001), or description..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" className="font-semibold">
            Search Tests
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Fasting Required Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Fasting:</span>
            <select
              value={fastingFilter}
              onChange={(e) => setFastingFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Requirements</option>
              <option value="true">Fasting Required</option>
              <option value="false">No Fasting Required</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <span className="text-slate-400 font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="createdAt">Date Added</option>
              <option value="price">Test Fee</option>
              <option value="test_name">Alphabetical</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {sortOrder === "ASC" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
        </div>
      </div>

      {/* Lab Tests Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-3xl bg-white border border-slate-200/80 p-6 space-y-4 animate-pulse"
            >
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-16 bg-slate-100 rounded" />
              <div className="h-8 bg-slate-200 rounded w-1/4 mt-auto" />
            </div>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <EmptyState
            icon={FlaskConical}
            title="No diagnostic assays found"
            description="Try modifying your keyword search or category filters to locate laboratory tests."
            actionLabel="Reset Search"
            onAction={() => {
              setSearch("");
              setSelectedCategory("all");
              setFastingFilter("all");
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map((test) => {
            return (
              <div
                key={test.id}
                className="group flex flex-col justify-between p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-300 transition-all duration-200 shadow-xs hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Category & Test Code */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wide">
                      {test.category}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-slate-400">
                      {test.testCode}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1.5">
                    {test.testName}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                    {test.description || "Certified laboratory specimen collection and automated digital analysis."}
                  </p>

                  {/* Metadata Chips */}
                  <div className="space-y-2 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-rose-500" />
                        Sample Type:
                      </span>
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {test.sampleType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        Fasting:
                      </span>
                      <span
                        className={`font-semibold text-[11px] ${
                          test.fastingRequired ? "text-amber-700" : "text-emerald-700"
                        }`}
                      >
                        {test.fastingRequired ? "10-12 hrs Required" : "No Fasting Needed"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Price & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Assay Fee
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      ${Number(test.price).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTest(test)}
                      className="font-semibold text-xs px-2.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenBooking(test)}
                      className="font-semibold text-xs shadow-xs"
                    >
                      Book Test
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {tests.length > 0 && (
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
            of <span className="font-semibold text-slate-800">{pagination.total}</span> lab
            tests
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTests(pagination.page - 1)}
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
              onClick={() => fetchTests(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Test Detail Modal */}
      <Modal
        isOpen={!!selectedTest}
        onClose={() => setSelectedTest(null)}
        title={selectedTest?.testName || "Assay Information"}
        description={`Clinical Test Code: ${selectedTest?.testCode || ""} • Category: ${selectedTest?.category || ""}`}
        maxWidth="max-w-xl"
      >
        {selectedTest && (
          <div className="space-y-4 text-xs">
            {/* Description */}
            <div className="space-y-1">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Clinical Overview
              </span>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {selectedTest.description || "Certified medical lab test performed under CLIA-compliant standards."}
              </p>
            </div>

            {/* Preparation Instructions */}
            <div className="space-y-1">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Patient Preparation Guidelines
              </span>
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 text-amber-900 leading-relaxed">
                {selectedTest.preparationInstructions ||
                  (selectedTest.fastingRequired
                    ? "Strict fasting of 10-12 hours required before blood draw. Only plain water is permitted."
                    : "No specific dietary preparation necessary. Stay adequately hydrated.")}
              </div>
            </div>

            {/* Key Specs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                  Specimen Collection
                </span>
                <span className="font-semibold text-slate-800">{selectedTest.sampleType}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                  Assay Fee
                </span>
                <span className="font-bold text-emerald-700 text-sm">
                  ${Number(selectedTest.price).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedTest(null)}>
                Close
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const t = selectedTest;
                  setSelectedTest(null);
                  handleOpenBooking(t);
                }}
              >
                Book This Test
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Test Booking Modal */}
      <Modal
        isOpen={!!bookingTest}
        onClose={() => setBookingTest(null)}
        title={`Book Test: ${bookingTest?.testName}`}
        description={`Assay Code: ${bookingTest?.testCode} • Fee: $${Number(bookingTest?.price || 0).toFixed(2)}`}
        maxWidth="max-w-xl"
      >
        {bookingTest && (
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
                  <span>Lab Walk-in Center Visit</span>
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
                      Please add an address first to request home phlebotomy visits.
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

            {/* Special Instructions */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Phlebotomy Notes / Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="e.g. Ring doorbell, call on arrival, elderly patient..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Pricing Summary */}
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">{bookingTest.testName}</span>
                <span className="text-[11px] text-emerald-700">
                  {collectionType === "HOME" ? "Home Sample Collection Included" : "Lab Visit"}
                </span>
              </div>
              <span className="text-base font-bold text-emerald-800">
                ${Number(bookingTest.price).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBookingTest(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingBooking}
                disabled={collectionType === "HOME" && userAddresses.length === 0}
              >
                Confirm Test Booking
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
