"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

function GoogleIcon() {
  return (
    <svg aria-hidden className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { client, error: clientError } = getBrowserSupabaseClient();
    if (!client) {
      setError(clientError);
      setLoading(false);
      return;
    }

    if (mode === "login") {
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/orders");
      router.refresh();
      return;
    }

    const { error: signUpError } = await client.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/orders");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    const { client, error: clientError } = getBrowserSupabaseClient();
    if (!client) {
      setError(clientError);
      setGoogleLoading(false);
      return;
    }

    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/orders`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  }

  function toggleMode() {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setConfirmPassword("");
  }

  const title = mode === "login" ? "Sign in" : "Create account";
  const submitLabel = mode === "login" ? "Sign in" : "Create account";

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      <div className="w-full rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-zinc-900">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-zinc-900">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-zinc-400 transition-colors hover:text-zinc-900"
              >
                {showPassword ? (
                  <EyeOff aria-hidden className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <Eye aria-hidden className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-900">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-zinc-400 transition-colors hover:text-zinc-900"
                >
                  {showConfirmPassword ? (
                    <EyeOff aria-hidden className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Eye aria-hidden className="h-4 w-4" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="mt-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:brightness-95 disabled:opacity-50"
          >
            {loading ? "Please wait..." : submitLabel}
          </button>
        </form>

        {mode === "login" && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              <GoogleIcon />
              {googleLoading ? "Please wait..." : "Sign in with Google"}
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        {mode === "login" ? "Don't have an account?" : "Have an account?"}{" "}
        <button
          type="button"
          onClick={toggleMode}
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </button>
      </p>
    </div>
  );
}
