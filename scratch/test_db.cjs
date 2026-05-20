const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function test() {
  console.log('Testing Supabase connection...');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Credentials missing in .env');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('organizations').select('*').limit(1);
  
  if (error) {
    console.error('Connection failed:', error.message);
  } else {
    console.log('Connection successful!');
    console.log('Sample data:', data);
  }
}

test();
