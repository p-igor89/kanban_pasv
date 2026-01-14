import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/boards/[boardId]/members/[memberId] - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; memberId: string }> }
) {
  try {
    const { boardId, memberId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is owner or admin
    const { data: board } = await supabase
      .from('boards')
      .select('user_id')
      .eq('id', boardId)
      .single();

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const isOwner = board.user_id === user.id;

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'admin') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    // Get the member being updated
    const { data: targetMember } = await supabase
      .from('board_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('board_id', boardId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Update member role
    const { data: member, error } = await supabase
      .from('board_members')
      .update({ role })
      .eq('id', memberId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .eq('id', member.user_id)
      .single();

    const memberWithProfile = { ...member, profile };

    // Create notification
    await supabase.from('notifications').insert({
      user_id: targetMember.user_id,
      type: 'board_role_changed',
      title: 'Role Updated',
      message: `Your role has been changed to ${role}`,
      board_id: boardId,
    });

    // Log activity
    await supabase.from('activities').insert({
      board_id: boardId,
      user_id: user.id,
      action: 'member_role_changed',
      details: {
        member_id: memberId,
        old_role: targetMember.role,
        new_role: role,
      },
    });

    return NextResponse.json({ member: memberWithProfile });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/boards/[boardId]/members/[memberId] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; memberId: string }> }
) {
  try {
    const { boardId, memberId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is owner or admin
    const { data: board } = await supabase
      .from('boards')
      .select('user_id')
      .eq('id', boardId)
      .single();

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Get the member being removed
    const { data: targetMember } = await supabase
      .from('board_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('board_id', boardId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const isOwner = board.user_id === user.id;
    const isSelf = targetMember.user_id === user.id;

    // Users can remove themselves, or owners/admins can remove others
    if (!isSelf && !isOwner) {
      const { data: membership } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    // Remove member
    const { error } = await supabase.from('board_members').delete().eq('id', memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('activities').insert({
      board_id: boardId,
      user_id: user.id,
      action: 'member_removed',
      details: { removed_user_id: targetMember.user_id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
