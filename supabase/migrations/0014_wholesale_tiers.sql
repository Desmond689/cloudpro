-- Bulk/wholesale price tiers stored per product, e.g.
-- [{"minQty": 10, "price": 19.99}, {"minQty": 50, "price": 16.99}]
-- Shown on the product page as "buy more, pay less" — separate from the
-- wholesale *inquiry* form, which is for reseller accounts wanting a
-- custom quote.

alter table products
  add column if not exists wholesale_tiers jsonb not null default '[]'::jsonb;
