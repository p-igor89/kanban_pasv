import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ boardId: string; taskId: string }> };

// PATCH /api/boards/[boardId]/tasks/[taskId]/move - Move task to different status/position
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { status_id, order } = body;

    // Validation
    if (!status_id) {
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 });
    }

    if (typeof order !== 'number' || order < 0) {
      return NextResponse.json({ error: 'Order must be a non-negative number' }, { status: 400 });
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

    // Verify task exists
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('board_id', boardId)
      .single();

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Simple update - let the client handle order calculations
    // For complex reordering, use the batch /tasks/reorder endpoint
    const { data: task, error } = await supabase
      .from('tasks')
      .update({
        status_id,
        order,
      })
      .eq('id', taskId)
      .eq('board_id', boardId)
      .select()
      .single();

    if (error) {
      console.error('Error moving task:', error);
      return NextResponse.json({ error: 'Failed to move task' }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error in PATCH /api/boards/[boardId]/tasks/[taskId]/move:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
