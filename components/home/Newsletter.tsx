"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    // Wired to a real newsletter_subscribers insert once Supabase is set up (Phase 2).
    setStatus("sent");
  }

  return (
    <section className="border-t border-line/60">
      <div className="container-px mx-auto max-w-7xl py-16 sm:py-20">
        <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center sm:px-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            Get restock alerts & offers
          </h2>
          <p className="max-w-sm text-sm text-mute">
            One or two emails a month. No spam, unsubscribe anytime.
          </p>

          {status === "sent" ? (
            <p className="mt-2 font-mono text-sm text-ok">You&apos;re on the list.</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-2 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full flex-1 rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink placeholder:text-faint focus:border-mist/50"
              />
              <button type="submit" className="btn-primary shrink-0">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
