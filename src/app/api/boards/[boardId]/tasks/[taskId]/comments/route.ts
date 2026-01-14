import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/boards/[boardId]/tasks/[taskId]/comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: comments, error } = await supabase
      .from('comments')
      .select(
        `
        *,
        profile:profiles(id, email, display_name, avatar_url)
      `
      )
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/boards/[boardId]/tasks/[taskId]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; taskId: string }> }
) {
  try {
    const { boardId, taskId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        content: content.trim(),
      })
      .select(
        `
        *,
        profile:profiles(id, email, display_name, avatar_url)
      `
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('activities').insert({
      board_id: boardId,
      task_id: taskId,
      user_id: user.id,
      action: 'comment_added',
      details: { comment_id: comment.id },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
