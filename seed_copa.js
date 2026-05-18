import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const groups = {
  'A': ['MÉXICO', 'ÁFRICA DO SUL', 'COREIA DO SUL', 'REP. CHECA'],
  'B': ['CANADÁ', 'BÓSNIA', 'CATAR', 'SUÍÇA'],
  'C': ['BRASIL', 'MARROCOS', 'HAITI', 'ESCÓCIA'],
  'D': ['EUA', 'PARAGUAI', 'AUSTRÁLIA', 'TURQUIA'],
  'E': ['ALEMANHA', 'CURAÇAU', 'C. DO MARFIM', 'EQUADOR'],
  'F': ['HOLANDA', 'JAPÃO', 'SUÉCIA', 'TUNÍSIA'],
  'G': ['BÉLGICA', 'EGITO', 'IRÃ', 'NOVA ZELÂNDIA'],
  'H': ['ESPANHA', 'CABO VERDE', 'ARÁBIA SAUDITA', 'URUGUAI'],
  'I': ['FRANÇA', 'SENEGAL', 'IRAQUE', 'NORUEGA'],
  'J': ['ARGENTINA', 'ARGÉLIA', 'ÁUSTRIA', 'JORDÂNIA'],
  'K': ['PORTUGAL', 'RD CONGO', 'UZBEQUISTÃO', 'COLÔMBIA'],
  'L': ['INGLATERRA', 'GANA', 'CROÁCIA', 'PANAMÁ']
};

const matches = [];

for (const [group, teams] of Object.entries(groups)) {
  const [t1, t2, t3, t4] = teams;
  matches.push({ id: crypto.randomUUID(), phase: 'Fase de Grupos', group_name: `Grupo ${group}`, home_team: t1, away_team: t2, match_date: '2026-06-11T16:00:00Z', status: 'pending' });
  matches.push({ id: crypto.randomUUID(), phase: 'Fase de Grupos', group_name: `Grupo ${group}`, home_team: t3, away_team: t4, match_date: '2026-06-11T20:00:00Z', status: 'pending' });
  matches.push({ id: crypto.randomUUID(), phase: 'Fase de Grupos', group_name: `Grupo ${group}`, home_team: t4, away_team: t2, match_date: '2026-06-16T16:00:00Z', status: 'pending' });
  matches.push({ id: crypto.randomUUID(), phase: 'Fase de Grupos', group_name: `Grupo ${group}`, home_team: t1, away_team: t3, match_date: '2026-06-16T20:00:00Z', status: 'pending' });
  matches.push({ id: crypto.randomUUID(), phase: 'Fase de Grupos', group_name: `Grupo ${group}`, home_team: t4, away_team: t1, match_date: '2026-06-24T16:00:00Z', status: 'pending' });
  matches.push({ id: crypto.randomUUID(), phase: 'Fase de Grupos', group_name: `Grupo ${group}`, home_team: t2, away_team: t3, match_date: '2026-06-24T20:00:00Z', status: 'pending' });
}

const phases = ['Segunda Fase', 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Disputa 3º Lugar', 'Final'];
const counts = [16, 8, 4, 2, 1, 1];

for (let i=0; i<phases.length; i++) {
  for (let j=0; j<counts[i]; j++) {
    matches.push({
      id: crypto.randomUUID(),
      phase: phases[i],
      group_name: phases[i],
      home_team: 'A Definir',
      away_team: 'A Definir',
      match_date: `2026-07-0${i+1}T16:00:00Z`,
      status: 'pending'
    });
  }
}

async function run() {
  await supabase.from('settings').upsert({ key: 'copa_matches', value: JSON.stringify(matches) }, { onConflict: 'key' });
  console.log(`Inseridos ${matches.length} jogos.`);
}
run();
