import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Build query with optional filters
    let query = supabase.from('tasks').select('*').eq('board_id', boardId);

    // Filter by status
    const statusId = searchParams.get('status_id');
    if (statusId) {
      query = query.eq('status_id', statusId);
    }

    // Filter by priority
    const priority = searchParams.get('priority');
    const validPriorities = ['low', 'medium', 'high', 'critical'] as const;
    if (priority && validPriorities.includes(priority as (typeof validPriorities)[number])) {
      query = query.eq('priority', priority as (typeof validPriorities)[number]);
    }

    // Search in title and description
    const search = searchParams.get('search');
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
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

    const body = await request.json();
    const {
      title,
      description,
      status_id,
      priority,
      tags,
      assignee_name,
      assignee_color,
      due_date,
    } = body;

    // Validation
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Title must be 200 characters or less' }, { status: 400 });
    }

    if (!status_id) {
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 });
    }

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

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Priority must be one of: low, medium, high, critical' },
        { status: 400 }
      );
    }

    // Validate tags
    if (tags && (!Array.isArray(tags) || tags.length > 10)) {
      return NextResponse.json(
        { error: 'Tags must be an array with max 10 items' },
        { status: 400 }
      );
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
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || null,
        tags: tags || [],
        assignee_name: assignee_name?.trim() || null,
        assignee_color: assignee_color || null,
        due_date: due_date || null,
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
