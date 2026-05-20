const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function test() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: user, error } = await supabase.from('users').select('*').eq('username', 'admin').maybeSingle();
  
  if (error) {
    console.error('Error fetching user:', error.message);
  } else if (!user) {
    console.log('User "admin" NOT found in Supabase users table.');
  } else {
    console.log('User "admin" found:', user);
  }
}

test();
