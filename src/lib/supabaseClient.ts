import { createClient } from '@supabase/supabase-js';

// This module is imported by SERVER code only (src/server/**, app/api/**).
// Prefer the server-only SERVICE ROLE key, which is NOT prefixed NEXT_PUBLIC_
// and therefore is never inlined into the client bundle. This lets us lock down
// the public (anon) Data API while the server retains full DB access.
// Falls back to the anon key for local/dev convenience.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Supabase credentials missing!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'MISSING');
}

// Avoid crashing if credentials are missing during build/init.
export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : (null as any);
