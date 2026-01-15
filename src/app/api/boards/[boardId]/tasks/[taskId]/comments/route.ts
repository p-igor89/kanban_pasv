import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyOnComment } from '@/services/notificationService';

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
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch profiles separately
    const userIds = [...new Set((comments || []).map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .in('id', userIds);

    const commentsWithProfiles = (comments || []).map((comment) => ({
      ...comment,
      profile: profiles?.find((p) => p.id === comment.user_id) || null,
    }));

    return NextResponse.json({ comments: commentsWithProfiles });
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
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch profile for the comment author
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    const commentWithProfile = { ...comment, profile };

    // Log activity
    await supabase.from('activities').insert({
      board_id: boardId,
      task_id: taskId,
      user_id: user.id,
      action: 'comment_added',
      details: { comment_id: comment.id },
    });

    // Send notifications (async, don't block response)
    (async () => {
      try {
        // Get board and task info for notification
        const [boardResult, taskResult] = await Promise.all([
          supabase.from('boards').select('name').eq('id', boardId).single(),
          supabase.from('tasks').select('title').eq('id', taskId).single(),
        ]);

        if (boardResult.data && taskResult.data) {
          await notifyOnComment({
            boardId,
            taskId,
            taskTitle: taskResult.data.title,
            boardName: boardResult.data.name,
            commenterId: user.id,
            commenterName: profile?.display_name || profile?.email || 'Someone',
            commentText: content.trim(),
          });
        }
      } catch (notifyError) {
        console.error('Failed to send comment notifications:', notifyError);
      }
    })();

    return NextResponse.json({ comment: commentWithProfile }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
