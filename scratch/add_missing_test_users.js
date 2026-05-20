import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addNurse() {
  const userId = `USR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const { error } = await supabase.from('users').insert({
    id: userId,
    username: 'nurse_hosp_1',
    password: '123',
    role: 'Nurse',
    orgId: 'HOSP-01', // Bach Mai University Hospital
    isActive: 1,
    createdAt: new Date().toISOString()
  });

  if (error) {
    console.error('Error adding nurse:', error);
  } else {
    console.log('Successfully added nurse_hosp_1 to DB');
  }
}

addNurse();
