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
      await client.auth.signOut();
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
      const authorizedUser = await getAuthorizedUser();
      if (cancelled) {
        return;
      }

      if (authorizedUser) {
        accept();
        return;
      }

      const {
        data: { session },
      } = await client.auth.getSession();

      if (session) {
        await reject(true);
        return;
      }

      if (!allowMissingSession) {
        await reject();
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
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void verify(waitingForOAuth);
      }
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
