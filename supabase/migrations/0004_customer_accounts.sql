-- 0004_customer_accounts.sql
-- Phase 2: customer accounts (separate from admin), order history,
-- saved addresses, wishlist/favorites, and Telegram alert customization.
-- Run this after 0001-0003 have already been applied.

-- ========== ORDERS: link to an authenticated customer (nullable — ==========
-- ========== guest checkout still works exactly as before)        ==========
alter table orders add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_orders_auth_user on orders(auth_user_id);

-- ========== SAVED ADDRESSES ==========
create table if not exists customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  region text not null,
  postal_code text not null,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_addresses_user on customer_addresses(user_id);

-- ========== WISHLIST / FAVORITES ==========
create table if not exists wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_wishlist_user on wishlist_items(user_id);

-- ========== TELEGRAM ALERT CUSTOMIZATION (store owner) ==========
-- The bot token stays in an env var (secret) — these are non-secret
-- preferences the store owner can change from /admin/settings without
-- redeploying.
alter table store_settings
  add column if not exists telegram_chat_id_override text,
  add column if not exists telegram_notify_new_order boolean not null default true,
  add column if not exists telegram_notify_low_stock boolean not null default false,
  add column if not exists telegram_notify_new_message boolean not null default false,
  add column if not exists telegram_message_template text;

-- ========== RLS ==========
alter table customer_addresses enable row level security;
alter table wishlist_items enable row level security;

-- Customers can only ever see/edit their own addresses and wishlist —
-- never another customer's, and never an admin bypassing this table
-- (admins don't need to; support happens via the orders/messages tables).
create policy "addresses_owner_all" on customer_addresses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "wishlist_owner_all" on wishlist_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A logged-in customer can read (not write) their own past orders.
-- Writes still only ever happen server-side via the service role in
-- checkout/admin actions — this is read-only "my order history".
create policy "orders_owner_read" on orders for select using (auth.uid() = auth_user_id);
create policy "order_items_owner_read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_items.order_id and o.auth_user_id = auth.uid())
);
