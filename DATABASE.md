# Database Documentation

This document covers the database setup, schema, and architecture for KanbanPro.

## Table of Contents

- [Database Overview](#database-overview)
- [Schema](#schema)
- [Row Level Security (RLS)](#row-level-security-rls)
- [Indexes](#indexes)
- [Storage](#storage)
- [Migrations](#migrations)

---

## Database Overview

### Technology

- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Hosting**: Supabase Cloud

### Connection

The application connects to Supabase using environment variables:

```typescript
// src/lib/supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

---

## Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │   boards    │       │   tasks     │
│  (auth)     │◄──────│             │◄──────│             │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │                     │
      │                     │                     │
      ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  profiles   │       │  statuses   │       │  comments   │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │                     │
      │                     │                     │
      ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│board_members│       │ activities  │       │ attachments │
└─────────────┘       └─────────────┘       └─────────────┘
```

### Tables

#### profiles

User profile information.

| Column                   | Type      | Description                    |
| ------------------------ | --------- | ------------------------------ |
| id                       | UUID (PK) | References auth.users(id)      |
| email                    | TEXT      | User email                     |
| display_name             | TEXT      | Display name                   |
| avatar_url               | TEXT      | Avatar URL                     |
| notification_preferences | JSONB     | Email notification preferences |
| created_at               | TIMESTAMP | Creation timestamp             |
| updated_at               | TIMESTAMP | Last update timestamp          |

#### boards

Kanban boards.

| Column      | Type      | Description           |
| ----------- | --------- | --------------------- |
| id          | UUID (PK) | Primary key           |
| user_id     | UUID (FK) | Owner (auth.users)    |
| name        | TEXT      | Board name            |
| description | TEXT      | Board description     |
| created_at  | TIMESTAMP | Creation timestamp    |
| updated_at  | TIMESTAMP | Last update timestamp |

#### statuses

Board columns/statuses.

| Column     | Type      | Description           |
| ---------- | --------- | --------------------- |
| id         | UUID (PK) | Primary key           |
| board_id   | UUID (FK) | Parent board          |
| name       | TEXT      | Status name           |
| color      | TEXT      | Hex color code        |
| order      | INTEGER   | Position in board     |
| created_at | TIMESTAMP | Creation timestamp    |
| updated_at | TIMESTAMP | Last update timestamp |

#### tasks

Individual tasks.

| Column         | Type      | Description                       |
| -------------- | --------- | --------------------------------- |
| id             | UUID (PK) | Primary key                       |
| board_id       | UUID (FK) | Parent board                      |
| status_id      | UUID (FK) | Current status                    |
| title          | TEXT      | Task title (max 200 chars)        |
| description    | TEXT      | Task description (max 2000 chars) |
| priority       | TEXT      | low, medium, high, critical       |
| due_date       | TIMESTAMP | Due date                          |
| tags           | TEXT[]    | Array of tags                     |
| assignee_name  | TEXT      | Assignee display name             |
| assignee_color | TEXT      | Assignee avatar color             |
| order          | INTEGER   | Position within column            |
| created_at     | TIMESTAMP | Creation timestamp                |
| updated_at     | TIMESTAMP | Last update timestamp             |

#### board_members

Board sharing/collaboration.

| Column     | Type      | Description           |
| ---------- | --------- | --------------------- |
| id         | UUID (PK) | Primary key           |
| board_id   | UUID (FK) | Board                 |
| user_id    | UUID (FK) | Member user           |
| role       | TEXT      | admin, member, viewer |
| invited_by | UUID (FK) | User who invited      |
| created_at | TIMESTAMP | Creation timestamp    |

#### comments

Task comments.

| Column     | Type      | Description           |
| ---------- | --------- | --------------------- |
| id         | UUID (PK) | Primary key           |
| task_id    | UUID (FK) | Parent task           |
| user_id    | UUID (FK) | Comment author        |
| content    | TEXT      | Comment text          |
| created_at | TIMESTAMP | Creation timestamp    |
| updated_at | TIMESTAMP | Last update timestamp |

#### attachments

File attachments.

| Column        | Type      | Description        |
| ------------- | --------- | ------------------ |
| id            | UUID (PK) | Primary key        |
| task_id       | UUID (FK) | Parent task        |
| user_id       | UUID (FK) | Uploader           |
| filename      | TEXT      | Storage filename   |
| original_name | TEXT      | Original filename  |
| storage_path  | TEXT      | Path in storage    |
| file_size     | INTEGER   | Size in bytes      |
| mime_type     | TEXT      | MIME type          |
| created_at    | TIMESTAMP | Creation timestamp |

#### activities

Audit log for boards.

| Column     | Type      | Description        |
| ---------- | --------- | ------------------ |
| id         | UUID (PK) | Primary key        |
| board_id   | UUID (FK) | Board              |
| task_id    | UUID (FK) | Related task       |
| user_id    | UUID (FK) | User who acted     |
| action     | TEXT      | Action type        |
| details    | JSONB     | Action details     |
| created_at | TIMESTAMP | Creation timestamp |

#### notifications

User notifications.

| Column     | Type      | Description        |
| ---------- | --------- | ------------------ |
| id         | UUID (PK) | Primary key        |
| user_id    | UUID (FK) | Recipient          |
| type       | TEXT      | Notification type  |
| title      | TEXT      | Title              |
| message    | TEXT      | Message body       |
| board_id   | UUID (FK) | Related board      |
| task_id    | UUID (FK) | Related task       |
| read_at    | TIMESTAMP | When read          |
| created_at | TIMESTAMP | Creation timestamp |

#### board_templates

Pre-built board templates.

| Column      | Type      | Description        |
| ----------- | --------- | ------------------ |
| id          | UUID (PK) | Primary key        |
| name        | TEXT      | Template name      |
| description | TEXT      | Description        |
| icon        | TEXT      | Emoji icon         |
| statuses    | JSONB     | Array of statuses  |
| is_public   | BOOLEAN   | Publicly available |
| created_by  | UUID (FK) | Creator            |
| created_at  | TIMESTAMP | Creation timestamp |

---

## Row Level Security (RLS)

All tables have RLS enabled. Key policies:

### Boards

- Users can view boards they own
- Users can view boards they're members of
- Users can only create/update/delete their own boards
- Board admins can update shared boards

### Tasks

- Users can view tasks on boards they have access to
- Board owners and members (admin/member role) can manage tasks
- Viewers can only read tasks

### Comments & Attachments

- Users can view comments/attachments on accessible tasks
- Users can only edit/delete their own comments/attachments

### Notifications

- Users can only see their own notifications

---

## Indexes

Performance indexes are created on:

```sql
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_statuses_board_id ON statuses(board_id);
CREATE INDEX idx_tasks_board_id ON tasks(board_id);
CREATE INDEX idx_tasks_status_id ON tasks(status_id);
CREATE INDEX idx_board_members_board_id ON board_members(board_id);
CREATE INDEX idx_board_members_user_id ON board_members(user_id);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_attachments_task_id ON attachments(task_id);
CREATE INDEX idx_activities_board_id ON activities(board_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
```

---

## Storage

### Attachments Bucket

Files are stored in the `attachments` bucket with the following policies:

- **Upload**: Authenticated users can upload
- **View**: Authenticated users can view
- **Delete**: Users can delete their own files

Files are accessed via signed URLs for security.

---

## Migrations

### Initial Setup

Run the full migration SQL from [DEPLOYMENT.md](./DEPLOYMENT.md#2-run-database-migrations).

### Adding New Fields

For backwards-compatible changes:

1. Add column with DEFAULT value
2. Deploy application
3. No migration needed - PostgreSQL handles missing values

### Breaking Changes

For non-backwards-compatible changes:

1. Create migration SQL
2. Test on development
3. Backup production
4. Run migration
5. Deploy application

---

## Triggers

### Auto-create Profile

A trigger automatically creates a profile when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Default Templates

Four default board templates are included:

| Template         | Columns                                               |
| ---------------- | ----------------------------------------------------- |
| Kanban           | Backlog → Todo → In Progress → Done                   |
| Scrum Sprint     | Sprint Backlog → In Dev → Review → Testing → Done     |
| Bug Tracking     | Reported → Confirmed → In Progress → Fixed → Verified |
| Content Pipeline | Ideas → Drafting → Review → Published                 |

---

## Backup & Restore

### Supabase Dashboard

1. Go to Project Settings → Database
2. Use built-in backup features
3. Point-in-time recovery available on Pro plans

### Manual Export

```bash
# Export via pg_dump
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" > backup.sql
```

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated:** 2026-01-14
