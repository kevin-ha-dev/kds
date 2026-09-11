import { Suspense } from "react";

import { AuthForm } from "@/components";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-zinc-900">
      <Suspense>
        <AuthForm />
      </Suspense>
    </main>
  );
}
