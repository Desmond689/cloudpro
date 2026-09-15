-- 0001_core_schema.sql
-- Cloudra — core e-commerce schema
-- Run in Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ========== CATEGORIES ==========
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== PRODUCTS ==========
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  brand text,
  category_id uuid references categories(id) on delete set null,
  specifications jsonb not null default '{}'::jsonb,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5,
  rating numeric(2,1) not null default 0,
  review_count integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_published on products(is_published);
create index if not exists idx_products_slug on products(slug);
-- full text search over name/description/brand
create index if not exists idx_products_search on products
  using gin (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(brand,'')));

-- ========== PRODUCT IMAGES ==========
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  alt_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product on product_images(product_id);

-- ========== CUSTOMERS (guest checkout — no auth account required) ==========
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  city text not null,
  region text not null,
  postal_code text not null,
  country text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_email on customers(email);

-- ========== ORDERS ==========
create type order_status as enum (
  'pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled'
);

create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type payment_method as enum ('giftcard', 'btc');

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique, -- short human-readable id, e.g. CLD-84213
  customer_id uuid not null references customers(id) on delete restrict,
  subtotal numeric(10,2) not null,
  shipping_cost numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  payment_reference text, -- gift card code (hashed/last4) or BTC tx id, set by admin
  order_status order_status not null default 'pending',
  shipping_snapshot jsonb not null, -- copy of address at time of order
  telegram_notified boolean not null default false,
  telegram_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_status on orders(order_status);
create index if not exists idx_orders_number on orders(order_number);

-- ========== ORDER ITEMS ==========
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,   -- snapshot — survives product edits/deletes
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  subtotal numeric(10,2) not null
);

create index if not exists idx_order_items_order on order_items(order_id);

-- ========== REVIEWS ==========
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null default '',
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_product on reviews(product_id);
create index if not exists idx_reviews_approved on reviews(is_approved);

-- ========== CONVERSATIONS + MESSAGES (realtime chat) ==========
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_email text,
  status text not null default 'open', -- open | resolved
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer','admin')),
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on messages(conversation_id);

-- ========== BLOG ==========
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  featured_image text,
  content text not null default '',
  author text not null default 'Cloudra',
  is_published boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== ADMIN USERS ==========
-- Auth itself is handled by Supabase Auth; this table just tags which
-- auth.users rows are allowed into /admin.
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- ========== NEWSLETTER ==========
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ========== STORE SETTINGS (singleton row, admin-editable) ==========
-- Powers: BTC address + QR image, social links, so nothing is hardcoded.
create table if not exists store_settings (
  id boolean primary key default true constraint single_row check (id = true),
  btc_address text,
  btc_qr_url text,
  social_instagram text,
  social_tiktok text,
  social_youtube text,
  social_facebook text,
  social_x text,
  social_whatsapp text,
  age_verification_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into store_settings (id) values (true) on conflict do nothing;

-- updated_at trigger helper, reused by several tables
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();
create trigger trg_categories_updated_at before update on categories
  for each row execute function set_updated_at();
create trigger trg_blog_posts_updated_at before update on blog_posts
  for each row execute function set_updated_at();
create trigger trg_conversations_updated_at before update on conversations
  for each row execute function set_updated_at();
create trigger trg_store_settings_updated_at before update on store_settings
  for each row execute function set_updated_at();
