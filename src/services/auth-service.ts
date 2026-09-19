// Auth API service: login, register, password reset, and avatar management.

import { del, post, put } from "./api";
import { API_ENDPOINTS } from "@/constants";

interface LoginPayload {
  username: string;
  password: string;
}

interface RegisterPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export const login = async (payload: LoginPayload): Promise<any> => {
  return post(API_ENDPOINTS.login, payload);
};

export const register = async (payload: RegisterPayload): Promise<void> => {
  await post(API_ENDPOINTS.register, payload);
};

export const forgotPassword = async (email: string): Promise<any> => {
  return post(API_ENDPOINTS.forgotPassword, { email });
};

export const verifyOtp = async (
  email: string,
  otp: string,
  token: string
): Promise<void> => {
  await post(API_ENDPOINTS.verifyOtp, { email, otp, token });
};

export const resetPassword = async (
  email: string,
  token: string,
  newPassword: string
): Promise<void> => {
  await post(API_ENDPOINTS.resetPassword, { email, token, newPassword });
};

export const updateProfileAvatar = async (
  file: File
): Promise<any> => {
  const formData = new FormData();
  formData.append("avatar", file);
  return put(API_ENDPOINTS.updateProfileAvatar, formData);
};

export const deleteProfileAvatar = async (): Promise<any> => {
  return del(API_ENDPOINTS.deleteProfileAvatar);
};
