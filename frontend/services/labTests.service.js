import { apiRequest } from "@/lib/api";

export const labTestsService = {
  /**
   * List public active lab tests with filters
   */
  async getPublicLabTests(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.search) searchParams.append("search", params.search);
    if (params.category && params.category !== "all") {
      searchParams.append("category", params.category);
    }
    if (params.fastingRequired !== undefined && params.fastingRequired !== "all") {
      searchParams.append("fastingRequired", params.fastingRequired);
    }
    if (params.minPrice) searchParams.append("minPrice", params.minPrice);
    if (params.maxPrice) searchParams.append("maxPrice", params.maxPrice);
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/lab-tests?${queryString}` : "/lab-tests", {
      method: "GET",
    });
  },

  /**
   * List unique test categories
   */
  async getCategories() {
    return apiRequest("/lab-tests/categories", {
      method: "GET",
    });
  },

  /**
   * Get single test details by ID
   */
  async getLabTestById(id) {
    return apiRequest(`/lab-tests/${id}`, {
      method: "GET",
    });
  },

  // ADMIN METHODS
  async getAdminLabTests(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.search) searchParams.append("search", params.search);
    if (params.category) searchParams.append("category", params.category);
    if (params.status !== undefined && params.status !== "all") {
      searchParams.append("status", params.status);
    }
    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/admin/lab-tests?${queryString}` : "/admin/lab-tests", {
      method: "GET",
    });
  },

  async createLabTest(payload) {
    return apiRequest("/admin/lab-tests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateLabTest(id, payload) {
    return apiRequest(`/admin/lab-tests/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async updateLabTestStatus(id, status) {
    return apiRequest(`/admin/lab-tests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async deleteLabTest(id) {
    return apiRequest(`/admin/lab-tests/${id}`, {
      method: "DELETE",
    });
  },
};

