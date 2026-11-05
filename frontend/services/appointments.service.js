import { apiRequest } from "@/lib/api";

export const appointmentsService = {
  /**
   * Get available appointment slots for a doctor on a specific date
   * @param {number|string} doctorId
   * @param {string} date YYYY-MM-DD
   */
  async getDoctorSlots(doctorId, date) {
    const params = new URLSearchParams({ doctorId, date });
    return apiRequest(`/appointments/slots?${params.toString()}`, {
      method: "GET",
    });
  },

  /**
   * Book a doctor appointment
   */
  async createAppointment(data) {
    return apiRequest("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get appointments for logged-in user
   */
  async getMyAppointments(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.status && params.status !== "all") searchParams.append("status", params.status);

    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/appointments/my?${queryString}` : "/appointments/my", {
      method: "GET",
    });
  },

  /**
   * Get appointment details by ID
   */
  async getAppointmentById(id) {
    return apiRequest(`/appointments/${id}`, {
      method: "GET",
    });
  },

  /**
   * Cancel an appointment
   */
  async cancelAppointment(id, cancellationReason = "") {
    return apiRequest(`/appointments/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ cancellationReason }),
    });
  },

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(id, { newDate, newStartTime, newEndTime }) {
    return apiRequest(`/appointments/${id}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({ newDate, newStartTime, newEndTime }),
    });
  },
};

