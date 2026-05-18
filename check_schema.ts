import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: cols } = await supabase.rpc('get_columns', { table_name: 'games' });
  console.log('Columns using RPC?', cols);
  
  // Alternative to see columns: just insert a bad row to get error
  const { error } = await supabase.from('games').insert({ fake_col: 1 }).select();
  console.log('Error output (often shows valid columns):', error);
  
}
run();
