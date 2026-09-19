// Shared auth session hook. Centralizes session read/write/clear logic.

import { useSyncExternalStore } from "react";
import Cookies from "js-cookie";
import {
  AUTH_TOKEN_KEY,
  getTokenExpiry,
  REFRESH_TOKEN_KEY,
  TOKEN_KEY,
  USER_KEY,
} from "@/constants";
import { emptySubscribe } from "@/utils/input";

interface StoredUser {
  _id?: string;
  fullName?: string;
  username?: string;
  email?: string;
  role?: "admin" | "user" | string;
  avatar?: string;
  [key: string]: unknown;
}

interface StoreSessionPayload {
  token?: string;
  refreshToken?: string;
  user?: StoredUser | null;
}

let storedUserCache: StoredUser | null = undefined as unknown as StoredUser;

const normalizeUser = (user: StoredUser): StoredUser =>
  user.id && !user._id ? { ...user, _id: user.id as string } : user;

const readStoredUser = (): StoredUser | null => {
  if (storedUserCache === undefined) {
    try {
      const raw = localStorage.getItem(USER_KEY);
      const parsed: StoredUser | null = raw ? JSON.parse(raw) : null;
      storedUserCache = parsed ? normalizeUser(parsed) : null;
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
    const normalized = normalizeUser(user);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    // Keep cache in sync to avoid reading previous user.
    storedUserCache = normalized;
  }
};

const clearSession = (): void => {
  // Clear cache on logout to prevent stale user in components.
  storedUserCache = undefined as unknown as StoredUser;
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

const updateStoredUser = (patch: Partial<StoredUser>): void => {
  const current = readStoredUser();
  if (!current) return;
  const updated = { ...current, ...patch };
  const normalized = normalizeUser(updated);
  localStorage.setItem(USER_KEY, JSON.stringify(normalized));
  storedUserCache = normalized;
};

export {
  readStoredUser,
  storeSession,
  clearSession,
  useCurrentUser,
  updateStoredUser,
};
