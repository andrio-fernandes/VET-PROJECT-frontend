// =============================================
// SHARED FRONTEND CONSTANTS
// =============================================
// Central home for constants reused across pages, hooks, services and
// components.

import type { Rule } from "antd/es/form";

// Content module and category values (must mirror server-side enums)
export const CONTENT_MODULES = ["Sales"] as const;
export type ContentModule = (typeof CONTENT_MODULES)[number];

// Categories available per module (must mirror server-side enums).
export type ContentCategory = "Customer Order" | "Inquiry" | "Quotation";

// Categories available per module. Add a new entry here when a new module
// is introduced so its categories become selectable on the create forms.
export const MODULE_CATEGORIES: Record<ContentModule, readonly ContentCategory[]> = {
  Sales: ["Customer Order", "Inquiry", "Quotation"],
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
interface PasswordRule {
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

// antd Form rules derived from PASSWORD_RULES so the form validators reject a
// password as soon as it fails any strength requirement, with error messages
// that match the PasswordStrength labels exactly. Only the character-class
// rules belong here; length is already enforced by passwordRules and the
// register form's own min rule.
export const PASSWORD_VALIDATOR_RULES: Rule[] = PASSWORD_RULES.filter(
  (rule) => rule.label !== "At least 8 characters"
).map((rule) => ({
  validator: (_: unknown, value: string) =>
    !value || rule.test(value)
      ? Promise.resolve()
      : Promise.reject(new Error(rule.label)),
}));

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
  videoPreview: "/videos/preview",
  uploadBlog: "/blogs/create",
  blogs: "/blogs",
  blogPreview: "/blogs/preview",
  faqs: "/faqs",
  profile: "/profile",
  // Customer content library (read-only views of admin content)
  userVideos: "/user/videos",
  userVideoPreview: "/user/videos/preview",
  userBlogs: "/user/blogs",
  userBlogPreview: "/user/blogs/preview",
  userFaqs: "/user/faqs",
  // Customer content search
  search: "/search",
  // Admin feedback inbox
  feedback: "/dashboard/feedback",
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
  signVideoUpload: "/videos/sign",
  // Blog endpoints
  createBlog: "/blogs",
  getMyBlogs: "/blogs/mine",
  // Customer content library endpoints (protect only, GET-only server-side)
  libraryFaqs: "/library/faqs",
  libraryVideos: "/library/videos",
  libraryVideoById: (id: string) => `/library/videos/${id}`,
  libraryBlogs: "/library/blogs",
  libraryBlogById: (id: string) => `/library/blogs/${id}`,
  // View history / continue learning endpoints
  libraryViewed: (type: string, id: string) => `/library/viewed/${type}/${id}`,
  libraryContinue: "/library/continue",
  libraryProgress: (id: string) => `/library/videos/${id}/progress`,
  libraryLastSeen: (type: string) => `/library/last-seen/${type}`,
  // Profile endpoints
  updateProfileAvatar: "/auth/profile/avatar",
  deleteProfileAvatar: "/auth/profile/avatar",
  // Feedback endpoints
  feedback: "/feedback",
  feedbackCount: "/feedback/count",
  feedbackStatus: (id: string) => `/feedback/${id}/status`,
} as const;

// Session storage keys for password reset flow
export const STORAGE_KEYS = {
  resetEmail: "reset_email",
  resetToken: "reset_token",
  resetOtpVerified: "reset_otp_verified",
  resetOtpAttempts: "reset_otp_attempts",
  resetOtpVerifyAttempts: "reset_otp_verify_attempts",
  resetOtpWindowStart: "reset_otp_window_start",
  resetOtpSentAt: "reset_otp_sent_at",
  // Marks an in-progress reset flow so a page mount does not wipe state when
  // the user navigated back into the flow (vs. genuinely starting a new one).
  resetFlowActive: "reset_flow_active",
} as const;

// ---------------------------------------------------------------
// CONTENT PAGE CONSTANTS
// (Admin section: FAQs & Videos list/create pages)
// ---------------------------------------------------------------

// Default rows shown per page on the listing tables.
export const PAGE_SIZE = 10;

// Word limits applied to free text fields across the create forms.
export const TITLE_MIN_WORDS = 5;
export const TITLE_MAX_WORDS = 30;
export const DESCRIPTION_MIN_WORDS = 10;
export const DESCRIPTION_MAX_WORDS = 60;

// Video upload size limits (in bytes).
export const MAX_VIDEO_SIZE = 64 * 1024 * 1024;
export const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;

// Local storage key used to retain unsaved FAQ draft progress.
export const RETAINED_FAQ_STORAGE_KEY = "retained_faq_progress";
// Local storage key used to retain unsaved video draft progress.
export const RETAINED_VIDEO_STORAGE_KEY = "retained_video_progress";
// Session storage key used to hand a video to the preview page.
export const VIDEO_PREVIEW_STORAGE_KEY = "video_preview";
// Session storage key used to carry "just viewed" ids across the list →
// preview navigation so the transient Viewed badge survives the remount.
export const VIEWED_FLASH_STORAGE_KEY = "viewed_flash_ids";

// Count words in a string (mirror of the blog utils counter, kept local
// because the answer/question fields reuse the same rule).
export const countWords = (text: string | undefined = ""): number =>
  text.trim() ? text.trim().split(/\s+/).length : 0;
