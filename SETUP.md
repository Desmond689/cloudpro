# Cloudra — Setup Guide

Follow this once, in order, to get from "zip file" to a running store
connected to your own database.

## 1. Create the Supabase project

1. Go to https://supabase.com, sign up / sign in, click **New project**.
2. Pick a name (e.g. "cloudra"), a strong database password (save it
   somewhere — you likely won't need it again, but don't lose it), and a
   region close to your customers.
3. Wait ~2 minutes for it to provision.

## 2. Run the migrations

In the Supabase dashboard: **SQL Editor → New query**. Run these three
files from `supabase/migrations/`, **in this exact order**, each as its
own query:

1. `0001_core_schema.sql` — tables, enums, indexes
2. `0002_rls.sql` — Row Level Security policies (locks the database down)
3. `0003_storage.sql` — storage buckets for product photos, the BTC QR
   code, and blog images
4. `0004_customer_accounts.sql` — customer login, saved addresses, wishlist
5. `0005_admin_extensions.sql` — delivery/shipping zones, gift-card photo
   submissions (private storage bucket), the Customers admin section, and
   account block/unblock

If a query errors, stop and re-check you ran the previous one fully first —
they depend on each other.

## 3. Get your API keys

**Project Settings → API**. You need three values:

| Value | Where | Goes in |
|---|---|---|
| Project URL | "Project URL" | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | "Project API keys" | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | "Project API keys" (click reveal) | `SUPABASE_SERVICE_ROLE_KEY` |

The service role key bypasses every security rule in the database — it's
only ever used server-side (see `lib/supabase/admin.ts`). Never put it in
`NEXT_PUBLIC_*`, never commit it, never paste it into a chat.

Copy `.env.example` to `.env.local` and fill in these three, plus
`NEXT_PUBLIC_SITE_URL` (use `http://localhost:3000` for now).

## 4. Create your admin login

Supabase Auth needs a real user account before you can sign in to `/admin`.

1. **Authentication → Users → Add user** (top right) → **Create new user**.
   Enter your email + a password. Skip "auto confirm" toggle — turn it ON
   so you don't need to click an email link.
2. Copy the new user's **UID** (shown in the users table).
3. Back in **SQL Editor**, run (replace both placeholders):

   ```sql
   insert into admin_users (id, full_name)
   values ('paste-the-uid-here', 'Your Name');
   ```

4. That's it — that account can now sign in at `/admin/login`. Add more
   admins later by repeating steps 1–3 for each person.

## 5. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the storefront, `/admin/login` for the
dashboard. Add your first category and product from `/admin/products` —
the "Add photo" button opens your phone's camera/gallery directly.

## 6. Before you take real orders

- **Rotate your Telegram bot token.** Any token that's ever been pasted
  into a chat, doc, or screenshot should be treated as compromised —
  regenerate it via @BotFather (`/revoke` or `/token`), then put the new
  value in `TELEGRAM_BOT_TOKEN`.
- **Set your BTC address and (optionally) QR code** from `/admin/settings`.
- **Check your state/country's vape shipping laws.** The built-in age gate
  (date-of-birth entry, 21+ default) is a UX speed bump, not legal
  compliance — many US states now require age verification at the point
  of delivery (adult signature) under the PACT Act, and some restrict
  shipping vape products entirely. This is genuinely worth 20 minutes of
  research before launch; getting it wrong risks the account, not just a
  fine.
- **Decide how gift-card orders get confirmed.** Right now a gift-card
  order sits at `payment_status: pending` until you manually mark it
  "paid" in `/admin/orders` after verifying the code some other way
  (there's no automated redemption system — that's a bigger feature you'd
  add later if volume justifies it).

## 7. Deploy

Push this to a GitHub repo, import it into Vercel, and add the same
environment variables from `.env.local` in **Vercel → Project → Settings →
Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to your real domain.
