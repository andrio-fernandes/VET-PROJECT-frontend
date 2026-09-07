// =============================================
// PASSWORD RESET FLOW (sessionStorage helpers)
// =============================================
// Centralizes the sessionStorage bookkeeping shared by the forgot-password,
// OTP and reset-password pages so the flow keys are written/cleared in exactly
// one place.
//
// The resetFlowActive flag distinguishes "I am inside an active reset flow"
// from "this is a brand-new visit". Forgot Password only clears leftover state
// for a NEW visit; a browser Back from the OTP page keeps the flow intact.

import { STORAGE_KEYS } from "@/constants";

export const isResetFlowActive = (): boolean =>
  sessionStorage.getItem(STORAGE_KEYS.resetFlowActive) === "true";

export const markResetFlowActive = (): void => {
  sessionStorage.setItem(STORAGE_KEYS.resetFlowActive, "true");
};

// Wipes every artifact of a reset flow, including the active flag.
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