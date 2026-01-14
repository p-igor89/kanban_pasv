import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ boardId: string }> };

// GET /api/boards/[boardId] - Get board with all statuses and tasks
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // First, try to get board if user is owner
    const { data: board, error } = await supabase
      .from('boards')
      .select(
        `
        *,
        statuses:statuses(
          *,
          tasks:tasks(*)
        )
      `
      )
      .eq('id', boardId)
      .single();

    if (error || !board) {
      if (error?.code === 'PGRST116' || !board) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }
      console.error('Error fetching board:', error);
      return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
    }

    // Determine user's role
    let userRole: 'owner' | 'admin' | 'member' | 'viewer' = 'viewer';

    if (board.user_id === user.id) {
      userRole = 'owner';
    } else {
      // Check if user is a member
      const { data: membership } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .single();

      if (membership) {
        userRole = membership.role;
      } else {
        // User has no access to this board
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }
    }

    // Sort statuses by order, and tasks within each status by order
    if (board.statuses) {
      board.statuses.sort((a, b) => a.order - b.order);
      board.statuses.forEach((status) => {
        if (status.tasks) {
          status.tasks.sort((a, b) => a.order - b.order);
        }
      });
    }

    return NextResponse.json({ board, userRole });
  } catch (error) {
    console.error('Error in GET /api/boards/[boardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/boards/[boardId] - Update board
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { name, description } = body;

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      if (name.length > 100) {
        return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
      }
    }

    const updateData: Record<string, string | null> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: board, error } = await supabase
      .from('boards')
      .update(updateData)
      .eq('id', boardId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }
      console.error('Error updating board:', error);
      return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
    }

    return NextResponse.json({ board });
  } catch (error) {
    console.error('Error in PUT /api/boards/[boardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/boards/[boardId] - Delete board (cascades to statuses and tasks)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting board:', error);
      return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/boards/[boardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
