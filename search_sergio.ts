import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: users } = await supabase.from('users').select('id, name, email');
  const sergio = users?.filter(u => u.name && u.name.toUpperCase().includes('SERGIO'));
  console.log('Sergio:', sergio);
  
  const { data: deps } = await supabase.from('deposits').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Deposits:', deps);
}
run();
