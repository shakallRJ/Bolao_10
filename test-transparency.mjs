import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, count, error } = await supabase.from('copa_predictions').select('id, user_id, users(name, nickname)', { count: 'exact' });
  console.log("data size:", data?.length, "count:", count, "error:", error);
}
test();
