import { apiRequest } from "@/lib/api";

export const doctorsService = {
  /**
   * List public active doctors with filters and pagination
   */
  async getPublicDoctors(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.search) searchParams.append("search", params.search);
    if (params.specialization && params.specialization !== "all") {
      searchParams.append("specialization", params.specialization);
    }
    if (params.city && params.city !== "all") searchParams.append("city", params.city);
    if (params.pincode) searchParams.append("pincode", params.pincode);
    if (params.minExperience) searchParams.append("minExperience", params.minExperience);
    if (params.minFee) searchParams.append("minFee", params.minFee);
    if (params.maxFee) searchParams.append("maxFee", params.maxFee);
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/doctors?${queryString}` : "/doctors", {
      method: "GET",
    });
  },

  /**
   * Get unique medical specializations
   */
  async getSpecializations() {
    return apiRequest("/doctors/specializations", {
      method: "GET",
    });
  },

  /**
   * Get single doctor details by ID
   */
  async getDoctorById(id) {
    return apiRequest(`/doctors/${id}`, {
      method: "GET",
    });
  },

  /**
   * Get doctor's weekly availability schedule
   */
  async getDoctorAvailability(id) {
    return apiRequest(`/doctors/${id}/availability`, {
      method: "GET",
    });
  },

  // ADMIN METHODS
  async getAdminDoctors(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.search) searchParams.append("search", params.search);
    if (params.specialization) searchParams.append("specialization", params.specialization);
    if (params.status !== undefined && params.status !== "all") {
      searchParams.append("status", params.status);
    }
    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/admin/doctors?${queryString}` : "/admin/doctors", {
      method: "GET",
    });
  },

  async createDoctor(payload) {
    return apiRequest("/admin/doctors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateDoctor(id, payload) {
    return apiRequest(`/admin/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async updateDoctorStatus(id, status) {
    return apiRequest(`/admin/doctors/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async deleteDoctor(id) {
    return apiRequest(`/admin/doctors/${id}`, {
      method: "DELETE",
    });
  },

  async addAvailability(doctorId, payload) {
    return apiRequest(`/admin/doctors/${doctorId}/availability`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteAvailability(doctorId, availabilityId) {
    return apiRequest(`/admin/doctors/${doctorId}/availability/${availabilityId}`, {
      method: "DELETE",
    });
  },
};

