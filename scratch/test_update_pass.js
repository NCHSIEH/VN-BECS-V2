import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testUpdate() {
  console.log('Fetching nurse_hosp_1...');
  const { data: user } = await supabase.from('users').select('*').eq('username', 'nurse_hosp_1').single();
  console.log('Current password:', user.password);

  console.log('Updating password to 321...');
  const { error } = await supabase.from('users').update({ password: '321' }).eq('id', user.id);
  
  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Update success!');
  }

  const { data: updatedUser } = await supabase.from('users').select('*').eq('username', 'nurse_hosp_1').single();
  console.log('Updated password:', updatedUser.password);
}

testUpdate();
