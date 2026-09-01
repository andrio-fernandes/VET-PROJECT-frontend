// =============================================
// AUTH API SERVICE LAYER
//
// Centralizes every auth API call so pages never build
// endpoints themselves. The underlying `api` helper
// (src/services/api) handles auth headers, token
// refresh and error normalization. Payloads and
// response handling mirror the auth pages exactly.
// =============================================

import { api } from "./api";
import { API_ENDPOINTS } from "@/constants";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export const login = async (payload: LoginPayload): Promise<any> => {
  return api(API_ENDPOINTS.login, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const register = async (payload: RegisterPayload): Promise<void> => {
  await api(API_ENDPOINTS.register, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const forgotPassword = async (email: string): Promise<any> => {
  return api(API_ENDPOINTS.forgotPassword, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

export const verifyOtp = async (
  email: string,
  otp: string,
  token: string
): Promise<void> => {
  await api(API_ENDPOINTS.verifyOtp, {
    method: "POST",
    body: JSON.stringify({ email, otp, token }),
  });
};

export const resetPassword = async (
  email: string,
  token: string,
  newPassword: string
): Promise<void> => {
  await api(API_ENDPOINTS.resetPassword, {
    method: "POST",
    body: JSON.stringify({ email, token, newPassword }),
  });
};
