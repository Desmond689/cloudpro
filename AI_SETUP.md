# Cloudra — AI Business Operating System

## What was added

Integrated AI layer (Google Gemini, server-side only) on top of the existing Next.js + Supabase store.

### Phases
1. Customer chat + Gemini (existing ChatWidget)
2–3. Product search, recommendations, sales intent
4. Human takeover / resume AI
5–6. Order agent + Telegram intelligence
7. Inventory agent
8. Product Creation Agent (max 3 drafts/day, vape-only) + AI Product Studio
9. Marketing Agent + Marketing Studio
10. Abandoned cart tracking
11. Admin AI Assistant
12–13. Business analytics + daily report
14. Customer memory
15. Risk flags (review only)
16. Sales estimates + pricing suggestions (never auto-change prices)

### Admin routes
- `/admin/ai` — Control Center + Ask AI
- `/admin/ai-products` — Product Studio
- `/admin/ai-marketing` — Marketing Studio

### Migrations (run in order in Supabase SQL editor)
1. `supabase/migrations/0008_ai_support.sql`
2. `supabase/migrations/0009_ai_product_marketing_drafts.sql`
3. `supabase/migrations/0010_ai_ops_remaining.sql`

### Environment (`.env.local` — never commit)
```
GEMINI_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
NEXT_PUBLIC_SITE_URL=
CRON_SECRET=          # optional, for /api/ai/cron
# plus existing Supabase keys
```

### Run
```bash
npm install
npm run dev
```

### Cron (optional)
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR_DOMAIN/api/ai/cron?job=all"
```

### Security
- GEMINI_API_KEY is server-only
- AI never invents products/prices/stock/orders/payment confirmation
- Product drafts never auto-publish
- Prices never auto-changed
- Risk flags never auto-ban
