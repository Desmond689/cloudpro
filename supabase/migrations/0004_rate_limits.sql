-- 0004_rate_limits.sql
-- Generic rate-limiting table used by every public-facing write action
-- (checkout, contact/support chat, reviews, newsletter, order tracking,
-- admin login). Only ever touched via the service-role client — no RLS
-- policy grants the anon key any access at all, which is the point.

create table if not exists rate_limit_hits (
  id uuid primary key default gen_random_uuid(),
  rate_key text not null, -- e.g. "checkout:jane@example.com" or "admin_login:203.0.113.4"
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_hits_key_time on rate_limit_hits(rate_key, created_at);

alter table rate_limit_hits enable row level security;
-- Intentionally no policies — only the service-role client (which bypasses
-- RLS entirely) ever reads/writes this table.

-- Housekeeping: old hits are harmless but there's no automatic cleanup job
-- in this project, so trim anything older than a day whenever a new hit is
-- recorded for the same key (cheap, keeps the table from growing forever).

-- ========== CUSTOMER-ASSERTED PAYMENT PROOF ==========
-- There's no payment gateway wired up (gift card + BTC are both manual),
-- so there is no way to *cryptographically* verify payment before an order
-- exists. What we can do: require the customer to affirmatively state they
-- paid (and, for BTC, give a transaction reference) before the order is
-- even created, and keep the order clearly marked unpaid until an admin
-- verifies it by hand. This column records that customer-side attestation;
-- it is NOT proof of payment on its own.
alter table orders add column if not exists payment_confirmed_by_customer boolean not null default false;
