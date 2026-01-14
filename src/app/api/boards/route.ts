import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/boards - List all boards for current user (owned + shared)
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get owned boards
    const { data: ownedBoards, error: ownedError } = await supabase
      .from('boards')
      .select(
        `
        *,
        statuses:statuses(count),
        tasks:tasks(count)
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ownedError) {
      console.error('Error fetching owned boards:', ownedError);
      return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
    }

    // Get shared boards
    const { data: sharedMemberships, error: sharedError } = await supabase
      .from('board_members')
      .select(
        `
        role,
        board:boards(
          *,
          statuses:statuses(count),
          tasks:tasks(count)
        )
      `
      )
      .eq('user_id', user.id);

    if (sharedError) {
      console.error('Error fetching shared boards:', sharedError);
    }

    // Transform owned boards
    const transformedOwned = (ownedBoards || []).map((board) => ({
      ...board,
      statuses_count: board.statuses?.[0]?.count || 0,
      tasks_count: board.tasks?.[0]?.count || 0,
      statuses: undefined,
      tasks: undefined,
      role: 'owner' as const,
      is_shared: false,
    }));

    // Transform shared boards
    const transformedShared = (sharedMemberships || [])
      .filter((m) => m.board)
      .map((m) => {
        const board = m.board as Record<string, unknown>;
        return {
          ...board,
          statuses_count: (board.statuses as Array<{ count: number }>)?.[0]?.count || 0,
          tasks_count: (board.tasks as Array<{ count: number }>)?.[0]?.count || 0,
          statuses: undefined,
          tasks: undefined,
          role: m.role,
          is_shared: true,
        };
      });

    // Combine and sort by created_at
    type BoardWithMeta = { created_at?: unknown; [key: string]: unknown };
    const allBoards = [...transformedOwned, ...transformedShared].sort(
      (a, b) =>
        new Date((b as BoardWithMeta).created_at as string).getTime() -
        new Date((a as BoardWithMeta).created_at as string).getTime()
    );

    return NextResponse.json({ boards: allBoards });
  } catch (error) {
    console.error('Error in GET /api/boards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/boards - Create a new board
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, template_id } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
    }

    // Get template statuses if template_id provided
    let statusesToCreate = [
      { name: 'Backlog', color: '#6B7280', order: 0 },
      { name: 'Todo', color: '#3B82F6', order: 1 },
      { name: 'In Progress', color: '#F59E0B', order: 2 },
      { name: 'Done', color: '#10B981', order: 3 },
    ];

    if (template_id) {
      const { data: template } = await supabase
        .from('board_templates')
        .select('statuses')
        .eq('id', template_id)
        .single();

      if (template?.statuses && Array.isArray(template.statuses)) {
        statusesToCreate = template.statuses as typeof statusesToCreate;
      }
    }

    // Create board
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (boardError) {
      console.error('Error creating board:', boardError);
      return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
    }

    // Create statuses from template
    const { error: statusError } = await supabase.from('statuses').insert(
      statusesToCreate.map((status) => ({
        board_id: board.id,
        name: status.name,
        color: status.color,
        order: status.order,
      }))
    );

    if (statusError) {
      console.error('Error creating statuses:', statusError);
    }

    // Log activity
    await supabase.from('activities').insert({
      board_id: board.id,
      user_id: user.id,
      action: 'board_created',
      details: { template_id: template_id || null },
    });

    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/boards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
