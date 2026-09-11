import Cookies from "js-cookie";

import {
  API_ENDPOINTS,
  AUTH_TOKEN_KEY,
  getTokenExpiry,
  REFRESH_TOKEN_KEY,
  ROUTE_PATHS,
  TOKEN_KEY,
  USER_KEY,
} from "@/constants";

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
// Exported so route guards (with-admin-auth) can silently refresh an expired
// access token before deciding whether the user is still logged in.
export const refreshSession = async (): Promise<string | null> => {
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

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

// Builds an item-level endpoint for a resource collection, e.g.
//   itemEndpoint("/videos", "123") -> "/videos/123"
export const itemEndpoint = (collection: string, id: string): string =>
  `${collection}/${id}`;

// Pulls a resource off an API response, accepting both the direct shape
// (data.<key>) and the legacy envelope (data.data.<key>).
export const getNested = <T = any>(data: any, key: string): T | null =>
  data?.[key] ?? data?.data?.[key] ?? null;

// Serializes request bodies: FormData passes through untouched (so the
// browser keeps the multipart boundary), anything else becomes JSON.
const jsonify = (body?: unknown): BodyInit | undefined => {
  if (body === undefined || body === null) return undefined;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  return JSON.stringify(body);
};

export const get = (endpoint: string, options?: RequestInit) =>
  api(endpoint, options);

export const post = (endpoint: string, body?: unknown) =>
  api(endpoint, { method: "POST", body: jsonify(body) });

export const put = (endpoint: string, body?: unknown) =>
  api(endpoint, { method: "PUT", body: jsonify(body) });

export const del = (endpoint: string) => api(endpoint, { method: "DELETE" });

// Builds a query string from a parameter object, skipping keys that are
// undefined, empty, or the "All" placeholder used by the content filters.
export const buildQuery = (
  params: Record<string, string | number | undefined>
): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === "All") continue;
    query.set(key, String(value));
  }
  return query.toString();
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

  // FormData bodies (file uploads) must keep the browser-generated
  // multipart boundary, so the JSON content-type is skipped for them.
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
    ) as Error & { remaining?: number; code?: string };

    if (typeof data?.remaining === "number") {
      error.remaining = data.remaining;
    }

    if (typeof data?.code === "string") {
      error.code = data.code;
    }

    throw error;
  }

  return data;
};

// Progress-aware file upload. `fetch` has no upload progress events, so this
// uses XMLHttpRequest (which exposes xhr.upload.onprogress) for multipart
// uploads such as videos. Shares the same auth header, token-refresh single-
// flight, and error normalization as `api`, and reports upload percentage via
// `onProgress`. Also logs timing so we can tell transfer time apart from
// server-side processing time.
export const uploadWithProgress = (
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number, loaded: number, total: number) => void,
  onTransferComplete?: () => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

    const request = (authToken: string | null, alreadyRetried = false) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}${endpoint}`);

      if (authToken) {
        xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(
            Math.round((e.loaded / e.total) * 100),
            e.loaded,
            e.total
          );
        }
      };

      // Fires when the request body has been fully sent to the server.
      xhr.upload.onload = () => {
        if (onTransferComplete) {
          onTransferComplete();
        }
      };

      xhr.onload = () => {
        let data: any = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = null;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
          return;
        }

        if (
          xhr.status === 401 &&
          !alreadyRetried &&
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/auth")
        ) {
          refreshInFlight =
            refreshInFlight ||
            refreshSession().finally(() => {
              refreshInFlight = null;
            });

          refreshInFlight.then((newToken) => {
            if (newToken) {
              request(newToken, true);
            } else {
              handleUnauthorized();
              reject(new Error(data?.message || "Something went wrong"));
            }
          });
          return;
        }

        const error = new Error(
          data?.message || "Something went wrong"
        ) as Error & { remaining?: number; code?: string };
        if (typeof data?.remaining === "number") {
          error.remaining = data.remaining;
        }
        if (typeof data?.code === "string") {
          error.code = data.code;
        }
        reject(error);
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.onabort = () => reject(new Error("Upload aborted"));
      xhr.send(formData);
    };

    request(token);
  });
};
