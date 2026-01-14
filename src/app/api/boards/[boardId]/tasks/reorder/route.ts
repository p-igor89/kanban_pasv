import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ boardId: string }> };

interface TaskReorderItem {
  id: string;
  status_id: string;
  order: number;
}

// PATCH /api/boards/[boardId]/tasks/reorder - Batch reorder tasks
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { tasks } = body;

    // Validation
    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Tasks must be an array' }, { status: 400 });
    }

    for (const item of tasks) {
      if (!item.id || !item.status_id || typeof item.order !== 'number') {
        return NextResponse.json(
          { error: 'Each task must have id, status_id, and order' },
          { status: 400 }
        );
      }
    }

    // Update all tasks in parallel
    const updates = tasks.map((item: TaskReorderItem) =>
      supabase
        .from('tasks')
        .update({
          status_id: item.status_id,
          order: item.order,
        })
        .eq('id', item.id)
        .eq('board_id', boardId)
    );

    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Errors reordering tasks:', errors);
      return NextResponse.json({ error: 'Failed to reorder some tasks' }, { status: 500 });
    }

    // Fetch updated tasks
    const { data: updatedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('status_id')
      .order('order', { ascending: true });

    return NextResponse.json({ tasks: updatedTasks });
  } catch (error) {
    console.error('Error in PATCH /api/boards/[boardId]/tasks/reorder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
