import { apiRequest } from "@/lib/api";

export const usersService = {
  /**
   * Fetch authenticated user's profile
   */
  async getProfile() {
    return apiRequest("/users/profile", {
      method: "GET",
    });
  },

  /**
   * Update authenticated user's profile
   * @param {{ name?: string, phone?: string, dateOfBirth?: string, gender?: string, profileImageUrl?: string }} payload
   */
  async updateProfile(payload) {
    return apiRequest("/users/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * List all addresses for the logged-in user
   */
  async getAddresses() {
    return apiRequest("/users/addresses", {
      method: "GET",
    });
  },

  /**
   * Add a new address
   * @param {Object} payload
   */
  async createAddress(payload) {
    return apiRequest("/users/addresses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update an existing address
   * @param {number|string} id
   * @param {Object} payload
   */
  async updateAddress(id, payload) {
    return apiRequest(`/users/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete an address
   * @param {number|string} id
   */
  async deleteAddress(id) {
    return apiRequest(`/users/addresses/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Mark an address as the default
   * @param {number|string} id
   */
  async setDefaultAddress(id) {
    return apiRequest(`/users/addresses/${id}/default`, {
      method: "PATCH",
    });
  },
};

