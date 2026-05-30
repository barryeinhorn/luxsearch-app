import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

let supabase: SupabaseClient | null = null;

if (url && key) {
  supabase = createClient(url, key);
} else {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SECRET_KEY not set — running without Supabase cache');
}

export { supabase };
