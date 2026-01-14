# Project TODO

---

## URGENT: Supabase Configuration Required

### 1. Fix Email Confirmation (Registration emails not sending)

**Option A: Disable Email Confirmation (Quick fix for testing)**

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Click on **Email**
3. Toggle OFF **"Confirm email"**
4. Save changes

**Option B: Configure Custom SMTP (Recommended for production)**

1. Go to Supabase Dashboard → **Project Settings** → **Authentication**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Configure with your email provider (Resend, SendGrid, etc.):
   - Host: `smtp.resend.com` (for Resend)
   - Port: `465`
   - Username: `resend`
   - Password: Your API key
   - Sender email: `noreply@yourdomain.com`

### 2. Configure Auth URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set:
   - **Site URL**: `https://kanban-pasv-sigma.vercel.app`
   - **Redirect URLs**: Add `https://kanban-pasv-sigma.vercel.app/**`

### 3. Fix Board Members Relationship

Run this SQL in Supabase SQL Editor:

```sql
-- Add foreign key for profiles relationship
ALTER TABLE board_members
  DROP CONSTRAINT IF EXISTS board_members_user_id_fkey_profiles;

ALTER TABLE board_members
  ADD CONSTRAINT board_members_user_id_fkey_profiles
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add missing columns
ALTER TABLE board_members ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE board_members ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
```

### 4. Create Storage Bucket for Attachments

1. Go to Supabase Dashboard → **Storage**
2. Create new bucket: `attachments`
3. Set to **Private**
4. Run this SQL for policies:

```sql
CREATE POLICY "Users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Post-Deployment Checklist

- [x] Application loads at production URL
- [x] User login works (existing user)
- [x] Create boards
- [x] Create tasks
- [x] Drag and drop tasks between columns
- [x] Dark/light theme toggle
- [ ] User registration (needs email fix - see above)
- [ ] Board sharing (invite members) - needs SQL fix above
- [ ] Comments on tasks
- [ ] File attachments - needs storage bucket
- [ ] Activity history
- [x] Global search (Ctrl+K)
- [ ] Notifications page
- [x] Settings page
- [ ] PWA installation (Add to Home Screen)

---

## Post-MVP Enhancements

### Phase 2: Task Activity/Comments

- [x] Activity logging for task changes
- [x] Comments API
- [x] TaskComments component
- [ ] Real-time comment updates

### Phase 3: Additional Features

- [x] Board templates
- [x] Task attachments API
- [ ] Email notifications via Edge Functions

### Phase 4: Undo/Redo Functionality

- [ ] useUndoRedo hook with Command pattern
- [ ] Command builders for each operation type
- [ ] UndoRedoButtons component
- [ ] Board component integration
- [ ] Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
- [ ] Session-based history (50 actions max)

---

## Environment Variables Checklist (Vercel)

- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `NODE_ENV=production`
- [x] `ALLOWED_ORIGIN=https://kanban-pasv-sigma.vercel.app`

---

**Last Updated:** 2026-01-14
