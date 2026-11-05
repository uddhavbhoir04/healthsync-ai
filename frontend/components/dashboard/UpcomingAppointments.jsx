import React from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, UserCheck, ArrowRight, Video, Stethoscope, FlaskConical, Package, CreditCard } from "lucide-react";
import { Badge } from "@/components/common/Badge";

export function UpcomingAppointments({ appointments = [] }) {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-center py-8">
        <p className="text-xs text-slate-500">No upcoming sample collections or consultations scheduled.</p>
        <Link
          href="/dashboard/lab-tests"
          className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline"
        >
          Book a Clinical Service →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((apt) => {
        const isDoctor = apt.bookingType === "DOCTOR" || !!apt.appointment;

        let title = apt.testName || "";
        if (isDoctor && apt.appointment?.doctor) {
          title = `Dr. ${apt.appointment.doctor.doctorName}`;
        } else if (apt.items && apt.items.length > 0) {
          title = apt.items.map((i) => i.itemName).join(", ");
        } else if (!title) {
          title = `Booking #${apt.bookingNumber || apt.id}`;
        }

        const date =
          apt.appointment?.appointmentDate ||
          apt.labCollection?.preferredDate ||
          apt.bookingDate ||
          apt.date ||
          "Scheduled";

        const time =
          (apt.appointment ? `${apt.appointment.startTime?.slice(0, 5)} - ${apt.appointment.endTime?.slice(0, 5)}` : null) ||
          apt.labCollection?.preferredTimeSlot ||
          apt.time ||
          "Standard Hours";

        let delivery = apt.collectionType || "Walk-in Center";
        if (isDoctor) {
          delivery =
            apt.appointment?.consultationType === "ONLINE"
              ? "Online Video Consultation"
              : "In-Person Clinic Visit";
        } else if (apt.labCollection) {
          delivery =
            apt.labCollection.collectionType === "HOME"
              ? "Home Phlebotomy Collection"
              : "Walk-in Diagnostic Center";
        }

        const status = apt.bookingStatus || apt.status || "CONFIRMED";
        const isUnpaid = (apt.paymentStatus === "PENDING" || apt.payment_status === "PENDING") && status !== "CANCELLED";

        return (
          <div
            key={apt.id || apt.bookingNumber}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 line-clamp-1">{title}</span>
                  <Badge variant={status === "CONFIRMED" || status === "Confirmed" ? "primary" : "teal"} size="sm">
                    {status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {apt.bookingNumber || apt.id} • {apt.bookingType || "SERVICE"}
                </p>
              </div>

              {isUnpaid && (
                <Link
                  href={`/dashboard/bookings/${apt.id}/payment`}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Pay</span>
                </Link>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{date} • {time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isDoctor && apt.appointment?.consultationType === "ONLINE" ? (
                  <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                )}
                <span className="truncate">{delivery}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default UpcomingAppointments;
