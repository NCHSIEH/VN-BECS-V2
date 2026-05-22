import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      console.log('Users:');
      data.forEach(u => {
        console.log(`- ${u.username} (role: ${u.role}): password = "${u.password}"`);
      });
    }
  } catch (e) {
    console.error('Catch error:', e);
  }
}

check();
