import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'CREATE TABLE IF NOT EXISTS test_table (id text);' });
  console.log('RPC result:', data, 'Error:', error);
}
run();
