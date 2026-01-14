import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/profile
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // Profile might not exist yet, return basic info
      return NextResponse.json({
        profile: {
          id: user.id,
          email: user.email,
          display_name: user.email?.split('@')[0] || null,
          avatar_url: null,
          notification_preferences: {
            email_task_assigned: true,
            email_task_due: true,
            email_comments: true,
            email_board_invites: true,
          },
        },
      });
    }

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/profile
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { display_name, avatar_url, notification_preferences } = body;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates: Record<string, unknown> = {};

    if (display_name !== undefined) {
      updates.display_name = display_name?.trim() || null;
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url?.trim() || null;
    }

    if (notification_preferences !== undefined) {
      // Merge with existing preferences
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      const existing = (existingProfile?.notification_preferences || {}) as Record<string, unknown>;
      updates.notification_preferences = {
        ...existing,
        ...notification_preferences,
      };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
