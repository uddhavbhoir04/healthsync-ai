import { apiRequest, setAccessToken, clearAccessToken } from "@/lib/api";

export const authService = {
  /**
   * Register a new user
   * @param {{ name: string, email: string, password: string }} data
   */
  async register({ name, email, password }) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  /**
   * Login user with email and password
   * Returns accessToken and user, server sets httpOnly refreshToken cookie
   * @param {{ email: string, password: string }} credentials
   */
  async login({ email, password }) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }

    return data;
  },

  /**
   * Refresh session using the HttpOnly cookie
   */
  async refresh() {
    const data = await apiRequest("/auth/refresh", {
      method: "POST",
    });

    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }

    return data;
  },

  /**
   * Logout user, revoking server session and clearing cookies
   */
  async logout() {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });
    } finally {
      clearAccessToken();
    }
  },

  /**
   * Fetch current authenticated user's profile
   */
  async getMe() {
    return apiRequest("/auth/me", {
      method: "GET",
    });
  },
};

