-- 0010_ai_ops_remaining.sql
-- Phase 10–16: abandoned carts, customer memory, risk flags, automations, AI settings

-- Abandoned cart tracking
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  customer_name text,
  phone text,
  cart_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reminded', 'recovered', 'expired', 'dismissed')),
  checkout_started boolean NOT NULL DEFAULT false,
  reminder_sent_at timestamptz,
  recovered_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status ON abandoned_carts(status);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_created ON abandoned_carts(created_at DESC);

-- Customer memory (service improvements only — not for public exposure)
CREATE TABLE IF NOT EXISTS ai_customer_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  preferred_categories text[] DEFAULT '{}',
  product_interests text[] DEFAULT '{}',
  notes text,
  last_order_at timestamptz,
  total_orders integer DEFAULT 0,
  total_spent numeric(12,2) DEFAULT 0,
  risk_score integer NOT NULL DEFAULT 0,
  risk_flags text[] DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_ai_customer_memory_email ON ai_customer_memory(email);

-- Risk / review flags (never auto-ban)
CREATE TABLE IF NOT EXISTS ai_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('order', 'customer', 'conversation')),
  entity_id text NOT NULL,
  email text,
  flags text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  summary text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_risk_flags_status ON ai_risk_flags(status);

-- Automation toggles / rules
CREATE TABLE IF NOT EXISTS ai_automation_rules (
  id text PRIMARY KEY,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ai_automation_rules (id, name, enabled, config) VALUES
  ('abandoned_cart', 'Abandoned cart follow-up', true, '{"delay_hours": 2, "max_reminders": 1}'),
  ('low_stock_alert', 'Low stock Telegram alerts', true, '{}'),
  ('daily_report', 'Daily business report', true, '{"hour_utc": 7}'),
  ('high_intent_telegram', 'High-intent customer Telegram', true, '{}'),
  ('order_risk_flag', 'Order risk flagging', true, '{}')
ON CONFLICT (id) DO NOTHING;

-- AI control settings (single-row style key/value)
CREATE TABLE IF NOT EXISTS ai_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'true'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ai_settings (key, value) VALUES
  ('ai_enabled', 'true'::jsonb),
  ('customer_ai_enabled', 'true'::jsonb),
  ('marketing_ai_enabled', 'true'::jsonb),
  ('product_generation_enabled', 'true'::jsonb),
  ('abandoned_cart_enabled', 'true'::jsonb),
  ('telegram_alerts_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TRIGGER trg_abandoned_carts_updated_at
  BEFORE UPDATE ON abandoned_carts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_customer_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS abandoned_carts_admin_all ON abandoned_carts;
CREATE POLICY abandoned_carts_admin_all ON abandoned_carts FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS ai_customer_memory_admin_all ON ai_customer_memory;
CREATE POLICY ai_customer_memory_admin_all ON ai_customer_memory FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS ai_risk_flags_admin_all ON ai_risk_flags;
CREATE POLICY ai_risk_flags_admin_all ON ai_risk_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS ai_automation_rules_admin_all ON ai_automation_rules;
CREATE POLICY ai_automation_rules_admin_all ON ai_automation_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS ai_settings_admin_all ON ai_settings;
CREATE POLICY ai_settings_admin_all ON ai_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
