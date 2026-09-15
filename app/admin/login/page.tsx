"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SITE } from "@/lib/constants";

// useSearchParams() requires a Suspense boundary in the app router, or
// `next build` fails with "useSearchParams() should be wrapped in a
// suspense boundary".
export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get("redirectTo") || "/admin";
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-2">{SITE.name} admin</p>
          <h1 className="font-display text-2xl font-semibold">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs text-mute">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink focus:border-mist/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-mute">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink focus:border-mist/50"
            />
          </div>

          {error && <p className="text-sm text-bad">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-faint">
          Admin accounts are created in the Supabase dashboard — see SETUP.md.
        </p>
      </div>
    </div>
  );
}
