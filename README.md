# Admin Panel (Kanban Board)

[![CI](https://github.com/29DianaYakubuk/adminPanel/actions/workflows/ci.yml/badge.svg)](https://github.com/29DianaYakubuk/adminPanel/actions/workflows/ci.yml)
[![PR Checks](https://github.com/29DianaYakubuk/adminPanel/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/29DianaYakubuk/adminPanel/actions/workflows/pr-checks.yml)

A Jira-style admin panel with a Kanban board for task management.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **MongoDB** + Mongoose
- **@dnd-kit** (Drag & Drop)
- **Tailwind CSS**

## Project Structure

```
src/
├── app/
│   ├── api/tasks/          # API endpoints
│   │   ├── route.ts        # GET, POST /api/tasks
│   │   └── [id]/route.ts   # PATCH /api/tasks/:id
│   ├── about/              # About page
│   ├── privacy/            # Privacy Policy page
│   ├── terms/              # Terms & Conditions page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (Board)
├── components/
│   ├── Board.tsx           # Kanban board
│   ├── Column.tsx          # Board column
│   ├── TaskCard.tsx        # Task card
│   └── CreateTaskModal.tsx # Modal for creating tasks
├── lib/
│   └── mongodb.ts          # MongoDB connection
├── models/
│   └── Task.ts             # Mongoose Task model
└── types/
    └── task.ts             # TypeScript types
```

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd adminPanel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

**Important:** If using MongoDB Atlas, add your IP to Network Access:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Network Access → Add IP Address
3. Add your IP or `0.0.0.0/0` for access from anywhere

To find your IP:

```bash
curl -s ipv4.icanhazip.com
```

### 4. Run the project

```bash
npm run dev
```

Open http://localhost:3000

## API Endpoints

| Method | Endpoint         | Description                |
| ------ | ---------------- | -------------------------- |
| GET    | `/api/tasks`     | Get all tasks              |
| POST   | `/api/tasks`     | Create a task              |
| PATCH  | `/api/tasks/:id` | Update task (status/order) |

## Kanban Columns

- **Backlog** - new tasks
- **Todo** - planned tasks
- **In Progress** - tasks in progress
- **Done** - completed tasks

## Pages

- `/` - Kanban Board (main page)
- `/about` - About the product
- `/terms` - Terms & Conditions
- `/privacy` - Privacy Policy

## Scripts

```bash
npm run dev      # Development server (port 3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## Specification

Full technical specification: [Google Doc](https://docs.google.com/document/d/1fOKsgpbshaWnJS43doW-d9mQguxnTFEUo7y4iC3rqzY)

### MVP Requirements

- [x] MongoDB connection
- [x] CRUD operations for tasks
- [x] Kanban board display
- [x] Drag & Drop between columns
- [x] State persistence across page reloads

### Task Model

| Field       | Type                                | Required |
| ----------- | ----------------------------------- | -------- |
| title       | string                              | yes      |
| description | string                              | no       |
| status      | Backlog / Todo / In Progress / Done | yes      |
| order       | number                              | yes      |
| createdAt   | Date                                | auto     |
| updatedAt   | Date                                | auto     |

### Development Phases

1. **Phase 1** - MVP basics (MongoDB, CRUD, board display)
2. **Phase 2** - Drag & Drop implementation
3. **Phase 3** - Error handling and UX refinement

### Definition of Done

- [x] User can create a task
- [x] Task appears in Backlog
- [x] Task can be dragged to another column
- [x] Status persists after page refresh

## Contributors

- Ihor Peretiatko

---
