import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/boards/[boardId]/members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get board with owner info
    const { data: board } = await supabase
      .from('boards')
      .select('user_id')
      .eq('id', boardId)
      .single();

    // Get members
    const { data: members, error } = await supabase
      .from('board_members')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch profiles separately to avoid relationship issues
    const memberUserIds = (members || []).map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .in('id', memberUserIds);

    // Map profiles to members
    const membersWithProfiles = (members || []).map((member) => ({
      ...member,
      profile: profiles?.find((p) => p.id === member.user_id) || null,
    }));

    // Add owner as first member if not already in members
    type MemberWithProfile = (typeof membersWithProfiles)[number];
    let allMembers: MemberWithProfile[] = membersWithProfiles;
    if (board && !allMembers.some((m) => m.user_id === board.user_id)) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .eq('id', board.user_id)
        .single();

      if (ownerProfile) {
        // Virtual owner entry for display purposes (not stored in board_members)
        const ownerEntry = {
          id: 'owner',
          board_id: boardId,
          user_id: board.user_id,
          role: 'owner',
          invited_by: null,
          created_at: '',
          profile: ownerProfile,
        };
        allMembers = [ownerEntry as MemberWithProfile, ...allMembers];
      }
    }

    return NextResponse.json({ members: allMembers });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/boards/[boardId]/members - Invite member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const body = await request.json();
    const { email, role = 'member' } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
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

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json({ error: 'Not authorized to invite members' }, { status: 403 });
      }
    }

    // Find user by email
    const { data: inviteeProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (!inviteeProfile) {
      return NextResponse.json(
        { error: 'User not found. They must register first.' },
        { status: 404 }
      );
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('board_members')
      .select('id')
      .eq('board_id', boardId)
      .eq('user_id', inviteeProfile.id)
      .single();

    if (existingMember || inviteeProfile.id === board.user_id) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    // Create membership
    const { data: member, error } = await supabase
      .from('board_members')
      .insert({
        board_id: boardId,
        user_id: inviteeProfile.id,
        role,
        invited_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch profile for the new member
    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .eq('id', inviteeProfile.id)
      .single();

    const memberWithProfile = {
      ...member,
      profile: memberProfile,
    };

    // Create notification for invitee
    await supabase.from('notifications').insert({
      user_id: inviteeProfile.id,
      type: 'board_invite',
      title: 'Board Invitation',
      message: `You have been invited to join a board`,
      board_id: boardId,
    });

    // Log activity
    await supabase.from('activities').insert({
      board_id: boardId,
      user_id: user.id,
      action: 'member_invited',
      details: { invited_user_id: inviteeProfile.id, role },
    });

    return NextResponse.json({ member: memberWithProfile }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
