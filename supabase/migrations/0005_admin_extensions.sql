-- 0005_admin_extensions.sql
-- Adds: delivery/shipping zones, gift-card submission fields on orders,
-- a customers rollup view, and admin-only auth.users lookup (for
-- block/unblock). Run this after 0001-0004 have already been applied.

-- ========== DELIVERY / SHIPPING ZONES ==========
create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- e.g. "Douala metro", "Rest of Cameroon"
  fee numeric(10,2) not null default 0 check (fee >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_delivery_zones_updated_at before update on delivery_zones
  for each row execute function set_updated_at();

alter table orders add column if not exists delivery_zone_id uuid references delivery_zones(id) on delete set null;

alter table delivery_zones enable row level security;
-- Public (anon) needs to read active zones to price shipping at checkout.
create policy "delivery_zones_public_read_active" on delivery_zones for select using (is_active = true);
create policy "delivery_zones_admin_all" on delivery_zones for all using (is_admin()) with check (is_admin());

-- ========== GIFT CARD SUBMISSIONS (attached to the order) ==========
-- The image lives in a *private* bucket (giftcards) — codes/photos are
-- sensitive, so admins view them via a short-lived signed URL, never a
-- public one. gift_card_image_path stores the storage object path, not a URL.
alter table orders
  add column if not exists gift_card_code text,
  add column if not exists gift_card_amount numeric(10,2),
  add column if not exists gift_card_image_path text;

insert into storage.buckets (id, name, public)
values ('giftcards', 'giftcards', false)
on conflict (id) do nothing;

-- No public policies at all for this bucket — only the service-role key
-- (used in the checkout action and the admin signed-URL helper) can
-- read/write it, which already bypasses RLS. Admin-facing reads still go
-- through requireAdmin() in application code before a signed URL is ever
-- minted.

-- ========== CUSTOMERS ROLLUP (admin "Customers" list) ==========
-- `customers` has one row per checkout (guest or logged-in), so this view
-- groups by email to give a real customer identity: order count, lifetime
-- spend, and whether they also have a registered (auth.users) account.
-- Views execute with the owner's privileges, so referencing auth.users
-- here is fine even though callers can't query it directly — the
-- `where is_admin()` guard means non-admins simply get zero rows back.
create or replace view customer_summary as
with buyer_agg as (
  select
    lower(c.email) as email,
    (array_agg(c.full_name order by c.created_at desc))[1] as full_name,
    (array_agg(c.phone order by c.created_at desc))[1] as phone,
    count(distinct o.id) as total_orders,
    coalesce(sum(o.total), 0) as total_spent,
    min(o.created_at) as first_order_at,
    max(o.created_at) as last_order_at
  from customers c
  join orders o on o.customer_id = c.id
  where is_admin()
  group by lower(c.email)
)
select
  email,
  full_name,
  phone,
  total_orders,
  total_spent,
  first_order_at,
  last_order_at,
  exists(select 1 from auth.users u where lower(u.email) = buyer_agg.email) as is_registered
from buyer_agg;

grant select on customer_summary to authenticated;

-- Admin-only lookup used for block/unblock — never exposes auth.users
-- directly, only this narrow, admin-gated shape.
create or replace function get_auth_user_by_email(target_email text)
returns table(id uuid, email text, banned_until timestamptz) as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select u.id, u.email, u.banned_until from auth.users u
    where lower(u.email) = lower(target_email);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function get_auth_user_by_email(text) from public;
grant execute on function get_auth_user_by_email(text) to authenticated;
