// =============================================
// COMMON CONSTANTS USED ACROSS THE FRONTEND
// =============================================

// Commonly used weak passwords to reject during registration / reset
export const COMMON_PASSWORDS: string[] = [
  "password",
  "12345678",
  "password123",
];

// OTP verification
export const DEMO_OTP = "123456";
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
export const AUTH_TOKEN_KEY = "auth_token";
export const USER_KEY = "user";

// Derive the cookie expiry from the JWT "exp" claim so the session cookie
// never outlives the token (avoids a "logged in but dead session" state).
export const getTokenExpiry = (token: string): Date => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (payload?.exp) {
      return new Date(payload.exp * 1000);
    }
  } catch {
    // Malformed token - fall through to the default expiry.
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
};

// User roles
export const DEFAULT_USER_ROLE = "USER";

// Route paths
export const ROUTE_PATHS = {
  home: "/",
  login: "/auth/login",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",
  otp: "/auth/otp",
  resetPassword: "/auth/reset-password",
  userDashboard: "/user-dashboard",
  dashboardEnquiry: "/user-dashboard",
} as const;

// Auth API endpoints
export const API_ENDPOINTS = {
  register: "/auth/register",
  login: "/auth/login",
  forgotPassword: "/auth/forgot-password",
  verifyOtp: "/auth/verify-otp",
  resetPassword: "/auth/reset-password",
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
