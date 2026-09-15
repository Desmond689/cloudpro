"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function subscribeToNewsletter(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@") || trimmed.length > 200) {
    return { ok: false as const, error: "Please enter a valid email." };
  }

  const rateLimit = await checkRateLimit(`newsletter:${trimmed}`, 3, 60);
  if (!rateLimit.allowed) return { ok: false as const, error: rateLimit.error };

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({ email: trimmed });

  // Unique violation just means they're already subscribed — treat that as
  // success rather than showing an error for something that isn't one.
  if (error && error.code !== "23505") {
    console.error("newsletter subscribe error:", error.message);
    return { ok: false as const, error: "Something went wrong. Please try again." };
  }

  return { ok: true as const };
}
