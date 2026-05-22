import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .ilike('key', '%lims_toast_stage2%');
      
    if (error) {
      console.error('Error fetching translations:', error);
    } else {
      console.log('Translations for lims_toast_stage2:');
      console.log(data);
    }
  } catch (e) {
    console.error('Catch error:', e);
  }
}

check();
