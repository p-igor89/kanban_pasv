import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/boards/[boardId]/activities
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch profiles and tasks separately
    const userIds = [...new Set((activities || []).map((a) => a.user_id))];
    const taskIds = [
      ...new Set((activities || []).filter((a) => a.task_id).map((a) => a.task_id as string)),
    ];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .in('id', userIds);

    const { data: tasks } =
      taskIds.length > 0
        ? await supabase.from('tasks').select('id, title').in('id', taskIds)
        : { data: [] };

    // Map profiles and tasks to activities
    const activitiesWithData = (activities || []).map((activity) => ({
      ...activity,
      profile: profiles?.find((p) => p.id === activity.user_id) || null,
      task: tasks?.find((t) => t.id === activity.task_id) || null,
    }));

    return NextResponse.json({ activities: activitiesWithData });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
