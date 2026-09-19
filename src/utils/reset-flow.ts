// Password reset flow sessionStorage helpers.
// Centralizes sessionStorage bookkeeping for the forgot-password, OTP,
// and reset-password pages. The resetFlowActive flag distinguishes an active
// reset from a brand-new visit — Forgot Password only clears state on a new
// visit; browser Back from OTP keeps the flow intact.

import { STORAGE_KEYS } from "@/constants";

export const isResetFlowActive = (): boolean =>
  sessionStorage.getItem(STORAGE_KEYS.resetFlowActive) === "true";

export const markResetFlowActive = (): void => {
  sessionStorage.setItem(STORAGE_KEYS.resetFlowActive, "true");
};

// Wipes all reset flow artifacts including the active flag.
export const clearResetFlow = (): void => {
  sessionStorage.removeItem(STORAGE_KEYS.resetEmail);
  sessionStorage.removeItem(STORAGE_KEYS.resetToken);
  sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerified);
  sessionStorage.removeItem(STORAGE_KEYS.resetOtpAttempts);
  sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
  sessionStorage.removeItem(STORAGE_KEYS.resetOtpWindowStart);
  sessionStorage.removeItem(STORAGE_KEYS.resetOtpSentAt);
  sessionStorage.removeItem(STORAGE_KEYS.resetFlowActive);
};