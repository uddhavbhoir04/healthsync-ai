import { apiRequest } from "@/lib/api";

export const packagesService = {
  /**
   * List public diagnostic packages
   */
  async getPublicPackages(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.search) searchParams.append("search", params.search);
    if (params.minPrice) searchParams.append("minPrice", params.minPrice);
    if (params.maxPrice) searchParams.append("maxPrice", params.maxPrice);
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/packages?${queryString}` : "/packages", {
      method: "GET",
    });
  },

  /**
   * Get single package details by ID with included tests
   */
  async getPackageById(id) {
    return apiRequest(`/packages/${id}`, {
      method: "GET",
    });
  },

  // ADMIN METHODS
  async getAdminPackages(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.search) searchParams.append("search", params.search);
    if (params.status !== undefined && params.status !== "all") {
      searchParams.append("status", params.status);
    }
    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/admin/packages?${queryString}` : "/admin/packages", {
      method: "GET",
    });
  },

  async createPackage(payload) {
    return apiRequest("/admin/packages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updatePackage(id, payload) {
    return apiRequest(`/admin/packages/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async updatePackageStatus(id, status) {
    return apiRequest(`/admin/packages/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async deletePackage(id) {
    return apiRequest(`/admin/packages/${id}`, {
      method: "DELETE",
    });
  },
};

