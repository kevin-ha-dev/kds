import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let resumeRefreshBound = false;

const RESUME_REFRESH_WINDOW_MS = 60_000;

function bindResumeRefresh(client: SupabaseClient) {
  if (resumeRefreshBound || typeof window === "undefined") {
    return;
  }

  resumeRefreshBound = true;
  let lastRefreshAttempt = 0;
  let refreshing = false;

  const refreshIfStale = () => {
    if (document.visibilityState === "hidden" || refreshing) {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshAttempt < 2000) {
      return;
    }

    lastRefreshAttempt = now;
    refreshing = true;

    void (async () => {
      try {
        const {
          data: { session },
        } = await client.auth.getSession();
        if (!session?.expires_at) {
          return;
        }

        const expiresInMs = session.expires_at * 1000 - Date.now();
        if (expiresInMs > RESUME_REFRESH_WINDOW_MS) {
          return;
        }

        await client.auth.refreshSession();
      } catch {
        // Keep the stored session. A later resume can try again.
      } finally {
        refreshing = false;
      }
    })();
  };

  document.addEventListener("visibilitychange", refreshIfStale);
  window.addEventListener("pageshow", refreshIfStale);
  window.addEventListener("focus", refreshIfStale);
}

export function getBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { client: null, error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY." };
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        ...(typeof window !== "undefined" ? { storage: window.localStorage } : {}),
      },
    });
    bindResumeRefresh(browserClient);
  }

  return { client: browserClient, error: null };
}
