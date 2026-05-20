import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function test() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('organizations').select('count', { count: 'exact' });
  
  if (error) {
    console.error('Connection failed:', error.message);
  } else {
    console.log('Connection successful! Organization count:', data);
  }
}

test();
