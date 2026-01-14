import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ boardId: string }> };

// GET /api/boards/[boardId]/statuses - List all statuses for a board
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

    const { data: statuses, error } = await supabase
      .from('statuses')
      .select('*')
      .eq('board_id', boardId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching statuses:', error);
      return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
    }

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Error in GET /api/boards/[boardId]/statuses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/boards/[boardId]/statuses - Create a new status
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
    const { name, color } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color (e.g., #FF0000)' },
        { status: 400 }
      );
    }

    // Get next order
    const { data: maxOrder } = await supabase
      .from('statuses')
      .select('order')
      .eq('board_id', boardId)
      .order('order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.order ?? -1) + 1;

    const { data: status, error } = await supabase
      .from('statuses')
      .insert({
        board_id: boardId,
        name: name.trim(),
        color: color || '#6B7280',
        order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating status:', error);
      return NextResponse.json({ error: 'Failed to create status' }, { status: 500 });
    }

    return NextResponse.json({ status }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/boards/[boardId]/statuses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
