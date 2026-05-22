import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restore() {
  try {
    console.log('Restoring nurse_hosp_1 password to "123"...');
    const { error } = await supabase
      .from('users')
      .update({ password: '123' })
      .eq('username', 'nurse_hosp_1');
    
    if (error) {
      console.error('Error updating password:', error);
    } else {
      console.log('Password successfully restored!');
    }
  } catch (e) {
    console.error('Catch error:', e);
  }
}

restore();
