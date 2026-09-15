-- 0005_discount_price_and_realtime.sql
-- 1. Adds an optional "discount price" to products (used to show a
--    strikethrough original price + sale price on the storefront).
-- 2. Turns on Postgres logical replication for `messages` so that
--    Supabase Realtime (`postgres_changes`) actually fires on insert.
--    Without this, the admin chat's realtime subscription silently never
--    receives anything — which is why sent messages weren't showing up.

alter table products
  add column if not exists discount_price numeric(10,2);

alter table products
  add constraint discount_price_valid
  check (discount_price is null or (discount_price >= 0 and discount_price < price));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
