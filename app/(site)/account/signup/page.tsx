"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signUpCustomer } from "@/lib/actions/account";
import { SITE } from "@/lib/constants";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Account is created fully confirmed, server-side — no email link,
    // no waiting. Immediately sign in to start the session.
    const result = await signUpCustomer(fullName, email, password);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      // Extremely unlikely right after creation, but handle it gracefully
      // rather than leaving the person stuck.
      setError("Account created — please sign in.");
      router.push("/account/login");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <div className="container-px mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center py-14">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-2">{SITE.name}</p>
          <h1 className="font-display text-2xl font-semibold">Create your account</h1>
          <p className="mt-2 text-sm text-mute">
            Track orders, save addresses, and build a wishlist.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs text-mute">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-mute">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-mute">Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
            />
          </div>

          {error && <p className="text-sm text-bad">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-faint">
          Already have an account?{" "}
          <Link href="/account/login" className="text-mist">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
