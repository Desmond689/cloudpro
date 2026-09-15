-- 0002_rls.sql
-- Locks every table down, then opens narrow, specific holes.
-- Rule of thumb used throughout: the browser (anon key) can only ever
-- READ public catalog/content data. Every write that matters (orders,
-- stock changes, payment status) happens in a Server Action / Route
-- Handler using the service role key, which bypasses RLS entirely and
-- re-validates price/stock server-side — never trusting the client.

alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table reviews enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table blog_posts enable row level security;
alter table admin_users enable row level security;
alter table newsletter_subscribers enable row level security;
alter table store_settings enable row level security;

-- Helper: is the current auth.uid() a tagged admin?
create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$ language sql stable security definer;

-- ===== categories: public read, admin write =====
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all using (is_admin()) with check (is_admin());

-- ===== products: public read of published only, admin sees/edits all =====
create policy "products_public_read" on products for select using (is_published = true);
create policy "products_admin_all" on products for all using (is_admin()) with check (is_admin());

-- ===== product_images: public read (joins to a published product), admin write =====
create policy "product_images_public_read" on product_images for select
  using (exists (select 1 from products p where p.id = product_id and p.is_published = true));
create policy "product_images_admin_write" on product_images for all using (is_admin()) with check (is_admin());

-- ===== customers: no direct public access — created only via service role in
-- the checkout Server Action. Admins can view (for order fulfillment). =====
create policy "customers_admin_read" on customers for select using (is_admin());

-- ===== orders / order_items: no public access at all. Created + read via
-- service role (checkout, order tracking, admin). Admins can also read
-- directly through the dashboard's authenticated session. =====
create policy "orders_admin_all" on orders for all using (is_admin()) with check (is_admin());
create policy "order_items_admin_all" on order_items for all using (is_admin()) with check (is_admin());

-- ===== reviews: public can submit (unapproved), public can read approved
-- only, admin can read/moderate everything =====
create policy "reviews_public_read_approved" on reviews for select using (is_approved = true);
create policy "reviews_public_insert" on reviews for insert with check (is_approved = false);
create policy "reviews_admin_all" on reviews for all using (is_admin()) with check (is_admin());

-- ===== conversations / messages: guest support chat has no real auth, so
-- the conversation's UUID itself acts as a bearer token (kept client-side,
-- never listed publicly). Anyone can create a conversation and post to it;
-- reading is restricted to admins. Realtime subscriptions for the customer
-- side are done through a Server Action-issued channel, not raw table
-- SELECT, to avoid needing a public read policy here. =====
create policy "conversations_public_insert" on conversations for insert with check (true);
create policy "conversations_admin_all" on conversations for all using (is_admin()) with check (is_admin());
create policy "messages_public_insert" on messages for insert with check (true);
create policy "messages_admin_all" on messages for all using (is_admin()) with check (is_admin());

-- ===== blog_posts: public read of published only, admin full access =====
create policy "blog_public_read" on blog_posts for select using (is_published = true);
create policy "blog_admin_all" on blog_posts for all using (is_admin()) with check (is_admin());

-- ===== admin_users: only admins can read the list; rows are inserted via
-- service role during the manual "make this user an admin" step. =====
create policy "admin_users_self_read" on admin_users for select using (is_admin());

-- ===== newsletter_subscribers: public can insert, nobody can read via
-- anon key (admin export happens via service role) =====
create policy "newsletter_public_insert" on newsletter_subscribers for insert with check (true);
create policy "newsletter_admin_read" on newsletter_subscribers for select using (is_admin());

-- ===== store_settings: public can read the customer-facing columns only,
-- via the view below (not the base table) so nothing extra ever leaks;
-- admin can read/write the base table directly. =====
create policy "store_settings_admin_all" on store_settings for all using (is_admin()) with check (is_admin());

create or replace view public_store_settings as
  select btc_address, btc_qr_url, social_instagram, social_tiktok, social_youtube,
         social_facebook, social_x, social_whatsapp, age_verification_enabled
  from store_settings;

grant select on public_store_settings to anon, authenticated;
