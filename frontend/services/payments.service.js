import { apiRequest } from "@/lib/api";

export const PAYMENT_STATUSES = [
  "All",
  "SUCCESS",
  "PENDING",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

export const paymentsService = {
  /**
   * Initiate payment order on backend for a booking
   */
  async createOrder({ bookingId, idempotencyKey }) {
    return apiRequest("/payments/create-order", {
      method: "POST",
      body: JSON.stringify({ bookingId, idempotencyKey }),
    });
  },

  /**
   * Verify checkout signature after customer pays
   */
  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    return apiRequest("/payments/verify", {
      method: "POST",
      body: JSON.stringify({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      }),
    });
  },

  /**
   * Retry payment for an unpaid or failed booking
   */
  async retryPayment({ bookingId }) {
    return apiRequest("/payments/retry", {
      method: "POST",
      body: JSON.stringify({ bookingId }),
    });
  },

  /**
   * Select Pay at Collection / Clinic Visit
   */
  async payOnCollection({ bookingId, paymentMethod = "PAY_ON_COLLECTION" }) {
    return apiRequest("/payments/pay-on-collection", {
      method: "POST",
      body: JSON.stringify({ bookingId, paymentMethod }),
    });
  },

  /**
   * List logged-in patient's payment transactions
   */
  async getMyPayments(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.status && params.status !== "all" && params.status !== "All") {
      searchParams.append("status", params.status);
    }
    if (params.bookingNumber) searchParams.append("bookingNumber", params.bookingNumber);
    if (params.startDate) searchParams.append("startDate", params.startDate);
    if (params.endDate) searchParams.append("endDate", params.endDate);

    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/payments?${queryString}` : "/payments", {
      method: "GET",
    });
  },

  /**
   * Get single payment transaction details
   */
  async getPaymentById(id) {
    return apiRequest(`/payments/${id}`, {
      method: "GET",
    });
  },

  /**
   * Get payments associated with a specific booking
   */
  async getPaymentsForBooking(bookingId) {
    return apiRequest(`/payments/booking/${bookingId}`, {
      method: "GET",
    });
  },

  /**
   * Get refunds associated with a payment transaction
   */
  async getMyRefunds(paymentId) {
    return apiRequest(`/payments/${paymentId}/refunds`, {
      method: "GET",
    });
  },

  // ----------------------------------------------------------------
  // Admin Payment Governance
  // ----------------------------------------------------------------

  /**
   * Admin: List all platform payment transactions
   */
  async adminGetPayments(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.status && params.status !== "all" && params.status !== "All") {
      searchParams.append("status", params.status);
    }
    if (params.search) searchParams.append("search", params.search);
    if (params.startDate) searchParams.append("startDate", params.startDate);
    if (params.endDate) searchParams.append("endDate", params.endDate);

    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/admin/payments?${queryString}` : "/admin/payments", {
      method: "GET",
    });
  },

  /**
   * Admin: Initiate full or partial refund
   */
  async adminInitiateRefund(paymentId, { amount, reason }) {
    return apiRequest(`/admin/payments/${paymentId}/refund`, {
      method: "POST",
      body: JSON.stringify({ amount, reason }),
    });
  },

  /**
   * Admin: Get refund history for a payment
   */
  async adminGetRefunds(paymentId) {
    return apiRequest(`/admin/payments/${paymentId}/refunds`, {
      method: "GET",
    });
  },
};

