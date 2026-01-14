import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SearchQuerySchema, validateSearchParams } from '@/lib/validation';
import { sanitizeSearchInput, enforceRateLimit, rateLimitConfigs } from '@/lib/security';

// GET /api/search?q=query
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting for search operations
    try {
      enforceRateLimit(user.id, rateLimitConfigs.api.search, 'search');
    } catch (error) {
      if ((error as Error & { code?: string }).code === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
      throw error;
    }

    // Validate search params using Zod schema
    const validation = validateSearchParams(SearchQuerySchema, searchParams);
    if (!validation.success) {
      // Return empty results for missing/invalid query (matches original behavior)
      return NextResponse.json({ results: [] });
    }

    const { q: query, limit } = validation.data;

    // Sanitize the search query for SQL LIKE/ILIKE operations
    const sanitizedQuery = sanitizeSearchInput(query);

    // Use the search function we created in the migration
    const { data: results, error } = await supabase.rpc('search_tasks', {
      search_query: query.trim(),
      user_uuid: user.id,
    });

    if (error) {
      // Fallback to simple ILIKE search if full-text search fails
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from('tasks')
        .select(
          `
          id,
          board_id,
          status_id,
          title,
          description,
          priority,
          tags,
          due_date,
          boards!inner(name, user_id),
          statuses!inner(name)
        `
        )
        .or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
        .limit(limit);

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      // Filter by user access and format results
      const formattedResults = (fallbackResults || [])
        .filter((task: Record<string, unknown>) => {
          const boards = task.boards as { user_id: string } | undefined;
          return boards?.user_id === user.id;
        })
        .map((task: Record<string, unknown>) => {
          const boards = task.boards as { name: string } | undefined;
          const statuses = task.statuses as { name: string } | undefined;
          return {
            id: task.id,
            board_id: task.board_id,
            board_name: boards?.name || '',
            status_id: task.status_id,
            status_name: statuses?.name || '',
            title: task.title,
            description: task.description,
            priority: task.priority,
            tags: task.tags,
            due_date: task.due_date,
            rank: 1,
          };
        });

      return NextResponse.json({ results: formattedResults });
    }

    return NextResponse.json({ results: results || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
