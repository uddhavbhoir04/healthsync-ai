import { apiRequest } from "@/lib/api";

export const BOOKING_STATUSES = [
  "All",
  "CONFIRMED",
  "PENDING",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
];

export const bookingsService = {
  /**
   * Create a new booking for Lab Test(s) or Diagnostic Package(s)
   */
  async createBooking(data) {
    return apiRequest("/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get list of user bookings
   */
  async getMyBookings(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.type && params.type !== "all") searchParams.append("type", params.type);
    if (params.status && params.status !== "all" && params.status !== "All") {
      searchParams.append("status", params.status);
    }

    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/bookings?${queryString}` : "/bookings", {
      method: "GET",
    });
  },

  /**
   * Helper alias to fetch bookings list directly
   */
  async getBookings(params = {}) {
    const res = await this.getMyBookings(params);
    return res?.data || res || [];
  },

  /**
   * Get single booking details by ID
   */
  async getBookingById(id) {
    return apiRequest(`/bookings/${id}`, {
      method: "GET",
    });
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(id, reason = "") {
    return apiRequest(`/bookings/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  },

  // ----------------------------------------------------------------
  // Admin Booking Governance
  // ----------------------------------------------------------------

  /**
   * Admin: List all platform bookings with pagination and filters
   */
  async adminGetBookings(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.type && params.type !== "all") searchParams.append("type", params.type);
    if (params.status && params.status !== "all" && params.status !== "All") {
      searchParams.append("status", params.status);
    }
    if (params.search) searchParams.append("search", params.search);

    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/admin/bookings?${queryString}` : "/admin/bookings", {
      method: "GET",
    });
  },

  /**
   * Admin: Get single booking full details
   */
  async adminGetBookingById(id) {
    return apiRequest(`/admin/bookings/${id}`, {
      method: "GET",
    });
  },

  /**
   * Admin: Update booking status, payment status, sample status, or appointment status
   */
  async adminUpdateBookingStatus(id, statusData) {
    return apiRequest(`/admin/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(statusData),
    });
  },

  /**
   * Admin: Cancel a booking
   */
  async adminCancelBooking(id, reason = "") {
    return apiRequest(`/admin/bookings/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  },
};
