import { createBrowserClient } from "@supabase/ssr";

// Uses the anon key only — this file is safe to import from Client
// Components. RLS (see supabase/migrations/0002_rls.sql) is what actually
// restricts what this client can read/write, not this file.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
