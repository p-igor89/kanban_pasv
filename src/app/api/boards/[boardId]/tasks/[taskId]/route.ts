import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ boardId: string; taskId: string }> };

// GET /api/boards/[boardId]/tasks/[taskId] - Get single task
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId, taskId } = await params;
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

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('board_id', boardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      console.error('Error fetching task:', error);
      return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error in GET /api/boards/[boardId]/tasks/[taskId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/boards/[boardId]/tasks/[taskId] - Update task
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId, taskId } = await params;
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
    const { title, description, priority, tags, assignee_name, assignee_color, due_date } = body;

    // Validation
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      if (title.length > 200) {
        return NextResponse.json(
          { error: 'Title must be 200 characters or less' },
          { status: 400 }
        );
      }
    }

    const validPriorities = ['low', 'medium', 'high', 'critical', null];
    if (priority !== undefined && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Priority must be one of: low, medium, high, critical, or null' },
        { status: 400 }
      );
    }

    if (tags !== undefined && (!Array.isArray(tags) || tags.length > 10)) {
      return NextResponse.json(
        { error: 'Tags must be an array with max 10 items' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority !== undefined) updateData.priority = priority;
    if (tags !== undefined) updateData.tags = tags;
    if (assignee_name !== undefined) updateData.assignee_name = assignee_name?.trim() || null;
    if (assignee_color !== undefined) updateData.assignee_color = assignee_color || null;
    if (due_date !== undefined) updateData.due_date = due_date || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('board_id', boardId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      console.error('Error updating task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error in PUT /api/boards/[boardId]/tasks/[taskId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/boards/[boardId]/tasks/[taskId] - Delete task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId, taskId } = await params;
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

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('board_id', boardId);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/boards/[boardId]/tasks/[taskId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
