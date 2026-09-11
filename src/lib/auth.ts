import type { User } from "@supabase/supabase-js";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export const UNAUTHORIZED_LOGIN_MESSAGE = "Invalid permission.";
export const UNAUTHORIZED_LOGIN_PATH = "/login?reason=unauthorized";

const UNAUTHORIZED_LOGIN_FLAG = "kds-unauthorized-login";

export function markUnauthorizedLogin() {
  try {
    sessionStorage.setItem(UNAUTHORIZED_LOGIN_FLAG, "1");
  } catch {
    // Ignore storage failures and rely on the login query string.
  }
}

export function hasUnauthorizedLogin(searchParams?: { get: (name: string) => string | null }) {
  let fromStorage = false;
  try {
    fromStorage = sessionStorage.getItem(UNAUTHORIZED_LOGIN_FLAG) === "1";
  } catch {
    fromStorage = false;
  }

  const params =
    searchParams ?? (typeof window === "undefined" ? null : new URLSearchParams(window.location.search));
  const fromQuery =
    params?.get("reason") === "unauthorized" || params?.get("error") === "unauthorized";

  return fromStorage || Boolean(fromQuery);
}

export function consumeUnauthorizedLogin(searchParams?: { get: (name: string) => string | null }) {
  const unauthorized = hasUnauthorizedLogin(searchParams);
  try {
    sessionStorage.removeItem(UNAUTHORIZED_LOGIN_FLAG);
  } catch {
    // Ignore storage failures.
  }
  return unauthorized;
}

export function redirectToLogin(unauthorized = false) {
  if (unauthorized) {
    markUnauthorizedLogin();
    window.location.replace(UNAUTHORIZED_LOGIN_PATH);
    return;
  }

  window.location.replace("/login");
}

export const STATION_USERNAME = "burgerbots";
export const STATION_EMAIL = "burgerbots@burgerbots.com";

export function resolveUsernameToEmail(username: string) {
  const trimmed = username.trim().toLowerCase();
  if (trimmed === STATION_USERNAME) {
    return STATION_EMAIL;
  }

  return null;
}

export type AuthorizedUser = {
  user: User;
  role: string;
};

export async function getAuthorizedUser(): Promise<AuthorizedUser | null> {
  const { client: supabase } = getBrowserSupabaseClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return null;
  }

  const { data: authorizedUser, error: authError } = await supabase
    .from("authorized_users")
    .select("id, email, role")
    .ilike("email", user.email)
    .maybeSingle();

  if (authError || !authorizedUser) {
    return null;
  }

  return {
    user,
    role: authorizedUser.role,
  };
}
