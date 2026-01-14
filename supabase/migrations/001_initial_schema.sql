-- ==========================================
-- KANBAN BOARD SCHEMA
-- Run this in Supabase SQL Editor
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- BOARDS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for boards
CREATE POLICY "Users can view own boards"
  ON boards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own boards"
  ON boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boards"
  ON boards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own boards"
  ON boards FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- STATUSES TABLE (Columns)
-- ==========================================
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for statuses
CREATE POLICY "Users can view statuses of own boards"
  ON statuses FOR SELECT
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can create statuses in own boards"
  ON statuses FOR INSERT
  WITH CHECK (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can update statuses in own boards"
  ON statuses FOR UPDATE
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()))
  WITH CHECK (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete statuses in own boards"
  ON statuses FOR DELETE
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

-- ==========================================
-- TASKS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  tags TEXT[] DEFAULT '{}',
  assignee_name VARCHAR(100),
  assignee_color VARCHAR(7),
  due_date TIMESTAMPTZ,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks of own boards"
  ON tasks FOR SELECT
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can create tasks in own boards"
  ON tasks FOR INSERT
  WITH CHECK (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can update tasks in own boards"
  ON tasks FOR UPDATE
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()))
  WITH CHECK (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete tasks in own boards"
  ON tasks FOR DELETE
  USING (board_id IN (SELECT id FROM boards WHERE user_id = auth.uid()));

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_boards_user ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_board_order ON statuses(board_id, "order");
CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_order ON tasks(status_id, "order");
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority) WHERE priority IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- ==========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
CREATE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_statuses_updated_at ON statuses;
CREATE TRIGGER update_statuses_updated_at
  BEFORE UPDATE ON statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ENABLE REALTIME
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE boards;
ALTER PUBLICATION supabase_realtime ADD TABLE statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- ==========================================
-- HELPER FUNCTION: Get next order for status
-- ==========================================
CREATE OR REPLACE FUNCTION get_next_status_order(p_board_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX("order") + 1 FROM statuses WHERE board_id = p_board_id),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- HELPER FUNCTION: Get next order for task
-- ==========================================
CREATE OR REPLACE FUNCTION get_next_task_order(p_status_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX("order") + 1 FROM tasks WHERE status_id = p_status_id),
    0
  );
END;
$$ LANGUAGE plpgsql;
