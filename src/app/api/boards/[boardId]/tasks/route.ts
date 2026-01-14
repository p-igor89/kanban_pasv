import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  CreateTaskSchema,
  TaskListQuerySchema,
  validateRequestBody,
  validateSearchParams,
} from '@/lib/validation';
import { sanitizeSearchInput, enforceRateLimit, rateLimitConfigs } from '@/lib/security';

type RouteParams = { params: Promise<{ boardId: string }> };

// GET /api/boards/[boardId]/tasks - List all tasks for a board
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting for read operations
    try {
      enforceRateLimit(user.id, rateLimitConfigs.api.read, 'tasks:read');
    } catch (error) {
      if ((error as Error & { code?: string }).code === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
      throw error;
    }

    // Verify board belongs to user
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('id', boardId)
      .eq('user_id', user.id)
      .single();

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Validate search params using Zod
    const validation = validateSearchParams(TaskListQuerySchema, searchParams);
    if (!validation.success) {
      return validation.error;
    }

    const { status_id, priority, search } = validation.data;

    // Build query with optional filters
    let query = supabase.from('tasks').select('*').eq('board_id', boardId);

    // Filter by status
    if (status_id) {
      query = query.eq('status_id', status_id);
    }

    // Filter by priority
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Search in title and description with sanitized input
    if (search) {
      const sanitizedSearch = sanitizeSearchInput(search);
      query = query.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
    }

    // Order by status_id and order
    query = query.order('status_id').order('order', { ascending: true });

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error in GET /api/boards/[boardId]/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/boards/[boardId]/tasks - Create a new task
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting for write operations
    try {
      enforceRateLimit(user.id, rateLimitConfigs.api.write, 'tasks:write');
    } catch (error) {
      if ((error as Error & { code?: string }).code === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
      throw error;
    }

    // Verify board belongs to user
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('id', boardId)
      .eq('user_id', user.id)
      .single();

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Validate request body using Zod schema
    const validation = await validateRequestBody(CreateTaskSchema, request);
    if (!validation.success) {
      return validation.error;
    }

    const { title, description, status_id, priority, tags, assignee_name, assignee_color, due_date } =
      validation.data;

    // Verify status belongs to this board
    const { data: status } = await supabase
      .from('statuses')
      .select('id')
      .eq('id', status_id)
      .eq('board_id', boardId)
      .single();

    if (!status) {
      return NextResponse.json({ error: 'Status not found in this board' }, { status: 400 });
    }

    // Get next order for this status
    const { data: maxOrder } = await supabase
      .from('tasks')
      .select('order')
      .eq('status_id', status_id)
      .order('order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.order ?? -1) + 1;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        board_id: boardId,
        status_id,
        title,
        description,
        priority,
        tags,
        assignee_name,
        assignee_color,
        due_date,
        order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/boards/[boardId]/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
