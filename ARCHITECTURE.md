# KanbanPro Architecture

## Application Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KanbanPro                                       │
│                     Modern Kanban Board Application                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  Boards │  │  Tasks  │  │ Members │  │ Search  │  │Settings │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│       │            │            │            │            │                  │
│       └────────────┴────────────┴────────────┴────────────┘                  │
│                                 │                                            │
│                    ┌────────────┴────────────┐                               │
│                    │      Next.js App        │                               │
│                    │    (React + TypeScript) │                               │
│                    └────────────┬────────────┘                               │
│                                 │                                            │
│              ┌──────────────────┼──────────────────┐                         │
│              │                  │                  │                         │
│     ┌────────┴────────┐ ┌──────┴──────┐ ┌────────┴────────┐                 │
│     │   Supabase DB   │ │   Storage   │ │  Edge Functions │                 │
│     │  (PostgreSQL)   │ │   (Files)   │ │    (Emails)     │                 │
│     └─────────────────┘ └─────────────┘ └─────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## User Flow

```mermaid
flowchart TD
    A[🏠 Landing Page] --> B{Authenticated?}
    B -->|No| C[🔐 Login/Register]
    C --> D[✉️ Email Verification]
    D --> E[📋 Boards List]
    B -->|Yes| E

    E --> F[➕ Create Board]
    F --> G[📝 Select Template]
    G --> E

    E --> H[📋 Board Detail]
    H --> I[🎯 Manage Tasks]
    H --> J[👥 Invite Members]
    H --> K[📊 View Activity]

    I --> L[✏️ Edit Task]
    L --> M[💬 Comments]
    L --> N[📎 Attachments]
    L --> O[🏷️ Tags & Priority]

    E --> P[🔍 Global Search]
    P --> H

    E --> Q[🔔 Notifications]
    E --> R[⚙️ Settings]
```

---

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ BOARDS : owns
    USERS ||--o{ BOARD_MEMBERS : "is member of"
    USERS ||--o{ PROFILES : has
    USERS ||--o{ NOTIFICATIONS : receives

    BOARDS ||--o{ STATUSES : contains
    BOARDS ||--o{ TASKS : contains
    BOARDS ||--o{ BOARD_MEMBERS : has
    BOARDS ||--o{ ACTIVITIES : logs

    STATUSES ||--o{ TASKS : groups

    TASKS ||--o{ COMMENTS : has
    TASKS ||--o{ ATTACHMENTS : has

    BOARD_TEMPLATES ||--o{ BOARDS : "creates from"

    USERS {
        uuid id PK
        string email
        timestamp created_at
    }

    PROFILES {
        uuid id PK,FK
        string display_name
        string avatar_url
        jsonb notification_preferences
    }

    BOARDS {
        uuid id PK
        uuid user_id FK
        string name
        string description
        timestamp created_at
    }

    STATUSES {
        uuid id PK
        uuid board_id FK
        string name
        string color
        int order
    }

    TASKS {
        uuid id PK
        uuid board_id FK
        uuid status_id FK
        string title
        string description
        string priority
        timestamp due_date
        array tags
        int order
    }

    BOARD_MEMBERS {
        uuid id PK
        uuid board_id FK
        uuid user_id FK
        string role
    }

    COMMENTS {
        uuid id PK
        uuid task_id FK
        uuid user_id FK
        string content
    }

    ATTACHMENTS {
        uuid id PK
        uuid task_id FK
        uuid user_id FK
        string filename
        string file_path
    }

    ACTIVITIES {
        uuid id PK
        uuid board_id FK
        uuid user_id FK
        string action
        jsonb details
    }
```

---

## Component Architecture

```mermaid
flowchart TB
    subgraph Layout["🎨 Layout Components"]
        Header["Header<br/>━━━━━━━━━━<br/>• Logo<br/>• Search<br/>• Theme<br/>• Notifications<br/>• Settings<br/>• User Menu"]
        ThemeProvider["ThemeProvider<br/>━━━━━━━━━━<br/>• Dark/Light Mode"]
        AuthProvider["AuthProvider<br/>━━━━━━━━━━<br/>• User State<br/>• Sign In/Out"]
    end

    subgraph Pages["📄 Pages"]
        BoardsPage["Boards Page<br/>━━━━━━━━━━<br/>• Board Grid<br/>• Create Modal<br/>• Template Select"]
        BoardDetail["Board Detail<br/>━━━━━━━━━━<br/>• Kanban Columns<br/>• Drag & Drop<br/>• Task Cards"]
        Notifications["Notifications<br/>━━━━━━━━━━<br/>• Notification List<br/>• Mark as Read"]
        Settings["Settings<br/>━━━━━━━━━━<br/>• Profile<br/>• Email Prefs"]
    end

    subgraph Modals["🪟 Modals & Drawers"]
        TaskDrawer["TaskDrawer<br/>━━━━━━━━━━<br/>• Edit Task<br/>• Comments<br/>• Attachments"]
        MembersModal["MembersModal<br/>━━━━━━━━━━<br/>• Invite<br/>• Manage Roles"]
        ActivityModal["ActivityModal<br/>━━━━━━━━━━<br/>• History Log"]
        GlobalSearch["GlobalSearch<br/>━━━━━━━━━━<br/>• Search Tasks<br/>• Ctrl+K"]
    end

    Layout --> Pages
    Pages --> Modals
```

---

## API Routes

```
📁 /api
├── 📁 /boards
│   ├── GET     → List all boards (owned + shared)
│   ├── POST    → Create new board
│   │
│   └── 📁 /[boardId]
│       ├── GET     → Get board details
│       ├── PATCH   → Update board
│       ├── DELETE  → Delete board
│       │
│       ├── 📁 /activities
│       │   └── GET → Get activity history
│       │
│       ├── 📁 /members
│       │   ├── GET    → List members
│       │   ├── POST   → Invite member
│       │   └── 📁 /[memberId]
│       │       ├── PATCH  → Update role
│       │       └── DELETE → Remove member
│       │
│       ├── 📁 /statuses
│       │   ├── GET    → List statuses
│       │   ├── POST   → Create status
│       │   ├── 📁 /reorder
│       │   │   └── PATCH → Reorder statuses
│       │   └── 📁 /[statusId]
│       │       ├── PATCH  → Update status
│       │       └── DELETE → Delete status
│       │
│       └── 📁 /tasks
│           ├── GET    → List tasks
│           ├── POST   → Create task
│           ├── 📁 /reorder
│           │   └── PATCH → Reorder tasks
│           └── 📁 /[taskId]
│               ├── GET    → Get task
│               ├── PATCH  → Update task
│               ├── DELETE → Delete task
│               ├── 📁 /move
│               │   └── PATCH → Move to status
│               ├── 📁 /comments
│               │   ├── GET  → List comments
│               │   └── POST → Add comment
│               └── 📁 /attachments
│                   ├── GET    → List attachments
│                   ├── POST   → Upload file
│                   └── DELETE → Delete file
│
├── 📁 /notifications
│   ├── GET   → List notifications
│   └── PATCH → Mark as read
│
├── 📁 /profile
│   ├── GET   → Get profile
│   └── PATCH → Update profile
│
├── 📁 /search
│   └── GET → Global task search
│
└── 📁 /templates
    ├── GET  → List templates
    └── POST → Create template
```

---

## Feature Matrix

| Feature                    | Description                       | Status |
| -------------------------- | --------------------------------- | ------ |
| 🔐 **Authentication**      | Email/password with Supabase Auth | ✅     |
| 📋 **Boards**              | Create, edit, delete boards       | ✅     |
| 📊 **Kanban Columns**      | Custom statuses with colors       | ✅     |
| 🎯 **Tasks**               | Full CRUD with drag & drop        | ✅     |
| 🏷️ **Tags & Priority**     | Organize tasks                    | ✅     |
| 📅 **Due Dates**           | Task deadlines                    | ✅     |
| 👥 **Board Sharing**       | Invite members with roles         | ✅     |
| 💬 **Comments**            | Task discussions                  | ✅     |
| 📎 **Attachments**         | File uploads (10MB limit)         | ✅     |
| 📜 **Activity History**    | Audit log per board               | ✅     |
| 🔍 **Global Search**       | Search across all tasks           | ✅     |
| 📝 **Templates**           | Board templates                   | ✅     |
| 🌙 **Dark Mode**           | Theme switching                   | ✅     |
| 📱 **PWA**                 | Installable app                   | ✅     |
| 🔔 **Notifications**       | In-app notifications              | ✅     |
| ✉️ **Email Notifications** | Via Supabase Edge Functions       | ✅     |

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
├─────────────────────────────────────────────────────────────┤
│  Next.js 16      │  React 19       │  TypeScript           │
│  Tailwind CSS    │  Lucide Icons   │  React Hot Toast      │
│  @hello-pangea/dnd (Drag & Drop)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
├─────────────────────────────────────────────────────────────┤
│  Supabase                                                    │
│  ├── PostgreSQL (Database)                                  │
│  ├── Auth (Authentication)                                  │
│  ├── Storage (File uploads)                                 │
│  ├── Edge Functions (Email)                                 │
│  └── Row Level Security (RLS)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Deployment                             │
├─────────────────────────────────────────────────────────────┤
│  Vercel          │  Supabase Cloud  │  Resend (Email)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Security

```mermaid
flowchart LR
    subgraph Client["🌐 Client"]
        Browser["Browser"]
    end

    subgraph Auth["🔐 Authentication"]
        JWT["JWT Token"]
        Session["Session"]
    end

    subgraph API["🛡️ API Layer"]
        Middleware["Auth Middleware"]
        Validation["Input Validation"]
    end

    subgraph DB["🗄️ Database"]
        RLS["Row Level Security"]
        Policies["Access Policies"]
    end

    Browser --> JWT
    JWT --> Session
    Session --> Middleware
    Middleware --> Validation
    Validation --> RLS
    RLS --> Policies
```

### Row Level Security (RLS)

- **Boards**: Users see only owned + shared boards
- **Tasks**: Access based on board membership
- **Comments**: Users can edit/delete own comments
- **Attachments**: Users can delete own attachments
- **Notifications**: Users see only their notifications

---

## Performance Optimizations

| Optimization           | Implementation                     |
| ---------------------- | ---------------------------------- |
| **Static Generation**  | Landing, Login, Register pages     |
| **Dynamic Rendering**  | Board pages with real-time data    |
| **Code Splitting**     | Automatic by Next.js               |
| **Image Optimization** | Next.js Image component            |
| **Database Indexes**   | On foreign keys and common queries |
| **Caching**            | Service Worker for offline support |

---

## Directory Structure

```
kanban_pasv/
├── 📁 e2e/                    # E2E tests (Playwright)
├── 📁 public/
│   ├── 📁 icons/              # PWA icons
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker
├── 📁 src/
│   ├── 📁 app/
│   │   ├── 📁 (dashboard)/    # Protected routes
│   │   │   ├── boards/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   ├── 📁 api/            # API routes
│   │   ├── 📁 auth/           # Auth callback
│   │   ├── login/
│   │   ├── register/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── 📁 components/
│   │   ├── 📁 board/          # Board components
│   │   ├── GlobalSearch.tsx
│   │   ├── Header.tsx
│   │   └── ...
│   ├── 📁 contexts/           # React contexts
│   ├── 📁 lib/                # Utilities
│   └── 📁 types/              # TypeScript types
├── 📁 supabase/
│   └── 📁 functions/          # Edge Functions
├── .env.example
├── ARCHITECTURE.md            # This file
├── DATABASE.md
├── DEPLOYMENT.md
└── README.md
```

---

## Quick Start

```bash
# 1. Clone & Install
git clone <repo>
cd kanban_pasv
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Run locally
npm run dev

# 4. Open browser
open http://localhost:3000
```

---

<div align="center">

**Built with ❤️ using Next.js + Supabase**

[Live Demo](https://kanbanpro.vercel.app) · [Documentation](./DEPLOYMENT.md) · [Report Bug](https://github.com/issues)

</div>
