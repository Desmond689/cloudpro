-- 0008_ai_support.sql
-- AI Business Operating System — Phase 1 foundation
-- Extends existing chat system for AI replies and human takeover.
-- Safe to run multiple times (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS patterns).

-- 1. Extend messages.sender_type to allow 'ai'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_sender_type_check
  CHECK (sender_type IN ('customer', 'admin', 'ai'));

-- 2. Conversation AI mode + escalation flags
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_mode text NOT NULL DEFAULT 'ai_active'
    CHECK (ai_mode IN ('ai_active', 'admin_takeover'));

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS needs_human boolean NOT NULL DEFAULT false;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_last_error text;

-- Index for admin queues
CREATE INDEX IF NOT EXISTS idx_conversations_needs_human
  ON conversations (needs_human) WHERE needs_human = true;

CREATE INDEX IF NOT EXISTS idx_conversations_ai_mode
  ON conversations (ai_mode);

-- 3. Minimal AI activity log (for Phase 1 audit + later phases)
CREATE TABLE IF NOT EXISTS ai_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  agent text NOT NULL DEFAULT 'customer',
  action text NOT NULL,
  tool_name text,
  input_summary text,
  result_summary text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_activity_logs_created
  ON ai_activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_activity_logs_conversation
  ON ai_activity_logs (conversation_id);

-- 4. Store settings for AI toggles (extend existing store_settings if present)
-- store_settings is a single-row table in this project.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_settings') THEN
    ALTER TABLE store_settings
      ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;
    ALTER TABLE store_settings
      ADD COLUMN IF NOT EXISTS ai_customer_enabled boolean NOT NULL DEFAULT true;
    ALTER TABLE store_settings
      ADD COLUMN IF NOT EXISTS telegram_notify_ai_escalation boolean NOT NULL DEFAULT true;
  END IF;
END $$;
