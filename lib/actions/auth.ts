"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

// Supabase Auth already rate-limits password grants on its own, but that
// protects Supabase's infrastructure, not this specific login form — an
// attacker could still hammer /admin/login with guesses all day. This adds
// a second, app-level limiter keyed to the email being attempted, so a
// single email can't be brute-forced past a handful of tries per window.
export async function signInAdmin(email: string, password: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return { ok: false as const, error: "Incorrect email or password." };
  }

  const rateLimit = await checkRateLimit(`admin_login:${trimmedEmail}`, 8, 15);
  if (!rateLimit.allowed) {
    return { ok: false as const, error: "Too many login attempts. Please wait a few minutes and try again." };
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
  if (error) return { ok: false as const, error: "Incorrect email or password." };

  return { ok: true as const };
}
