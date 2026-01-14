import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  // Fallback values for build time when env vars might not be available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
