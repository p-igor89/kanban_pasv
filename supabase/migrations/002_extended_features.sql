-- Migration: Extended Features
-- Adds: Board sharing, Comments, Attachments, Activity log, Templates, Notifications

-- ============================================
-- 1. BOARD MEMBERS (Sharing)
-- ============================================
CREATE TABLE IF NOT EXISTS board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);

-- ============================================
-- 2. COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

-- ============================================
-- 3. ATTACHMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_task ON attachments(task_id);

-- ============================================
-- 4. ACTIVITIES (Activity Log)
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN (
        'board_created', 'board_updated', 'board_deleted',
        'status_created', 'status_updated', 'status_deleted', 'status_reordered',
        'task_created', 'task_updated', 'task_deleted', 'task_moved', 'task_reordered',
        'comment_added', 'comment_updated', 'comment_deleted',
        'attachment_added', 'attachment_deleted',
        'member_invited', 'member_removed', 'member_role_changed'
    )),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_board ON activities(board_id);
CREATE INDEX idx_activities_task ON activities(task_id);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_created ON activities(created_at DESC);

-- ============================================
-- 5. BOARD TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS board_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📋',
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    statuses JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO board_templates (name, description, icon, is_public, statuses) VALUES
(
    'Basic Kanban',
    'Simple kanban board with To Do, In Progress, and Done columns',
    '📋',
    true,
    '[
        {"name": "To Do", "color": "#6B7280", "order": 0},
        {"name": "In Progress", "color": "#3B82F6", "order": 1},
        {"name": "Done", "color": "#22C55E", "order": 2}
    ]'::jsonb
),
(
    'Software Development',
    'Board for software development with Backlog, Sprint, Review, and Done',
    '💻',
    true,
    '[
        {"name": "Backlog", "color": "#6B7280", "order": 0},
        {"name": "Sprint", "color": "#8B5CF6", "order": 1},
        {"name": "In Progress", "color": "#3B82F6", "order": 2},
        {"name": "Code Review", "color": "#F59E0B", "order": 3},
        {"name": "Done", "color": "#22C55E", "order": 4}
    ]'::jsonb
),
(
    'Bug Tracking',
    'Track and manage bugs with priority-based workflow',
    '🐛',
    true,
    '[
        {"name": "Reported", "color": "#EF4444", "order": 0},
        {"name": "Confirmed", "color": "#F97316", "order": 1},
        {"name": "In Progress", "color": "#3B82F6", "order": 2},
        {"name": "Testing", "color": "#8B5CF6", "order": 3},
        {"name": "Resolved", "color": "#22C55E", "order": 4}
    ]'::jsonb
),
(
    'Content Calendar',
    'Plan and manage content creation',
    '📅',
    true,
    '[
        {"name": "Ideas", "color": "#EC4899", "order": 0},
        {"name": "Writing", "color": "#8B5CF6", "order": 1},
        {"name": "Editing", "color": "#F59E0B", "order": 2},
        {"name": "Scheduled", "color": "#3B82F6", "order": 3},
        {"name": "Published", "color": "#22C55E", "order": 4}
    ]'::jsonb
),
(
    'Personal Tasks',
    'Simple personal task management',
    '✅',
    true,
    '[
        {"name": "Today", "color": "#EF4444", "order": 0},
        {"name": "This Week", "color": "#F59E0B", "order": 1},
        {"name": "Later", "color": "#6B7280", "order": 2},
        {"name": "Done", "color": "#22C55E", "order": 3}
    ]'::jsonb
);

-- ============================================
-- 6. NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'task_assigned', 'task_due_soon', 'task_overdue',
        'comment_added', 'comment_mention',
        'board_invite', 'board_role_changed',
        'task_moved', 'task_updated'
    )),
    title TEXT NOT NULL,
    message TEXT,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- 7. USER PROFILES (for display names, avatars)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    notification_preferences JSONB DEFAULT '{
        "email_task_assigned": true,
        "email_task_due": true,
        "email_comments": true,
        "email_board_invites": true
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 8. UPDATE RLS POLICIES
-- ============================================

-- Board Members RLS
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view board members for their boards"
    ON board_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Board owners/admins can manage members"
    ON board_members FOR ALL
    USING (
        board_id IN (
            SELECT board_id FROM board_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Comments RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible boards"
    ON comments FOR SELECT
    USING (
        task_id IN (
            SELECT t.id FROM tasks t
            JOIN boards b ON t.board_id = b.id
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR bm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create comments on accessible boards"
    ON comments FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        task_id IN (
            SELECT t.id FROM tasks t
            JOIN boards b ON t.board_id = b.id
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR (bm.user_id = auth.uid() AND bm.role != 'viewer')
        )
    );

CREATE POLICY "Users can update own comments"
    ON comments FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE
    USING (user_id = auth.uid());

-- Attachments RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments on accessible boards"
    ON attachments FOR SELECT
    USING (
        task_id IN (
            SELECT t.id FROM tasks t
            JOIN boards b ON t.board_id = b.id
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR bm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add attachments to accessible boards"
    ON attachments FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        task_id IN (
            SELECT t.id FROM tasks t
            JOIN boards b ON t.board_id = b.id
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR (bm.user_id = auth.uid() AND bm.role != 'viewer')
        )
    );

CREATE POLICY "Users can delete own attachments"
    ON attachments FOR DELETE
    USING (user_id = auth.uid());

-- Activities RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities on accessible boards"
    ON activities FOR SELECT
    USING (
        board_id IN (
            SELECT b.id FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR bm.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert activities"
    ON activities FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Board Templates RLS
ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public templates"
    ON board_templates FOR SELECT
    USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create own templates"
    ON board_templates FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates"
    ON board_templates FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete own templates"
    ON board_templates FOR DELETE
    USING (created_by = auth.uid());

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- ============================================
-- 9. UPDATE BOARDS RLS (for sharing)
-- ============================================
DROP POLICY IF EXISTS "Users can view own boards" ON boards;
CREATE POLICY "Users can view own and shared boards"
    ON boards FOR SELECT
    USING (
        user_id = auth.uid() OR
        id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own boards" ON boards;
CREATE POLICY "Users can update own or admin boards"
    ON boards FOR UPDATE
    USING (
        user_id = auth.uid() OR
        id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- ============================================
-- 10. UPDATE TASKS/STATUSES RLS (for sharing)
-- ============================================
DROP POLICY IF EXISTS "Users can view tasks on own boards" ON tasks;
CREATE POLICY "Users can view tasks on accessible boards"
    ON tasks FOR SELECT
    USING (
        board_id IN (
            SELECT b.id FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR bm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert tasks on own boards" ON tasks;
CREATE POLICY "Users can insert tasks on accessible boards"
    ON tasks FOR INSERT
    WITH CHECK (
        board_id IN (
            SELECT b.id FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR (bm.user_id = auth.uid() AND bm.role != 'viewer')
        )
    );

DROP POLICY IF EXISTS "Users can update tasks on own boards" ON tasks;
CREATE POLICY "Users can update tasks on accessible boards"
    ON tasks FOR UPDATE
    USING (
        board_id IN (
            SELECT b.id FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR (bm.user_id = auth.uid() AND bm.role != 'viewer')
        )
    );

DROP POLICY IF EXISTS "Users can delete tasks on own boards" ON tasks;
CREATE POLICY "Users can delete tasks on accessible boards"
    ON tasks FOR DELETE
    USING (
        board_id IN (
            SELECT b.id FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR (bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin'))
        )
    );

-- Same for statuses
DROP POLICY IF EXISTS "Users can view statuses on own boards" ON statuses;
CREATE POLICY "Users can view statuses on accessible boards"
    ON statuses FOR SELECT
    USING (
        board_id IN (
            SELECT b.id FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR bm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert statuses on own boards" ON statuses;
CREATE POLICY "Users can insert statuses on accessible boards"
    ON statuses FOR INSERT
    WITH CHECK (
        board_id IN (
            SELECT b.id FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR (bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin'))
        )
    );

DROP POLICY IF EXISTS "Users can update statuses on own boards" ON statuses;
CREATE POLICY "Users can update statuses on accessible boards"
    ON statuses FOR UPDATE
    USING (
        board_id IN (
            SELECT b.id FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR (bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin'))
        )
    );

DROP POLICY IF EXISTS "Users can delete statuses on own boards" ON statuses;
CREATE POLICY "Users can delete statuses on accessible boards"
    ON statuses FOR DELETE
    USING (
        board_id IN (
            SELECT b.id FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = auth.uid() OR (bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin'))
        )
    );

-- ============================================
-- 11. REALTIME SUBSCRIPTIONS
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE board_members;

-- ============================================
-- 12. FULL-TEXT SEARCH INDEX
-- ============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING GIN(search_vector);

-- Search function
CREATE OR REPLACE FUNCTION search_tasks(
    search_query TEXT,
    user_uuid UUID
)
RETURNS TABLE (
    id UUID,
    board_id UUID,
    board_name TEXT,
    status_id UUID,
    status_name TEXT,
    title TEXT,
    description TEXT,
    priority TEXT,
    tags TEXT[],
    due_date TIMESTAMPTZ,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.board_id,
        b.name as board_name,
        t.status_id,
        s.name as status_name,
        t.title,
        t.description,
        t.priority,
        t.tags,
        t.due_date,
        ts_rank(t.search_vector, websearch_to_tsquery('english', search_query)) as rank
    FROM tasks t
    JOIN boards b ON t.board_id = b.id
    JOIN statuses s ON t.status_id = s.id
    LEFT JOIN board_members bm ON b.id = bm.board_id
    WHERE
        (b.user_id = user_uuid OR bm.user_id = user_uuid)
        AND t.search_vector @@ websearch_to_tsquery('english', search_query)
    ORDER BY rank DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
