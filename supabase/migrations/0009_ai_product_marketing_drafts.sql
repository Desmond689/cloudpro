-- 0009_ai_product_marketing_drafts.sql
-- Phase 8: AI product drafts (max 3/day, never auto-publish)
-- Phase 9: AI marketing drafts (admin approval required)

CREATE TABLE IF NOT EXISTS ai_product_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'rejected', 'published')),
  -- Core fields aligned with products table
  name text,
  description text,
  short_description text,
  brand text,
  category_suggestion text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  price numeric(10,2),
  stock_quantity integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  selling_points text[] DEFAULT '{}',
  seo_title text,
  seo_description text,
  suggested_keywords text[] DEFAULT '{}',
  -- AI metadata
  prompt text,
  ai_notes text,
  factual_gaps text,
  generated_by text NOT NULL DEFAULT 'product_creation_agent',
  published_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_product_drafts_status ON ai_product_drafts(status);
CREATE INDEX IF NOT EXISTS idx_ai_product_drafts_created ON ai_product_drafts(created_at DESC);

CREATE TABLE IF NOT EXISTS ai_marketing_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'rejected', 'published')),
  channel text NOT NULL DEFAULT 'general'
    CHECK (channel IN (
      'general', 'instagram', 'tiktok', 'whatsapp', 'facebook', 'x',
      'email', 'sms', 'banner', 'video_script', 'product_hook', 'campaign'
    )),
  title text,
  body text NOT NULL DEFAULT '',
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text,
  prompt text,
  generated_by text NOT NULL DEFAULT 'marketing_agent',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_marketing_drafts_status ON ai_marketing_drafts(status);
CREATE INDEX IF NOT EXISTS idx_ai_marketing_drafts_created ON ai_marketing_drafts(created_at DESC);

-- Daily draft counter helper (query by date is enough; no separate table required)

CREATE TRIGGER trg_ai_product_drafts_updated_at
  BEFORE UPDATE ON ai_product_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ai_marketing_drafts_updated_at
  BEFORE UPDATE ON ai_marketing_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: admin only (reuse admin check pattern from existing migrations)
ALTER TABLE ai_product_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_marketing_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_product_drafts_admin_all ON ai_product_drafts;
CREATE POLICY ai_product_drafts_admin_all ON ai_product_drafts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS ai_marketing_drafts_admin_all ON ai_marketing_drafts;
CREATE POLICY ai_marketing_drafts_admin_all ON ai_marketing_drafts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );
