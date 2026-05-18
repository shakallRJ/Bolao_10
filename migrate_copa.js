import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrateMatches() {
  const { data: setting, error } = await supabase.from('settings').select('value').eq('key', 'copa_matches').maybeSingle();
  
  if (error || !setting || !setting.value) {
    console.log('No existing matches found in settings or error:', error);
    return;
  }

  const matches = JSON.parse(setting.value);
  if (!matches || matches.length === 0) {
    console.log('No matches to migrate.');
    return;
  }

  // Check if target table copa_matches exists by attempting a select
  const { error: probeErr } = await supabase.from('copa_matches').select('id').limit(1);
  if (probeErr) {
    console.log('copa_matches table might not exist yet. Please run supabase-copa-2026.sql first.');
    console.log('Error:', probeErr.message);
    return;
  }

  console.log(`Migrating ${matches.length} matches...`);
  const { error: upsertErr } = await supabase.from('copa_matches').upsert(matches);
  if (upsertErr) {
    console.error('Failed to upsert matches:', upsertErr);
  } else {
    console.log('Matches migrated successfully!');
  }
}

migrateMatches();
