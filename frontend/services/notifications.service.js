import { apiRequest } from "@/lib/api";

export const notificationsService = {
  /**
   * List user notifications
   */
  async getNotifications(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.isRead !== undefined && params.isRead !== "all") {
      searchParams.append("isRead", params.isRead);
    }
    if (params.type && params.type !== "all") {
      searchParams.append("type", params.type);
    }
    if (params.channel && params.channel !== "all") {
      searchParams.append("channel", params.channel);
    }

    const query = searchParams.toString();
    return apiRequest(query ? `/notifications?${query}` : "/notifications", {
      method: "GET",
    });
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    return apiRequest("/notifications/unread-count", {
      method: "GET",
    });
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id) {
    return apiRequest(`/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead() {
    return apiRequest("/notifications/read-all", {
      method: "PATCH",
    });
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id) {
    return apiRequest(`/notifications/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Get user notification preferences
   */
  async getPreferences() {
    return apiRequest("/notifications/preferences", {
      method: "GET",
    });
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(data) {
    return apiRequest("/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get VAPID public key for browser push subscription
   */
  async getVapidPublicKey() {
    return apiRequest("/notifications/push/vapid-public-key", {
      method: "GET",
    });
  },

  /**
   * Save Web Push subscription
   */
  async subscribePush(subscription) {
    return apiRequest("/notifications/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  },

  /**
   * Remove Web Push subscription
   */
  async unsubscribePush(endpoint) {
    return apiRequest("/notifications/push/unsubscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    });
  },

  // -------------------------------------------------------------
  // Admin APIs
  // -------------------------------------------------------------

  async getAdminNotifications(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.status && params.status !== "all") searchParams.append("status", params.status);
    if (params.channel && params.channel !== "all") searchParams.append("channel", params.channel);
    if (params.eventType && params.eventType !== "all") searchParams.append("eventType", params.eventType);
    if (params.search) searchParams.append("search", params.search);

    const query = searchParams.toString();
    return apiRequest(query ? `/admin/notifications?${query}` : "/admin/notifications", {
      method: "GET",
    });
  },

  async getAdminStats() {
    return apiRequest("/admin/notifications/stats", {
      method: "GET",
    });
  },

  async getAdminFailed(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);

    const query = searchParams.toString();
    return apiRequest(query ? `/admin/notifications/failed?${query}` : "/admin/notifications/failed", {
      method: "GET",
    });
  },

  async retryNotification(id) {
    return apiRequest(`/admin/notifications/${id}/retry`, {
      method: "POST",
    });
  },
};

