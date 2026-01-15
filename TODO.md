# Project TODO

---

## Supabase Configuration (Completed)

All authentication providers have been configured:

- **Email/SMTP**: Resend (`smtp.resend.com`)
- **Google OAuth**: Configured in Supabase
- **GitHub OAuth**: Configured in Supabase
- **Site URL**: `https://kanban-pasv-sigma.vercel.app`
- **Redirect URLs**: `https://kanban-pasv-sigma.vercel.app/**`

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

### Supabase Configuration (Completed)

- [x] User registration with email confirmation (Resend SMTP)
- [x] Google OAuth login
- [x] GitHub OAuth login

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

### Phase 2: Real-time Features (Completed)

- [x] Real-time comment updates via Supabase Realtime
- [x] Presence indicators for active users
- [x] Live cursor tracking for collaboration

### Phase 3: Advanced Features (Completed)

- [x] Email notifications via Edge Functions
- [x] Webhook integrations
- [x] Export boards to PDF/CSV (HTML format)

### Phase 4: Undo/Redo (Completed)

- [x] useUndoRedo hook with Command pattern
- [x] Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+Shift+Z (redo)
- [x] Session-based history (50 actions max)

---

## Environment Variables (Vercel)

- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `NODE_ENV=production`
- [x] `ALLOWED_ORIGIN=https://kanban-pasv-sigma.vercel.app`

---

**Last Updated:** 2026-01-14
