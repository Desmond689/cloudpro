import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// Generic sliding-window rate limiter backed by the `rate_limit_hits` table.
// Call BEFORE doing the sensitive work (creating an order, sending a
// message, submitting a review, attempting a login, etc). If it returns
// `allowed: false`, stop and return the error straight to the user —
// never do the write anyway "just this once".
//
// `key` should already include the action name so different actions don't
// share a bucket, e.g. `checkout:jane@example.com`, `admin_login:1.2.3.4`.
export async function checkRateLimit(key: string, maxAttempts: number, windowMinutes: number) {
  const supabase = createServiceRoleClient();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("rate_limit_hits")
    .select("id", { count: "exact", head: true })
    .eq("rate_key", key)
    .gte("created_at", windowStart);

  // If the check itself fails, fail OPEN (allow the request) rather than
  // locking everyone out because of a transient DB hiccup — but still log it.
  if (error) {
    console.error("rate limit check failed:", error.message);
    return { allowed: true as const };
  }

  if ((count ?? 0) >= maxAttempts) {
    return { allowed: false as const, error: "Too many attempts. Please wait a few minutes and try again." };
  }

  await supabase.from("rate_limit_hits").insert({ rate_key: key });

  // Best-effort cleanup of old rows for this key — keeps the table small.
  // Not awaited-critical; ignore failures.
  supabase
    .from("rate_limit_hits")
    .delete()
    .eq("rate_key", key)
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .then(() => {});

  return { allowed: true as const };
}
