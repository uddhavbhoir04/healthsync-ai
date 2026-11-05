import React from "react";
import Link from "next/link";
import Badge from "@/components/common/Badge";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Clock, MapPin, Eye, Stethoscope, FlaskConical, Package, Video, CreditCard } from "lucide-react";

export function BookingTable({
  bookings = [],
  onSelectBooking,
  limit,
}) {
  const displayBookings = limit ? bookings.slice(0, limit) : bookings;

  const getStatusBadgeVariant = (status) => {
    switch (status?.toUpperCase()) {
      case "CONFIRMED":
        return "primary";
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "danger";
      case "RESCHEDULED":
        return "teal";
      case "PENDING":
      default:
        return "warning";
    }
  };

  const getItemIcon = (type) => {
    switch (type) {
      case "DOCTOR":
        return <Stethoscope className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      case "LAB_TEST":
        return <FlaskConical className="w-3.5 h-3.5 text-teal-600 shrink-0" />;
      case "PACKAGE":
        return <Package className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
      default:
        return <FlaskConical className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
          <tr>
            <th className="px-5 py-3.5">Booking & Service</th>
            <th className="px-5 py-3.5">Schedule</th>
            <th className="px-5 py-3.5">Consultation / Collection</th>
            <th className="px-5 py-3.5">Amount</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {displayBookings.map((b) => {
            const bookingNumber = b.bookingNumber || b.id;
            const isDoctor = b.bookingType === "DOCTOR" || !!b.appointment;

            let title = b.testName || "";
            if (isDoctor && b.appointment?.doctor) {
              title = `Dr. ${b.appointment.doctor.doctorName} - ${b.appointment.doctor.specialization}`;
            } else if (b.items && b.items.length > 0) {
              title = b.items.map((i) => i.itemName).join(", ");
            } else if (!title) {
              title = `Booking #${bookingNumber}`;
            }

            const scheduleDate =
              b.appointment?.appointmentDate ||
              b.labCollection?.preferredDate ||
              b.bookingDate ||
              b.date ||
              "Scheduled";

            const scheduleTime =
              (b.appointment ? `${b.appointment.startTime?.slice(0, 5)} - ${b.appointment.endTime?.slice(0, 5)}` : null) ||
              b.labCollection?.preferredTimeSlot ||
              b.time ||
              "Standard hours";

            let deliveryMode = b.collectionType || "Walk-in Center";
            if (isDoctor) {
              deliveryMode =
                b.appointment?.consultationType === "ONLINE"
                  ? "Online Video Consultation"
                  : "In-Person Clinic Visit";
            } else if (b.labCollection) {
              deliveryMode =
                b.labCollection.collectionType === "HOME"
                  ? "Home Sample Collection"
                  : "Lab Visit / Walk-in";
            }

            const amount = b.totalAmount !== undefined ? b.totalAmount : b.amount;
            const status = b.bookingStatus || b.status || "CONFIRMED";

            return (
              <tr
                key={b.id || bookingNumber}
                className="hover:bg-slate-50/80 transition-colors duration-150 group"
              >
                <td className="px-5 py-4">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 mt-0.5">
                      {getItemIcon(b.bookingType)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {title}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {bookingNumber} • {b.bookingType || "SERVICE"}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex flex-col text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {scheduleDate}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {scheduleTime}
                    </span>
                  </div>
                </td>

                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    {isDoctor && b.appointment?.consultationType === "ONLINE" ? (
                      <Video className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    )}
                    {deliveryMode}
                  </span>
                </td>

                <td className="px-5 py-4 whitespace-nowrap font-semibold text-slate-900">
                  {formatCurrency(amount)}
                </td>

                <td className="px-5 py-4 whitespace-nowrap">
                  <Badge variant={getStatusBadgeVariant(status)}>
                    {status}
                  </Badge>
                </td>

                <td className="px-5 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    {b.paymentStatus === "PENDING" && b.bookingStatus !== "CANCELLED" ? (
                      <Link
                        href={`/dashboard/bookings/${b.id}/payment`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xs transition-colors shrink-0"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Now</span>
                      </Link>
                    ) : b.paymentStatus === "PAID" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                        PAID
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onSelectBooking?.(b)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default BookingTable;
