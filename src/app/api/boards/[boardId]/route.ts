import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authorizeBoard, handleAuthError } from '@/lib/security/authMiddleware';

type RouteParams = { params: Promise<{ boardId: string }> };

// GET /api/boards/[boardId] - Get board with all statuses and tasks
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId } = await params;

    // Authorize user for board read access
    const { role: userRole } = await authorizeBoard(boardId, 'board:read');

    // Fetch board data
    const supabase = await createClient();
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
    // Check if it's an auth error
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error.name === 'AuthenticationError' || error.name === 'AuthorizationError')
    ) {
      return handleAuthError(error);
    }

    // Other errors
    console.error('Error in GET /api/boards/[boardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/boards/[boardId] - Update board
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId } = await params;

    // Authorize user for board update
    await authorizeBoard(boardId, 'board:update');

    const supabase = await createClient();
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
    // Check if it's an auth error
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error.name === 'AuthenticationError' || error.name === 'AuthorizationError')
    ) {
      return handleAuthError(error);
    }

    // Other errors
    console.error('Error in PUT /api/boards/[boardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/boards/[boardId] - Delete board (cascades to statuses and tasks)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId } = await params;

    // Authorize user for board deletion (only owner can delete)
    await authorizeBoard(boardId, 'board:delete');

    const supabase = await createClient();
    const { error } = await supabase.from('boards').delete().eq('id', boardId);

    if (error) {
      console.error('Error deleting board:', error);
      return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Check if it's an auth error
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error.name === 'AuthenticationError' || error.name === 'AuthorizationError')
    ) {
      return handleAuthError(error);
    }

    // Other errors
    console.error('Error in DELETE /api/boards/[boardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
