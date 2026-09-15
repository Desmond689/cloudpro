# Cloudra

A mobile-first vape store — Next.js App Router, TypeScript, Tailwind,
Supabase (Postgres + Storage + Realtime + Auth).

**Start here → `SETUP.md`** for creating your Supabase project, running
migrations, and creating your admin login. Nothing works until you do that.

## What's built

**Storefront**
- Home, shop with filters/sort, search, product detail + gallery + reviews
- Cart (localStorage-persisted) + Buy Now, guest checkout
- Server-validated pricing/stock — the browser's cart data is never trusted
- Order confirmation + order tracking (order number + email required)
- Blog, static pages (About/Contact/FAQ/Privacy/Terms/Refund)
- Floating support chat widget (polls for admin replies)
- Age verification gate (21+ default, admin can enable/disable)
- `sitemap.xml` / `robots.txt`

**Admin (`/admin`, Supabase Auth email+password)**
- Overview: order/revenue/stock stats
- Products: create/edit/delete, mobile photo upload (camera or gallery,
  no URL imports), categories
- Orders: status + payment status, resend Telegram alert
- Reviews: approve/delete, auto-recomputes product rating
- Messages: real-time conversation view (Supabase Realtime), reply, resolve
- Blog: create/edit/publish, featured image upload
- Settings: BTC address, BTC QR upload, social links, age-gate toggle

**Security**
- Row Level Security on every table (`supabase/migrations/0002_rls.sql`) —
  the anon key can only read public content plus two narrow inserts
  (reviews, newsletter). Orders, customers, and messages have no anon
  access at all.
- Service-role key never touches the browser (`server-only` import guard
  in `lib/supabase/admin.ts`)
- `/admin` gated by middleware checking both auth + `admin_users`
  membership, re-checked in every server action (`requireAdmin()`)
- Storage buckets: public read, admin-only write

## Not built yet

- Phase 13–15 from the original spec: a dedicated security pass beyond
  what's described above, systematic mobile QA across real devices, and
  production deployment itself (see `SETUP.md` §7 for the Vercel steps —
  actually pushing it live is on you)
- Customer accounts / order history (checkout is guest-only, by design)
- Automated gift-card redemption (orders sit "pending" until you manually
  mark them paid — see `SETUP.md` §6)
- Push notifications (architecture allows for it, not implemented)

## Local dev

```bash
npm install
npm run dev
```

## Project layout

```
app/(site)/      storefront pages — has header/footer/chat/age-gate
app/admin/        admin login (no chrome) + app/admin/(dashboard)/ (sidebar)
lib/actions/      server actions — checkout, admin CRUD, messages, blog
lib/supabase/     client.ts (browser), server.ts (RLS-respecting), admin.ts (service role)
supabase/migrations/  run these three, in order, in the Supabase SQL editor
```
