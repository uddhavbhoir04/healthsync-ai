import { apiRequest } from "@/lib/api";

export const searchService = {
  /**
   * Global multi-entity healthcare search
   * @param {{ q?: string, type?: 'ALL'|'DOCTOR'|'LAB_TEST'|'PACKAGE', city?: string, pincode?: string, limit?: number, page?: number }} params
   */
  async globalSearch(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append("q", params.q);
    if (params.type) searchParams.append("type", params.type);
    if (params.city) searchParams.append("city", params.city);
    if (params.pincode) searchParams.append("pincode", params.pincode);
    if (params.limit) searchParams.append("limit", params.limit);
    if (params.page) searchParams.append("page", params.page);

    const queryString = searchParams.toString();
    return apiRequest(queryString ? `/search?${queryString}` : "/search", {
      method: "GET",
    });
  },
};

