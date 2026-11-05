import { apiRequest } from "@/lib/api";

export const adminService = {
  /**
   * List users with pagination, search and filters
   * @param {Object} params
   */
  async getUsers(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.search) searchParams.append("search", params.search);
    if (params.role) searchParams.append("role", params.role);
    if (params.status !== undefined && params.status !== "all") {
      searchParams.append("status", params.status);
    }
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/admin/users?${queryString}` : "/admin/users";

    return apiRequest(endpoint, {
      method: "GET",
    });
  },

  /**
   * Fetch full details for a specific user by ID
   * @param {number|string} id
   */
  async getUserById(id) {
    return apiRequest(`/admin/users/${id}`, {
      method: "GET",
    });
  },

  /**
   * Activate or deactivate a user
   * @param {number|string} id
   * @param {{ status: boolean }} payload
   */
  async updateUserStatus(id, payload) {
    return apiRequest(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update a user's role
   * @param {number|string} id
   * @param {{ role: string }} payload
   */
  async updateUserRole(id, payload) {
    return apiRequest(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

