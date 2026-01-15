import { createClient } from '@/lib/supabase/server';
import type { Task } from '@/types/board';

interface BoardExportData {
  board: {
    name: string;
    description: string | null;
  };
  statuses: {
    name: string;
    color: string;
    tasks: {
      title: string;
      description: string | null;
      priority: string | null;
      tags: string[];
      assignee: string | null;
      dueDate: string | null;
      createdAt: string;
    }[];
  }[];
  exportedAt: string;
}

/**
 * Fetch board data for export
 */
export async function getBoardExportData(
  boardId: string,
  userId: string
): Promise<{ data: BoardExportData | null; error: string | null }> {
  const supabase = await createClient();

  // Verify user has access to board
  const { data: member } = await supabase
    .from('board_members')
    .select('role')
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .single();

  if (!member) {
    return { data: null, error: 'Access denied' };
  }

  // Get board with statuses and tasks
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('name, description')
    .eq('id', boardId)
    .single();

  if (boardError || !board) {
    return { data: null, error: 'Board not found' };
  }

  const { data: statuses, error: statusError } = await supabase
    .from('statuses')
    .select('id, name, color, order')
    .eq('board_id', boardId)
    .order('order');

  if (statusError) {
    return { data: null, error: 'Failed to fetch statuses' };
  }

  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('board_id', boardId)
    .order('order');

  if (taskError) {
    return { data: null, error: 'Failed to fetch tasks' };
  }

  // Group tasks by status
  const tasksByStatus = (tasks || []).reduce(
    (acc, task) => {
      if (!acc[task.status_id]) acc[task.status_id] = [];
      acc[task.status_id].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  return {
    data: {
      board: {
        name: board.name,
        description: board.description,
      },
      statuses: (statuses || []).map((status) => ({
        name: status.name,
        color: status.color,
        tasks: (tasksByStatus[status.id] || []).map((task) => ({
          title: task.title,
          description: task.description,
          priority: task.priority,
          tags: task.tags || [],
          assignee: task.assignee_name,
          dueDate: task.due_date,
          createdAt: task.created_at,
        })),
      })),
      exportedAt: new Date().toISOString(),
    },
    error: null,
  };
}

/**
 * Convert board data to CSV format
 */
export function boardToCSV(data: BoardExportData): string {
  const rows: string[][] = [];

  // Header row
  rows.push([
    'Status',
    'Title',
    'Description',
    'Priority',
    'Tags',
    'Assignee',
    'Due Date',
    'Created At',
  ]);

  // Data rows
  for (const status of data.statuses) {
    for (const task of status.tasks) {
      rows.push([
        status.name,
        task.title,
        task.description || '',
        task.priority || '',
        task.tags.join(', '),
        task.assignee || '',
        task.dueDate || '',
        task.createdAt,
      ]);
    }
  }

  // Convert to CSV string
  return rows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if needed
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Generate HTML for PDF export
 */
export function boardToHTML(data: BoardExportData): string {
  const statusColumns = data.statuses
    .map(
      (status) => `
      <div class="status-column">
        <div class="status-header" style="background-color: ${status.color}20; border-left: 4px solid ${status.color};">
          <h3 style="color: ${status.color};">${escapeHtml(status.name)}</h3>
          <span class="task-count">${status.tasks.length} tasks</span>
        </div>
        <div class="tasks">
          ${status.tasks
            .map(
              (task) => `
            <div class="task-card">
              <h4>${escapeHtml(task.title)}</h4>
              ${task.description ? `<p class="description">${escapeHtml(task.description)}</p>` : ''}
              <div class="task-meta">
                ${task.priority ? `<span class="priority priority-${task.priority}">${task.priority}</span>` : ''}
                ${task.assignee ? `<span class="assignee">👤 ${escapeHtml(task.assignee)}</span>` : ''}
                ${task.dueDate ? `<span class="due-date">📅 ${formatDate(task.dueDate)}</span>` : ''}
              </div>
              ${task.tags.length > 0 ? `<div class="tags">${task.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(data.board.name)} - Board Export</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f9fafb; }
        .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
        .header h1 { font-size: 24px; color: #111827; margin-bottom: 8px; }
        .header p { color: #6b7280; }
        .export-info { font-size: 12px; color: #9ca3af; margin-top: 8px; }
        .board-container { display: flex; gap: 16px; flex-wrap: wrap; }
        .status-column { flex: 1; min-width: 280px; max-width: 350px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .status-header { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
        .status-header h3 { font-size: 14px; font-weight: 600; }
        .task-count { font-size: 12px; color: #6b7280; }
        .tasks { padding: 8px; }
        .task-card { background: #f9fafb; border-radius: 6px; padding: 12px; margin-bottom: 8px; border: 1px solid #e5e7eb; }
        .task-card h4 { font-size: 14px; color: #111827; margin-bottom: 6px; }
        .task-card .description { font-size: 12px; color: #6b7280; margin-bottom: 8px; line-height: 1.4; }
        .task-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-bottom: 6px; }
        .priority { padding: 2px 6px; border-radius: 4px; font-weight: 500; }
        .priority-low { background: #d1fae5; color: #065f46; }
        .priority-medium { background: #fef3c7; color: #92400e; }
        .priority-high { background: #fee2e2; color: #991b1b; }
        .priority-critical { background: #fecaca; color: #7f1d1d; }
        .tags { display: flex; gap: 4px; flex-wrap: wrap; }
        .tag { background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        @media print {
          body { background: white; padding: 0; }
          .status-column { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(data.board.name)}</h1>
        ${data.board.description ? `<p>${escapeHtml(data.board.description)}</p>` : ''}
        <div class="export-info">Exported on ${formatDate(data.exportedAt)}</div>
      </div>
      <div class="board-container">
        ${statusColumns}
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
