-- 0007_btc_screenshot.sql
-- Why: Bitcoin checkout let a customer place an order after just looking
-- at the BTC address, with nothing proving a payment was actually sent —
-- unlike gift cards, where a code + amount (and optionally a photo) is
-- required before the order can be created. This closes that gap by
-- requiring a payment screenshot for BTC orders too.
--
-- The screenshot lives in a *private* bucket (btc-payments), mirroring
-- the giftcards bucket from 0005: admins view it via a short-lived signed
-- URL, never a public one. btc_screenshot_path stores the storage object
-- path, not a URL.

alter table orders
  add column if not exists btc_screenshot_path text;

insert into storage.buckets (id, name, public)
values ('btc-payments', 'btc-payments', false)
on conflict (id) do nothing;

-- No public policies for this bucket — only the service-role key (used in
-- the checkout action and the admin signed-URL helper) can read/write it,
-- which already bypasses RLS. Admin-facing reads still go through
-- requireAdmin() in application code before a signed URL is ever minted.
