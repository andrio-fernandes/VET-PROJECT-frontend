// =============================================
// COMMON CONSTANTS USED ACROSS THE FRONTEND
// =============================================

// Content module and category values (must mirror server-side enums)
export const CONTENT_MODULES = ["Sales"] as const;
export type ContentModule = (typeof CONTENT_MODULES)[number];

export const CONTENT_CATEGORIES = [
  "Customer Order",
  "Enquiry",
  "Quotation",
] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

// Categories available per module. Add a new entry here when a new module
// is introduced so its categories become selectable on the create forms.
export const MODULE_CATEGORIES: Record<ContentModule, readonly ContentCategory[]> = {
  Sales: ["Customer Order", "Enquiry", "Quotation"],
};

// Commonly used weak passwords to reject during registration / reset
export const COMMON_PASSWORDS: string[] = [
  "password",
  "12345678",
  "password123",
];

// OTP verification
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 5 * 60;
export const MAX_OTP_ATTEMPTS = 5;
// Rolling window for OTP send requests (mirrors the server's request limit)
export const OTP_REQUEST_WINDOW_SECONDS = 15 * 60;

// Password strength rules
export interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  {
    label: "At least 1 uppercase letter (A-Z)",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    label: "At least 1 lowercase letter (a-z)",
    test: (value) => /[a-z]/.test(value),
  },
  { label: "At least 1 number (0-9)", test: (value) => /[0-9]/.test(value) },
  {
    label: "At least 1 special symbol (!@#$%^&*)",
    test: (value) => /[^A-Za-z0-9\s]/.test(value),
  },
];

// Storage / cookie keys
export const TOKEN_KEY = "token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const AUTH_TOKEN_KEY = "auth_token";
export const USER_KEY = "user";

const decodeJwtPayload = (
  token: string
): Record<string, unknown> | null => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

// Derive the cookie expiry from the JWT "exp" claim so the session cookie
// never outlives the token (avoids a "logged in but dead session" state).
export const getTokenExpiry = (token: string): Date => {
  const payload = decodeJwtPayload(token);
  if (typeof payload?.exp === "number") {
    return new Date(payload.exp * 1000);
  }
  // Malformed token - fall through to the default expiry.
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
};

// A token counts as expired when its "exp" claim has passed, or when it is
// too malformed to carry an "exp" at all (e.g. leftover "undefined" strings).
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }
  return payload.exp * 1000 <= Date.now();
};

// Route paths
export const ROUTE_PATHS = {
  home: "/",
  login: "/auth/login",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",
  otp: "/auth/otp",
  resetPassword: "/auth/reset-password",
  adminDashboard: "/dashboard/admin-dashboard",
  userDashboard: "/dashboard/user-dashboard",
  videos: "/videos",
  createVideo: "/videos/create",
} as const;

// Auth API endpoints
export const API_ENDPOINTS = {
  register: "/auth/register",
  login: "/auth/login",
  refresh: "/auth/refresh",
  forgotPassword: "/auth/forgot-password",
  verifyOtp: "/auth/verify-otp",
  resetPassword: "/auth/reset-password",
  createFaq: "/faqs",
  getMyFaqs: "/faqs/mine",
  dashboardStats: "/dashboard/stats",
  // Video endpoints
  createVideo: "/videos",
  getVideos: "/videos",
  getVideo: (id: string) => `/videos/${id}`,
  updateVideo: (id: string) => `/videos/${id}`,
  deleteVideo: (id: string) => `/videos/${id}`,
} as const;

// Session storage keys for password reset flow
export const STORAGE_KEYS = {
  resetEmail: "reset_email",
  resetOtp: "reset_otp",
  resetOtpAttempts: "reset_otp_attempts",
  resetOtpVerifyAttempts: "reset_otp_verify_attempts",
  resetOtpWindowStart: "reset_otp_window_start",
  resetOtpSentAt: "reset_otp_sent_at",
} as const;
