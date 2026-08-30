// =============================================
// SHARED AUTH SESSION HOOK
//
// Centralizes the session read / write / clear logic
// that used to be duplicated across pages. All
// behavior is identical to what each page did before:
// - localStorage for the raw API token, the refresh
//   token and the serialized user object
// - a cookie for the auth token so server middleware
//   can read it
// - a module-level cache so `readStoredUser` returns
//   a stable reference (avoids infinite re-renders
//   via useSyncExternalStore)
// =============================================

import { useSyncExternalStore } from "react";
import Cookies from "js-cookie";
import {
  AUTH_TOKEN_KEY,
  getTokenExpiry,
  REFRESH_TOKEN_KEY,
  TOKEN_KEY,
  USER_KEY,
} from "@/utils/constant";

export interface StoredUser {
  _id?: string;
  fullName?: string;
  username?: string;
  email?: string;
  role?: "admin" | "user" | string;
  [key: string]: unknown;
}

interface StoreSessionPayload {
  token?: string;
  refreshToken?: string;
  user?: StoredUser | null;
}

const emptySubscribe = () => () => {};

let storedUserCache: StoredUser | null = undefined as unknown as StoredUser;

const readStoredUser = (): StoredUser | null => {
  if (storedUserCache === undefined) {
    try {
      const raw = localStorage.getItem(USER_KEY);
      storedUserCache = raw ? JSON.parse(raw) : null;
    } catch {
      storedUserCache = null;
    }
  }
  return storedUserCache ?? null;
};

const storeSession = ({
  token,
  refreshToken,
  user,
}: StoreSessionPayload): void => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    Cookies.set(AUTH_TOKEN_KEY, token, { expires: getTokenExpiry(token) });
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

const clearSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  Cookies.remove(AUTH_TOKEN_KEY);
};

const useCurrentUser = (): StoredUser | null => {
  return useSyncExternalStore(
    emptySubscribe,
    () => readStoredUser() ?? null,
    () => null
  );
};

export {
  readStoredUser,
  storeSession,
  clearSession,
  useCurrentUser,
  emptySubscribe,
};
