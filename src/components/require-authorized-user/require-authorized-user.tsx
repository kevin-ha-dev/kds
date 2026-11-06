"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

import {
  clearAuthorized,
  getAuthorizedUser,
  hasAuthorizedFlag,
  markAuthorized,
  redirectToLogin,
} from "@/lib/auth";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type RequireAuthorizedUserProps = {
  children: ReactNode;
};

export function RequireAuthorizedUser({ children }: RequireAuthorizedUserProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useLayoutEffect(() => {
    if (hasAuthorizedFlag()) {
      setIsAuthorized(true);
    }
  }, []);

  useEffect(() => {
    const { client } = getBrowserSupabaseClient();
    if (!client) {
      redirectToLogin();
      return;
    }

    let cancelled = false;
    let settled = false;

    const reject = async (unauthorized = false) => {
      if (cancelled || settled) {
        return;
      }

      settled = true;
      clearAuthorized();
      if (unauthorized) {
        await client.auth.signOut();
      }
      redirectToLogin(unauthorized);
    };

    const accept = () => {
      if (cancelled || settled) {
        return;
      }

      settled = true;
      markAuthorized();
      setIsAuthorized(true);
    };

    const verify = async (allowMissingSession: boolean) => {
      if (cancelled || settled) {
        return;
      }

      const result = await getAuthorizedUser();
      if (cancelled || settled) {
        return;
      }

      if (result.status === "authorized") {
        accept();
        return;
      }

      if (result.status === "error") {
        if (hasAuthorizedFlag()) {
          setIsAuthorized(true);
        }
        return;
      }

      if (result.status === "unauthorized") {
        await reject(true);
        return;
      }

      if (!allowMissingSession) {
        await reject(false);
      }
    };

    const searchParams = new URLSearchParams(window.location.search);
    const oauthError = searchParams.get("error");
    const oauthErrorDescription = searchParams.get("error_description");
    if (oauthError || oauthErrorDescription) {
      const unauthorized =
        oauthError === "unauthorized" ||
        /not authorized/i.test(`${oauthError} ${oauthErrorDescription ?? ""}`);
      void reject(unauthorized);
      return;
    }

    const waitingForOAuth =
      searchParams.has("code") || window.location.hash.includes("access_token");

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        if (event === "SIGNED_OUT") {
          if (waitingForOAuth || settled) {
            return;
          }

          settled = true;
          clearAuthorized();
          redirectToLogin(false);
          return;
        }

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          void verify(waitingForOAuth);
        }
      }, 0);
    });

    const timeoutId = waitingForOAuth
      ? window.setTimeout(() => {
          void reject(true);
        }, 8000)
      : undefined;

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!isAuthorized) {
    return null;
  }

  return children;
}
