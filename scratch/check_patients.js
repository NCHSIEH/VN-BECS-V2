import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const { data: p, error: pe } = await supabase.from('patients').select('*');
    console.log('Patients Count:', p?.length, 'Error:', pe);
    if (p && p.length > 0) {
      console.log('Sample Patient:', p[0]);
    }
    
    const { data: c, error: ce } = await supabase.from('components').select('*');
    console.log('Components Count:', c?.length, 'Error:', ce);
  } catch (e) {
    console.error(e);
  }
}
check();
