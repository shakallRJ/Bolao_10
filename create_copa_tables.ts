import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const sql = `
CREATE TABLE IF NOT EXISTS copa_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase VARCHAR(100) NOT NULL,
  group_name VARCHAR(50),
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  home_flag VARCHAR(100),
  away_flag VARCHAR(100),
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'finished')),
  important BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS copa_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES copa_matches(id) ON DELETE CASCADE NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);
`;

async function run() {
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  console.log('Result:', error || 'Success');
}
run();
