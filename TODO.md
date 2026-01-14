# Project TODO

---

## Supabase Configuration Required

### 1. Email Confirmation (SMTP Setup)

1. Go to Supabase Dashboard → **Project Settings** → **Authentication**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Configure with your email provider:
   - **Resend**: Host `smtp.resend.com`, Port `465`, Username `resend`
   - **SendGrid**: Host `smtp.sendgrid.net`, Port `587`
   - **Mailgun**: Host `smtp.mailgun.org`, Port `587`

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
6. In Supabase: **Authentication** → **Providers** → **Google**
7. Add Client ID and Client Secret

### 3. GitHub OAuth Setup

1. Go to [GitHub Settings → Developer Settings](https://github.com/settings/developers)
2. Create **New OAuth App**
3. Set Homepage URL: `https://kanban-pasv-sigma.vercel.app`
4. Set Authorization callback URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. In Supabase: **Authentication** → **Providers** → **GitHub**
6. Add Client ID and Client Secret

### 4. Configure Auth URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set:
   - **Site URL**: `https://kanban-pasv-sigma.vercel.app`
   - **Redirect URLs**: Add `https://kanban-pasv-sigma.vercel.app/**`

---

## Feature Status

### Completed (Code Ready)

- [x] Application loads at production URL
- [x] Environment variables configured on Vercel
- [x] Database migrations applied
- [x] Storage bucket `attachments` created
- [x] RLS policies configured
- [x] User login works (email/password)
- [x] **Google/GitHub OAuth buttons** (needs Supabase config)
- [x] Create boards
- [x] Create tasks
- [x] Drag and drop tasks between columns
- [x] Dark/light theme toggle
- [x] Global search (Ctrl+K)
- [x] Settings page
- [x] **Board sharing** (invite members)
- [x] **Comments on tasks**
- [x] **File attachments**
- [x] **Activity history**
- [x] **Notifications page**
- [x] **PWA manifest** configured

### Needs Supabase Configuration

- [ ] User registration with email confirmation (needs SMTP)
- [ ] Google OAuth login (needs Google Cloud credentials)
- [ ] GitHub OAuth login (needs GitHub OAuth app)

---

## Test Coverage

**138 passing tests**

- [x] Unit tests for utilities
- [x] Unit tests for components (Header, GlobalSearch, BoardColumn, TaskDrawer)
- [x] Unit tests for contexts (AuthContext)
- [x] Unit tests for hooks (useDebounce, useLocalStorage, useRealtimeBoard)
- [x] E2E tests for auth flows
- [x] E2E tests for responsive design
- [x] E2E tests for keyboard navigation

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
