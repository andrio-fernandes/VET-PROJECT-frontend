// =============================================
// ADMIN PROFILE HOOK
//
// Reads the logged-in admin's email from storage and provides a shared
// logout routine. Reused by the admin/layout sidebar and blog pages.
// =============================================

import { useRouter } from "next/router";
import { useSyncExternalStore } from "react";
import Cookies from "js-cookie";

import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  ROUTE_PATHS,
  TOKEN_KEY,
  USER_KEY,
} from "@/utils/constant";

const emptySubscribe = () => () => {};

const readUserEmail = (): string => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? JSON.parse(raw) : null;
    return user?.email || "";
  } catch {
    return "";
  }
};

export const useAdminProfile = () => {
  const router = useRouter();

  const email = useSyncExternalStore(emptySubscribe, readUserEmail, () => "");

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    Cookies.remove(AUTH_TOKEN_KEY);
    router.replace(ROUTE_PATHS.login);
  };

  return { email, logout };
};
