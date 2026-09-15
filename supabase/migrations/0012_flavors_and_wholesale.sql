-- Flavor/variant selection on products, a flavor snapshot on order items,
-- and a wholesale inquiry inbox (separate from the general contact/messages
-- flow so bulk buyers get their own admin queue).

alter table products
  add column if not exists flavors text[] not null default '{}';

alter table order_items
  add column if not exists flavor text;

create table if not exists wholesale_inquiries (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  products_interested text not null,
  estimated_monthly_volume text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table wholesale_inquiries enable row level security;

-- Public can only insert — never read back other people's inquiries.
create policy "wholesale_inquiries_public_insert"
  on wholesale_inquiries for insert
  with check (true);

-- Admins (same is_admin() helper used by every other admin policy) can
-- read/manage everything.
create policy "wholesale_inquiries_admin_all"
  on wholesale_inquiries for all
  using (is_admin())
  with check (is_admin());

create index if not exists wholesale_inquiries_status_idx on wholesale_inquiries (status, created_at desc);
