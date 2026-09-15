import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVICE ROLE client — bypasses Row Level Security entirely.
// The `server-only` import makes any accidental client-component import
// of this file fail the build instead of leaking the key to the browser.
//
// Use this ONLY inside Server Actions / Route Handlers for operations that
// legitimately need to ignore RLS: creating orders + customers during
// guest checkout, decrementing stock, sending Telegram alerts, admin
// mutations that aren't already covered by an admin RLS policy.
//
// Never import this from a Client Component. Never send its output
// (besides the specific fields you mean to return) back to the browser.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
