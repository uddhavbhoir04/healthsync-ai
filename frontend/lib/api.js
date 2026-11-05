/**
 * HealthSync AI - Secure API Client
 * - Stores access token in-memory only (never in localStorage or sessionStorage)
 * - Automatic token refresh with request queuing (single inflight refresh promise)
 * - Retries failed 401 requests exactly once
 * - Relies on HttpOnly refreshToken cookie via Next.js proxy rewrites
 */

let inMemoryAccessToken = null;
let refreshPromise = null;
let onAuthFailureCallback = null;

export function setAccessToken(token) {
  inMemoryAccessToken = token;
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
}

export function setOnAuthFailure(callback) {
  onAuthFailureCallback = callback;
}

/**
 * Attempt to refresh the session using the HttpOnly cookie
 */
export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        clearAccessToken();
        if (onAuthFailureCallback) {
          onAuthFailureCallback();
        }
        return null;
      }

      const data = await response.json();
      if (data?.accessToken) {
        setAccessToken(data.accessToken);
        return data;
      }

      clearAccessToken();
      return null;
    } catch {
      clearAccessToken();
      if (onAuthFailureCallback) {
        onAuthFailureCallback();
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Universal API Request Helper
 * Automatically injects Bearer token if present
 * Handles 401 with automatic token refresh and single retry
 */
export async function apiRequest(endpoint, options = {}, isRetry = false) {
  const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const fullUrl = url.startsWith("/api") ? url : `/api${url}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const currentToken = getAccessToken();
  if (currentToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  try {
    const response = await fetch(fullUrl, {
      cache: "no-store",
      ...options,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...headers,
      },
      credentials: "include",
    });

    const isAuthRoute =
      fullUrl.includes("/auth/login") ||
      fullUrl.includes("/auth/refresh") ||
      fullUrl.includes("/auth/register");

    // If 401 Unauthorized and not already retrying, try to refresh token (only for protected resource calls)
    if (response.status === 401 && !isRetry && !isAuthRoute) {
      const refreshData = await refreshAccessToken();
      if (refreshData?.accessToken) {
        // Retry original request once with new token
        return apiRequest(endpoint, options, true);
      }
    }

    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      data = { message: text };
    }

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        (data?.errors ? JSON.stringify(data.errors) : `Request failed with status ${response.status}`);
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}
