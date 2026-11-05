"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Modal from "@/components/common/Modal";
import { doctorsService } from "@/services/doctors.service";
import { appointmentsService } from "@/services/appointments.service";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/lib/auth";
import {
  Stethoscope,
  MapPin,
  Calendar,
  Clock,
  Award,
  GraduationCap,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Info,
  CalendarCheck,
  PhoneCall,
  CheckCircle2,
  Video,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.id;
  const { user } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotData, setSlotData] = useState({ slots: [] });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [consultationType, setConsultationType] = useState("IN_PERSON");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientGender, setPatientGender] = useState("MALE");
  const [patientAge, setPatientAge] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadDoctor() {
      if (!doctorId) return;
      try {
        setIsLoading(true);
        const [docRes, availRes] = await Promise.all([
          doctorsService.getDoctorById(doctorId),
          doctorsService.getDoctorAvailability(doctorId).catch(() => ({ availability: [] })),
        ]);

        setDoctor(docRes?.data || docRes?.doctor || docRes);
        setAvailability(availRes?.data || availRes?.availability || []);
      } catch (err) {
        console.error("Failed to fetch doctor details:", err);
        toast.error("Doctor profile not found", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDoctor();
  }, [doctorId]);

  // Load available slots whenever date changes in booking modal
  const loadSlots = useCallback(async (date) => {
    if (!doctorId || !date) return;
    try {
      setSlotsLoading(true);
      setSelectedSlot(null);
      const res = await appointmentsService.getDoctorSlots(doctorId, date);
      setSlotData(res?.data || { slots: [] });
    } catch (err) {
      console.error("Failed to load slots:", err);
      setSlotData({ slots: [] });
    } finally {
      setSlotsLoading(false);
    }
  }, [doctorId]);

  const handleOpenBooking = () => {
    setPatientName(user?.name || "");
    setPatientPhone(user?.phone || "");
    setPatientGender(user?.gender || "MALE");
    setSelectedSlot(null);
    setIsBookingModalOpen(true);
    loadSlots(selectedDate);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    loadSlots(newDate);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error("Please select an available time slot");
      return;
    }

    if (!patientName.trim()) {
      toast.error("Please enter patient name");
      return;
    }

    if (!patientPhone.trim()) {
      toast.error("Please enter patient contact phone number");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        doctorId: Number(doctorId),
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        consultationType,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientGender,
        patientAge: patientAge ? Number(patientAge) : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await appointmentsService.createAppointment(payload);
      toast.success("Appointment Booked!", {
        description: `Booking #${res?.data?.booking?.bookingNumber || "confirmed"} created. Proceed to payment or choose pay at clinic.`,
      });
      setIsBookingModalOpen(false);
      const bookingId = res?.data?.booking?.id || res?.data?.id;
      if (bookingId) {
        router.push(`/dashboard/bookings/${bookingId}/payment`);
      } else {
        router.push("/dashboard/bookings");
      }
    } catch (err) {
      console.error("Booking error:", err);
      toast.error("Could not complete booking", {
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
          <div className="w-24 h-24 rounded-3xl bg-slate-200" />
          <div className="h-5 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-1/4" />
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-700">Doctor not found</p>
        <Link href="/dashboard/doctors">
          <Button variant="primary" size="sm">
            Back to Doctors Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Specialists Directory
        </Link>
      </div>

      {/* Doctor Hero Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {doctor.profileImage ? (
          <img
            src={doctor.profileImage}
            alt={doctor.doctorName}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-slate-100 shadow-md shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-blue-600 via-blue-700 to-teal-500 text-white font-black text-3xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
            {getInitials(doctor.doctorName)}
          </div>
        )}

        <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 truncate">
              {doctor.doctorName}
            </h1>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100 uppercase tracking-wide self-center sm:self-auto">
              {doctor.specialization}
            </span>
          </div>

          <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
            <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{doctor.qualification}</span>
          </p>

          <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {doctor.city}, {doctor.pincode}
            </span>
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              {doctor.experienceYears} Years Clinical Experience
            </span>

            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              ${Number(doctor.consultationFee).toFixed(2)} Consultation Fee
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: About & Qualifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Doctor */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Professional Biography</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              {doctor.about ||
                `${doctor.doctorName} is a licensed medical practitioner specializing in ${doctor.specialization}. Dedicated to providing evidence-based healthcare and patient consultations.`}
            </p>
          </div>

          {/* Clinical Credentials */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Licensing & Certifications</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Board Qualification:</span>
                <span className="font-semibold text-slate-900">{doctor.qualification}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Medical Specialty:</span>
                <span className="font-semibold text-slate-900">{doctor.specialization}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Practice Location:</span>
                <span className="font-semibold text-slate-900">
                  {doctor.city} (Postal Code: {doctor.pincode})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Weekly Availability & Active Booking */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-teal-600" />
              <span>Weekly Availability</span>
            </h3>

            {availability.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-400">
                No active consultation hours published for this week.
              </div>
            ) : (
              <div className="space-y-2">
                {availability.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{slot.dayOfWeek}</p>
                      <p className="text-[11px] text-slate-500">
                        {slot.slotDuration} min sessions
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-[11px]">
                        <Clock className="w-3 h-3 text-blue-600" />
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active Appointment Booking Action */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-800">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Instant Appointment Scheduling</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Choose a suitable date and available time slot to consult Dr. {doctor.doctorName}.
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleOpenBooking}
                className="w-full font-semibold shadow-md shadow-blue-600/20"
              >
                Book Consultation Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={`Book Consultation: Dr. ${doctor.doctorName}`}
        description={`${doctor.specialization} • Fee: $${Number(doctor.consultationFee).toFixed(2)}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
          {/* Date Picker */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Appointment Date
            </label>
            <input
              type="date"
              min={getTodayString()}
              value={selectedDate}
              onChange={handleDateChange}
              required
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Consultation Type Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Consultation Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConsultationType("IN_PERSON")}
                className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  consultationType === "IN_PERSON"
                    ? "border-blue-600 bg-blue-50 text-blue-900 font-bold"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Clinic Visit ({doctor.city})</span>
              </button>

              <button
                type="button"
                onClick={() => setConsultationType("ONLINE")}
                className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  consultationType === "ONLINE"
                    ? "border-blue-600 bg-blue-50 text-blue-900 font-bold"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <Video className="w-4 h-4 text-blue-600" />
                <span>Online Video Consultation</span>
              </button>
            </div>
          </div>

          {/* Time Slot Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Available Time Slots ({slotData.dayOfWeek || "Selected Date"})
            </label>

            {slotsLoading ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                <span className="text-[11px] text-slate-500">Checking doctor availability...</span>
              </div>
            ) : !slotData.slots || slotData.slots.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Doctor has no consultation slots scheduled for this day of the week. Please select another date.</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                {slotData.slots.map((slot, idx) => {
                  const isSelected =
                    selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.endTime === slot.endTime;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2 rounded-xl text-center text-xs font-semibold border transition-all cursor-pointer ${
                        !slot.isAvailable
                          ? "bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed"
                          : isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50"
                      }`}
                    >
                      <span>{slot.startTime}</span>
                      {!slot.isAvailable && (
                        <span className="block text-[9px] text-slate-400 font-normal">
                          {slot.unavailableReason || "Unavailable"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Patient Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">
              Patient Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Gender</label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Age (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="e.g. 35"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 mb-1">Chief Complaints / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Brief description of symptoms or consultation goals (optional)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Submit */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <span className="font-bold text-emerald-950">Consultation Fee</span>
            <span className="text-sm font-bold text-emerald-800">
              ${Number(doctor.consultationFee).toFixed(2)}
            </span>
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
              disabled={!selectedSlot || isSubmitting}
            >
              Confirm Appointment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
