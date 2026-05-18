import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const flagMap = {
  'MÉXICO': 'mx', 'ÁFRICA DO SUL': 'za', 'COREIA DO SUL': 'kr', 'REP. CHECA': 'cz',
  'CANADÁ': 'ca', 'BÓSNIA': 'ba', 'CATAR': 'qa', 'SUÍÇA': 'ch',
  'BRASIL': 'br', 'MARROCOS': 'ma', 'HAITI': 'ht', 'ESCÓCIA': 'gb-sct',
  'EUA': 'us', 'PARAGUAI': 'py', 'AUSTRÁLIA': 'au', 'TURQUIA': 'tr',
  'ALEMANHA': 'de', 'CURAÇAU': 'cw', 'C. DO MARFIM': 'ci', 'EQUADOR': 'ec',
  'HOLANDA': 'nl', 'JAPÃO': 'jp', 'SUÉCIA': 'se', 'TUNÍSIA': 'tn',
  'BÉLGICA': 'be', 'EGITO': 'eg', 'IRÃ': 'ir', 'NOVA ZELÂNDIA': 'nz',
  'ESPANHA': 'es', 'CABO VERDE': 'cv', 'ARÁBIA SAUDITA': 'sa', 'URUGUAI': 'uy',
  'FRANÇA': 'fr', 'SENEGAL': 'sn', 'IRAQUE': 'iq', 'NORUEGA': 'no',
  'ARGENTINA': 'ar', 'ARGÉLIA': 'dz', 'ÁUSTRIA': 'at', 'JORDÂNIA': 'jo',
  'PORTUGAL': 'pt', 'RD CONGO': 'cd', 'UZBEQUISTÃO': 'uz', 'COLÔMBIA': 'co',
  'INGLATERRA': 'gb-eng', 'GANA': 'gh', 'CROÁCIA': 'hr', 'PANAMÁ': 'pa'
};

async function run() {
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'copa_matches').maybeSingle();
  if (setting && setting.value) {
    let matches = JSON.parse(setting.value);
    matches = matches.map(m => {
      const hCode = flagMap[m.home_team];
      const aCode = flagMap[m.away_team];
      if (hCode) m.home_flag = `https://flagcdn.com/w80/${hCode}.png`;
      if (aCode) m.away_flag = `https://flagcdn.com/w80/${aCode}.png`;
      return m;
    });
    await supabase.from('settings').upsert({ key: 'copa_matches', value: JSON.stringify(matches) }, { onConflict: 'key' });
    console.log('Bandeiras atualizadas!');
  }
}
run();
