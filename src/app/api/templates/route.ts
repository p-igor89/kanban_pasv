import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/templates
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get public templates and user's own templates
    const { data: templates, error } = await supabase
      .from('board_templates')
      .select('*')
      .or(`is_public.eq.true,created_by.eq.${user.id}`)
      .order('is_public', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/templates - Create custom template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, icon, statuses } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!statuses || !Array.isArray(statuses) || statuses.length === 0) {
      return NextResponse.json({ error: 'At least one status is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: template, error } = await supabase
      .from('board_templates')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || '📋',
        is_public: false,
        created_by: user.id,
        statuses,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
