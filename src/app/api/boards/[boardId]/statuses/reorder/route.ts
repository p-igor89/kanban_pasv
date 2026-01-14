import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ boardId: string }> };

// PATCH /api/boards/[boardId]/statuses/reorder - Reorder statuses
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
    const { statuses } = body;

    // Validation
    if (!Array.isArray(statuses)) {
      return NextResponse.json({ error: 'Statuses must be an array' }, { status: 400 });
    }

    for (const item of statuses) {
      if (!item.id || typeof item.order !== 'number') {
        return NextResponse.json({ error: 'Each status must have id and order' }, { status: 400 });
      }
    }

    // Update all statuses in parallel
    const updates = statuses.map((item: { id: string; order: number }) =>
      supabase
        .from('statuses')
        .update({ order: item.order })
        .eq('id', item.id)
        .eq('board_id', boardId)
    );

    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Errors updating statuses:', errors);
      return NextResponse.json({ error: 'Failed to reorder some statuses' }, { status: 500 });
    }

    // Fetch updated statuses
    const { data: updatedStatuses } = await supabase
      .from('statuses')
      .select('*')
      .eq('board_id', boardId)
      .order('order', { ascending: true });

    return NextResponse.json({ statuses: updatedStatuses });
  } catch (error) {
    console.error('Error in PATCH /api/boards/[boardId]/statuses/reorder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
