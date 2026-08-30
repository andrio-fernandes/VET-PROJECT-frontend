// =============================================
// SHARED AUTH TYPES
// Kept identical to the inline types in the auth
// pages - do not change shapes.
// =============================================

export interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}
