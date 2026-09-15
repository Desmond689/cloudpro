-- 0011_security_hardening.sql
-- Fixes flagged by `supabase get_advisors` (security) after 0001-0010.
--
-- Root cause of every finding below: this project's default privileges grant
-- new tables/views/functions ALL/EXECUTE to `anon` and `authenticated`
-- automatically on creation (standard Supabase behavior — RLS is expected to
-- be the real gate). Earlier migrations (0005, 0006) tried to lock two of
-- these down with `revoke all ... from public`, but `public` is the
-- pseudo-role for "everyone with no explicit grant" — it does NOT retract a
-- grant `anon`/`authenticated` already hold directly from the default
-- privilege rule. So `anon` silently kept full access to `customer_summary`
-- and EXECUTE on `get_auth_user_by_email` even though the migrations' intent
-- was clearly authenticated-admin-only. Both are additionally self-guarded
-- (is_admin() checks), so this was not an active data leak, but the grants
-- should match the intent exactly. Fixed here by revoking from `anon`
-- (and `public`, for belt-and-braces) explicitly, by name.

revoke all on customer_summary from anon;
revoke all on customer_summary from public;
grant select on customer_summary to authenticated;

revoke all on function get_auth_user_by_email(text) from anon;
revoke all on function get_auth_user_by_email(text) from public;
grant execute on function get_auth_user_by_email(text) to authenticated;

-- function_search_path_mutable: pin search_path on SECURITY DEFINER /
-- shared trigger functions so they can't be hijacked by a caller-controlled
-- search_path resolving `public.foo` to some other schema's `foo`.
alter function is_admin() set search_path = public;
alter function set_updated_at() set search_path = public;
