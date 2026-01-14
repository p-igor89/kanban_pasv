# Production Deployment Guide

This guide covers deploying KanbanPro to production using Vercel (recommended) and Supabase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Supabase Setup](#supabase-setup)
- [Deploy to Vercel](#deploy-to-vercel)
- [Environment Variables](#environment-variables)
- [Supabase Edge Functions](#supabase-edge-functions)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- [x] Supabase project created
- [x] GitHub repository with your code
- [x] All environment variables configured (see [.env.example](./.env.example))
- [x] Tested the application locally (`npm run build` && `npm start`)
- [x] All tests passing (`npm test`)

---

## Supabase Setup

### 1. Create Supabase Project

1. **Sign up/Login to Supabase**
   - Go to [supabase.com](https://supabase.com)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Choose organization
   - Set project name and database password
   - Select region closest to your users
   - Click "Create new project"

### 2. Run Database Migrations

Run the following SQL in the Supabase SQL Editor (Dashboard > SQL Editor):

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  notification_preferences JSONB DEFAULT '{"email_task_assigned": true, "email_task_due": true, "email_comments": true, "email_board_invites": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create statuses table
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  assignee_name TEXT,
  assignee_color TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create board_members table (for sharing)
CREATE TABLE IF NOT EXISTS board_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activities table (for audit log)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create board_templates table
CREATE TABLE IF NOT EXISTS board_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📋',
  statuses JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_board_id ON statuses(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_activities_board_id ON activities(board_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for boards
CREATE POLICY "Users can view own boards" ON boards FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view shared boards" ON boards FOR SELECT USING (
  id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create boards" ON boards FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own boards" ON boards FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can update shared boards" ON boards FOR UPDATE USING (
  id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can delete own boards" ON boards FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for statuses
CREATE POLICY "Users can view statuses" ON statuses FOR SELECT USING (
  board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  OR board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
);
CREATE POLICY "Board owners can manage statuses" ON statuses FOR ALL USING (
  board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
);
CREATE POLICY "Board admins can manage statuses" ON statuses FOR ALL USING (
  board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks" ON tasks FOR SELECT USING (
  board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  OR board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
);
CREATE POLICY "Board owners can manage tasks" ON tasks FOR ALL USING (
  board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
);
CREATE POLICY "Board members can manage tasks" ON tasks FOR ALL USING (
  board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid() AND role IN ('admin', 'member'))
);

-- RLS Policies for board_members
CREATE POLICY "Users can view board members" ON board_members FOR SELECT USING (
  board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  OR user_id = auth.uid()
);
CREATE POLICY "Board owners can manage members" ON board_members FOR ALL USING (
  board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
);
CREATE POLICY "Board admins can manage members" ON board_members FOR ALL USING (
  board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for comments
CREATE POLICY "Users can view comments" ON comments FOR SELECT USING (
  task_id IN (SELECT id FROM tasks WHERE board_id IN (
    SELECT id FROM boards WHERE user_id = auth.uid()
    UNION SELECT board_id FROM board_members WHERE user_id = auth.uid()
  ))
);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments" ON attachments FOR SELECT USING (
  task_id IN (SELECT id FROM tasks WHERE board_id IN (
    SELECT id FROM boards WHERE user_id = auth.uid()
    UNION SELECT board_id FROM board_members WHERE user_id = auth.uid()
  ))
);
CREATE POLICY "Users can create attachments" ON attachments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own attachments" ON attachments FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for activities
CREATE POLICY "Users can view activities" ON activities FOR SELECT USING (
  board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  OR board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create activities" ON activities FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for board_templates
CREATE POLICY "Anyone can view public templates" ON board_templates FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own templates" ON board_templates FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create templates" ON board_templates FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own templates" ON board_templates FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own templates" ON board_templates FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Insert default templates
INSERT INTO board_templates (name, description, icon, is_public, statuses) VALUES
('Kanban', 'Classic Kanban workflow', '📋', true, '[{"name": "Backlog", "color": "#6B7280", "order": 0}, {"name": "Todo", "color": "#3B82F6", "order": 1}, {"name": "In Progress", "color": "#F59E0B", "order": 2}, {"name": "Done", "color": "#10B981", "order": 3}]'),
('Scrum Sprint', 'Agile sprint planning', '🏃', true, '[{"name": "Sprint Backlog", "color": "#6B7280", "order": 0}, {"name": "In Development", "color": "#3B82F6", "order": 1}, {"name": "Code Review", "color": "#8B5CF6", "order": 2}, {"name": "Testing", "color": "#F59E0B", "order": 3}, {"name": "Done", "color": "#10B981", "order": 4}]'),
('Bug Tracking', 'Track and resolve bugs', '🐛', true, '[{"name": "Reported", "color": "#EF4444", "order": 0}, {"name": "Confirmed", "color": "#F59E0B", "order": 1}, {"name": "In Progress", "color": "#3B82F6", "order": 2}, {"name": "Fixed", "color": "#10B981", "order": 3}, {"name": "Verified", "color": "#6B7280", "order": 4}]'),
('Content Pipeline', 'Content creation workflow', '✍️', true, '[{"name": "Ideas", "color": "#8B5CF6", "order": 0}, {"name": "Drafting", "color": "#3B82F6", "order": 1}, {"name": "Review", "color": "#F59E0B", "order": 2}, {"name": "Published", "color": "#10B981", "order": 3}]')
ON CONFLICT DO NOTHING;

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Configure Authentication

1. Go to **Authentication > Providers**
2. Enable **Email** provider (enabled by default)
3. Configure email templates in **Authentication > Email Templates**
4. (Optional) Enable social providers (Google, GitHub, etc.)

### 4. Configure Storage (for file attachments)

1. Go to **Storage**
2. Create a new bucket called `attachments`
3. Set it to **Private** (files accessed via signed URLs)
4. Add storage policy:

```sql
-- Storage policies for attachments bucket
CREATE POLICY "Users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'attachments' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'attachments' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Deploy to Vercel

[Vercel](https://vercel.com) is the recommended platform for Next.js applications.

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Your Repository**
   - Click "Add New Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables**
   - In the "Environment Variables" section, add:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
     ALLOWED_ORIGIN=https://your-domain.vercel.app
     NODE_ENV=production
     ```

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete (usually 1-2 minutes)
   - Visit your live site at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Production deployment
vercel --prod
```

---

## Environment Variables

### Required Variables

| Variable                        | Description            | Where to find                       |
| ------------------------------- | ---------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL   | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard > Settings > API |
| `NODE_ENV`                      | Environment mode       | Set to `production`                 |
| `ALLOWED_ORIGIN`                | CORS allowed origin    | Your production domain              |

### Optional Variables (for Edge Functions)

| Variable         | Description                            |
| ---------------- | -------------------------------------- |
| `RESEND_API_KEY` | Resend API key for email notifications |
| `FROM_EMAIL`     | Email sender address                   |
| `APP_URL`        | Application URL for email links        |

---

## Supabase Edge Functions

To enable email notifications, deploy the Edge Function:

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref your-project-ref
```

### 4. Set Edge Function Secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
supabase secrets set FROM_EMAIL="KanbanPro <noreply@yourdomain.com>"
supabase secrets set APP_URL=https://your-app-domain.com
```

### 5. Deploy Edge Function

```bash
supabase functions deploy send-notification-email
```

---

## Post-Deployment Checklist

After deploying, verify:

- [ ] Application loads at production URL
- [ ] User registration and login work
- [ ] Create, edit, delete boards
- [ ] Create, move, delete tasks
- [ ] Drag and drop tasks between columns
- [ ] Board sharing (invite members)
- [ ] Comments on tasks
- [ ] File attachments
- [ ] Activity history
- [ ] Global search (Ctrl+K)
- [ ] Notifications page
- [ ] Settings page
- [ ] Dark/light theme toggle
- [ ] PWA installation (Add to Home Screen)

---

## Monitoring & Troubleshooting

### Common Issues

#### 1. "Failed to fetch" errors

- Check `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `ALLOWED_ORIGIN` matches your domain
- Check Supabase project is running

#### 2. Authentication not working

- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check Site URL in Supabase Auth settings matches your domain
- Add your domain to Redirect URLs in Supabase Auth

#### 3. File uploads failing

- Create `attachments` bucket in Supabase Storage
- Add storage policies (see setup section)
- Check file size limits

#### 4. RLS policy errors

- Review RLS policies in Supabase Dashboard
- Check that policies allow the intended operations
- Use Supabase Dashboard > Table Editor to test queries

### Viewing Logs

**Vercel:**

```bash
vercel logs your-project.vercel.app
```

**Supabase:**

- Dashboard > Logs > Edge Functions
- Dashboard > Logs > Auth
- Dashboard > Logs > Database

---

## Custom Domain Setup

### Vercel

1. Go to project > Settings > Domains
2. Add your custom domain
3. Configure DNS as instructed
4. Update `ALLOWED_ORIGIN` environment variable
5. Update Supabase Auth redirect URLs

### Supabase Auth

1. Go to Authentication > URL Configuration
2. Update Site URL to your custom domain
3. Add custom domain to Redirect URLs

---

## Support

- **Application Issues**: Open an issue on GitHub
- **Supabase Issues**: [Supabase Support](https://supabase.com/support)
- **Vercel Issues**: [Vercel Support](https://vercel.com/support)

---

**Last Updated:** 2026-01-14

Built with Next.js + Supabase
