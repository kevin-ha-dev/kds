import { Suspense } from "react";

import { AuthForm } from "@/components";

function LoginFallback() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      <div className="w-full rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">Sign in</h1>
        <p className="text-sm text-zinc-500">Please wait...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-zinc-900">
      <Suspense fallback={<LoginFallback />}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
