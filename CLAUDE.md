# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KanbanPro is a Jira-style Kanban board for task management built with Next.js 16 (App Router), React 19, TypeScript, MongoDB/Mongoose, and Tailwind CSS 4. Features drag-and-drop via @dnd-kit, dark/light themes, and responsive design.

## Common Commands

```bash
npm run dev              # Start dev server (port 3000, Turbopack)
npm run build            # Production build
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format
npm run type-check       # TypeScript validation
npm run test             # Jest unit tests
npm run test:watch       # Jest watch mode
npm run test:coverage    # Tests with coverage report
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # E2E with interactive UI
npm run validate         # Full validation (lint, types, test, build)
npm run db:seed          # Seed MongoDB with sample data
```

To run a single test file:

```bash
npx jest src/components/__tests__/Board.test.tsx
npx jest --testPathPattern="taskUtils"
```

## Architecture

### API Routes (`src/app/api/tasks/`)

- `route.ts` - GET (list with pagination/filtering) and POST (create task)
- `[id]/route.ts` - PATCH (update) and DELETE (remove task)

Query params for GET: `page`, `limit`, `status`, `priority`, `search`, `assignee`, `dueBefore`, `dueAfter`, `sortBy`, `sortOrder`

### Component Patterns

- Client components use `'use client'` directive (Board, Column, TaskCard)
- Modals (CreateTaskModal, TaskDetailsDrawer) are lazy-loaded with React.lazy/Suspense
- ThemeProvider handles dark/light mode context
- Board component is the main state owner with computed groups via useMemo

### Data Flow

- Board component holds all task state and passes callbacks to children
- Optimistic updates: UI updates immediately, rolls back on API error
- Drag-and-drop uses @dnd-kit with automatic status updates when moving between columns

### Database (`src/models/`)

- Task model with indexes optimized for status+order, priority, dueDate, and text search
- Mongoose connection caching in `src/lib/mongodb.ts` for serverless optimization

### Security (`src/lib/`)

- `validation.ts` - Request field validation
- `sanitize.ts` - Input sanitization before DB operations
- `rateLimit.ts` - In-memory rate limiting (100 reads/60s, 30 writes/60s)

## Task Schema

```typescript
{
  title: string;           // Required, max 200 chars
  description?: string;    // Max 2000 chars
  status: 'Backlog' | 'Todo' | 'In Progress' | 'Done';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];         // Max 10 tags, 50 chars each
  assignee?: { name: string; color: string };
  dueDate?: Date;
  order: number;           // Position within column
}
```

## Code Style

- ESLint with strict TypeScript rules (no-unused-vars, no-explicit-any)
- Prettier: 100 char width, single quotes, trailing commas (ES5), semicolons
- Pre-commit hooks run lint-staged and type-check via Husky
- Path alias: `@/*` maps to `./src/*`

## Environment Variables

Required:

- `MONGODB_URI` - MongoDB connection string

Optional:

- `ALLOWED_ORIGIN` - CORS origin (default: http://localhost:3003)
- `ANALYZE=true` - Enable bundle analysis during build
