-- Webhooks table for board integrations
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook deliveries log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  success BOOLEAN NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webhooks_board_id ON webhooks(board_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at);

-- RLS policies for webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Webhook policies: only board owners and admins can manage webhooks
CREATE POLICY "Board owners and admins can view webhooks"
  ON webhooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM board_members
      WHERE board_members.board_id = webhooks.board_id
      AND board_members.user_id = auth.uid()
      AND board_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Board owners and admins can create webhooks"
  ON webhooks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM board_members
      WHERE board_members.board_id = webhooks.board_id
      AND board_members.user_id = auth.uid()
      AND board_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Board owners and admins can update webhooks"
  ON webhooks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM board_members
      WHERE board_members.board_id = webhooks.board_id
      AND board_members.user_id = auth.uid()
      AND board_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Board owners and admins can delete webhooks"
  ON webhooks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM board_members
      WHERE board_members.board_id = webhooks.board_id
      AND board_members.user_id = auth.uid()
      AND board_members.role IN ('owner', 'admin')
    )
  );

-- Webhook deliveries policies
CREATE POLICY "Users can view their board webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhooks w
      JOIN board_members bm ON bm.board_id = w.board_id
      WHERE w.id = webhook_deliveries.webhook_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "System can insert webhook deliveries"
  ON webhook_deliveries FOR INSERT
  WITH CHECK (true);
