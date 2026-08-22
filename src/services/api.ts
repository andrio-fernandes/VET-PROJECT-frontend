import Cookies from "js-cookie";

import {
  API_ENDPOINTS,
  AUTH_TOKEN_KEY,
  getTokenExpiry,
  REFRESH_TOKEN_KEY,
  ROUTE_PATHS,
  TOKEN_KEY,
  USER_KEY,
} from "@/utils/constant";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// A dead session (no refresh possible) clears every stored credential so
// stale tokens can't keep "passing" the presence-only auth gates, then
// sends the user back to login.
const handleUnauthorized = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  Cookies.remove(AUTH_TOKEN_KEY);

  if (!window.location.pathname.startsWith("/auth")) {
    window.location.replace(ROUTE_PATHS.login);
  }
};

// Exchange the refresh token for a new access + refresh pair.
// Returns the new access token, or null when a re-login is required.
const refreshSession = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}${API_ENDPOINTS.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json().catch(() => null);
    const token = data?.data?.token;
    if (!response.ok || !token) return null;

    const nextRefreshToken = data?.data?.refreshToken;
    localStorage.setItem(TOKEN_KEY, token);
    if (nextRefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
    }
    Cookies.set(AUTH_TOKEN_KEY, token, { expires: getTokenExpiry(token) });

    return token as string;
  } catch {
    return null;
  }
};

// Single-flight: parallel requests that all hit a 401 share one refresh call.
let refreshInFlight: Promise<string | null> | null = null;

export const api = async (
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<any> => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    // Access token expired: try to refresh once and replay the request.
    // Auth endpoints are excluded - their 401s are credential errors
    // (e.g. wrong password), not session errors.
    if (
      response.status === 401 &&
      !isRetry &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/auth") &&
      !endpoint.startsWith("/auth/")
    ) {
      refreshInFlight =
        refreshInFlight ||
        refreshSession().finally(() => {
          refreshInFlight = null;
        });

      const newToken = await refreshInFlight;
      if (newToken) {
        return api(endpoint, options, true);
      }

      handleUnauthorized();
    }

    const error = new Error(
      data?.message || "Something went wrong"
    ) as Error & { remaining?: number };

    if (typeof data?.remaining === "number") {
      error.remaining = data.remaining;
    }

    throw error;
  }

  return data;
};
