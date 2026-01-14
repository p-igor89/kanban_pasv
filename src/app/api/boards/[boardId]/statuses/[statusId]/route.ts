import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ boardId: string; statusId: string }> };

// PUT /api/boards/[boardId]/statuses/[statusId] - Update status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId, statusId } = await params;
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
    const { name, color, order } = body;

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      if (name.length > 100) {
        return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
      }
    }

    if (color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color (e.g., #FF0000)' },
        { status: 400 }
      );
    }

    if (order !== undefined && (typeof order !== 'number' || order < 0)) {
      return NextResponse.json({ error: 'Order must be a non-negative number' }, { status: 400 });
    }

    const updateData: Record<string, string | number> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;
    if (order !== undefined) updateData.order = order;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: status, error } = await supabase
      .from('statuses')
      .update(updateData)
      .eq('id', statusId)
      .eq('board_id', boardId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Status not found' }, { status: 404 });
      }
      console.error('Error updating status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error in PUT /api/boards/[boardId]/statuses/[statusId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/boards/[boardId]/statuses/[statusId] - Delete status
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId, statusId } = await params;
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

    // Check if status has tasks
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', statusId);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete status with tasks. Move or delete tasks first.' },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('statuses')
      .delete()
      .eq('id', statusId)
      .eq('board_id', boardId);

    if (error) {
      console.error('Error deleting status:', error);
      return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/boards/[boardId]/statuses/[statusId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
