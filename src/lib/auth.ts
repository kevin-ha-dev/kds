import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";

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
  clearAuthorized();
  if (unauthorized) {
    markUnauthorizedLogin();
    window.location.replace(UNAUTHORIZED_LOGIN_PATH);
    return;
  }

  window.location.replace("/login");
}

const AUTHORIZED_FLAG = "kds-authorized";

export function markAuthorized() {
  try {
    localStorage.setItem(AUTHORIZED_FLAG, "1");
    sessionStorage.removeItem(AUTHORIZED_FLAG);
  } catch {
    // Ignore storage failures.
  }
}

export function clearAuthorized() {
  try {
    localStorage.removeItem(AUTHORIZED_FLAG);
    sessionStorage.removeItem(AUTHORIZED_FLAG);
  } catch {
    // Ignore storage failures.
  }
}

export function hasAuthorizedFlag() {
  try {
    if (localStorage.getItem(AUTHORIZED_FLAG) === "1") {
      return true;
    }

    if (sessionStorage.getItem(AUTHORIZED_FLAG) === "1") {
      localStorage.setItem(AUTHORIZED_FLAG, "1");
      sessionStorage.removeItem(AUTHORIZED_FLAG);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function isOAuthReturn() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.has("code") || window.location.hash.includes("access_token");
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

export type AuthorizationResult =
  | { status: "authorized"; user: User; role: string }
  | { status: "unauthenticated" }
  | { status: "unauthorized" }
  | { status: "error" };

function isSessionMissing(error: AuthError | null) {
  if (!error) {
    return false;
  }

  return error.name === "AuthSessionMissingError" || /session missing/i.test(error.message);
}

type UserLookup =
  | { status: "user"; user: User }
  | { status: "unauthenticated" }
  | { status: "error" };

async function lookupUser(supabase: SupabaseClient): Promise<UserLookup> {
  let userResult: Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>;
  try {
    userResult = await supabase.auth.getUser();
  } catch {
    return { status: "error" };
  }

  if (userResult.error || !userResult.data.user) {
    if (isSessionMissing(userResult.error)) {
      return { status: "unauthenticated" };
    }

    return { status: "error" };
  }

  return { status: "user", user: userResult.data.user };
}

async function authorizeUser(supabase: SupabaseClient, user: User): Promise<AuthorizationResult> {
  if (!user.email) {
    return { status: "unauthorized" };
  }

  const { data: authorizedUser, error: authError } = await supabase
    .from("authorized_users")
    .select("id, email, role")
    .ilike("email", user.email)
    .maybeSingle();

  if (authError) {
    return { status: "error" };
  }

  if (!authorizedUser) {
    return { status: "unauthorized" };
  }

  return {
    status: "authorized",
    user,
    role: authorizedUser.role,
  };
}

async function refreshStoredSession(
  supabase: SupabaseClient,
): Promise<Exclude<UserLookup, { status: "user" }> | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      return null;
    }
  } catch {
    return { status: "error" };
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { status: "unauthenticated" };
    }
  } catch {
    return { status: "error" };
  }

  return { status: "error" };
}

export async function getAuthorizedUser(): Promise<AuthorizationResult> {
  const { client: supabase } = getBrowserSupabaseClient();
  if (!supabase) {
    return { status: "error" };
  }

  let lookup = await lookupUser(supabase);
  if (lookup.status === "error") {
    const refreshed = await refreshStoredSession(supabase);
    if (refreshed) {
      return refreshed;
    }

    lookup = await lookupUser(supabase);
  }

  if (lookup.status !== "user") {
    return lookup;
  }

  return authorizeUser(supabase, lookup.user);
}
