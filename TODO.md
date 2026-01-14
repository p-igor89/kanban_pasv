# Project TODO

---

## Supabase Configuration

### 1. Authentication Setup

**Email Confirmation (Required)**

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Click on **Email**
3. Ensure **"Confirm email"** is enabled
4. Configure SMTP for email delivery:
   - Go to **Project Settings** → **Authentication** → **SMTP Settings**
   - Enable **Custom SMTP**
   - Configure with your email provider (Resend, SendGrid, etc.):
     - Host: `smtp.resend.com` (for Resend)
     - Port: `465`
     - Username: `resend`
     - Password: Your API key
     - Sender email: `noreply@yourdomain.com`

**OAuth Providers (Optional)**

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google**:
   - Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com)
   - Add Client ID and Client Secret
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`
3. Enable **GitHub**:
   - Create OAuth app at [GitHub Settings](https://github.com/settings/developers)
   - Add Client ID and Client Secret
   - Add callback URL: `https://your-project.supabase.co/auth/v1/callback`

### 2. Configure Auth URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set:
   - **Site URL**: `https://kanban-pasv-sigma.vercel.app`
   - **Redirect URLs**: Add `https://kanban-pasv-sigma.vercel.app/**`

---

## Deployment Checklist

- [x] Application loads at production URL
- [x] Environment variables configured on Vercel
- [x] Database migrations applied
- [x] Storage bucket `attachments` created
- [x] RLS policies configured
- [x] User login works (existing user)
- [x] Create boards
- [x] Create tasks
- [x] Drag and drop tasks between columns
- [x] Dark/light theme toggle
- [x] Global search (Ctrl+K)
- [x] Settings page
- [ ] User registration with email confirmation
- [ ] Google/GitHub OAuth login
- [ ] Board sharing (invite members)
- [ ] Comments on tasks
- [ ] File attachments
- [ ] Activity history
- [ ] Notifications page
- [ ] PWA installation

---

## Test Coverage

- [x] Unit tests for utilities (formatDate, validateEmail, etc.)
- [x] Unit tests for components (Header, GlobalSearch, BoardColumn, TaskDrawer)
- [x] Unit tests for contexts (AuthContext)
- [x] Unit tests for hooks (useDebounce, useLocalStorage, useRealtimeBoard)
- [x] E2E tests for auth flows (login, register)
- [x] E2E tests for responsive design
- [x] E2E tests for keyboard navigation

**Total: 138 passing tests**

---

## Performance Optimizations

- [x] React.memo on BoardColumn and BoardTaskCard
- [x] useDebounce hook for search
- [x] useDebouncedCallback for rapid events
- [x] useThrottledCallback for scroll events
- [x] useLocalStorage with TTL caching
- [x] usePagination for large lists
- [x] useVirtualScroll for virtualization
- [x] useInfiniteScroll for lazy loading

---

## Future Enhancements

### Phase 2: Real-time Features

- [ ] Real-time comment updates via Supabase Realtime
- [ ] Presence indicators for active users
- [ ] Live cursor tracking for collaboration

### Phase 3: Advanced Features

- [ ] Email notifications via Edge Functions
- [ ] Webhook integrations
- [ ] Export boards to PDF/CSV

### Phase 4: Undo/Redo

- [ ] useUndoRedo hook with Command pattern
- [ ] Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
- [ ] Session-based history (50 actions max)

---

## Environment Variables (Vercel)

- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `NODE_ENV=production`
- [x] `ALLOWED_ORIGIN=https://kanban-pasv-sigma.vercel.app`

---

**Last Updated:** 2026-01-14
