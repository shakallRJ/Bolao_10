import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: users, error } = await supabase.from('users').select('*').ilike('email', 'Igorsilvama@outlook.com');
  console.log('Users:', users, error);

  if (users?.length > 0) {
    const user = users[0];
    const { data: logs, error: logError } = await supabase.from('settings').select('value').eq('key', 'pagbank_logs').maybeSingle();
    
    if (logs && logs.value) {
      const allLogs = logs.value;
      const index = allLogs.indexOf(user.name);
      if (index !== -1) {
        console.log('Found user in logs. Showing context:');
        console.log(allLogs.substring(Math.max(0, index - 500), Math.min(allLogs.length, index + 1500)));
      } else {
        console.log('User not found in PagBank logs by exact name.');
      }
    }
  }
}
run();
