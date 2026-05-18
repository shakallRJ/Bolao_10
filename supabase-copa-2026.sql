-- ========================================================
-- SCRIPT SQL: ESTRUTURA PARA COPA DO MUNDO 2026
-- ========================================================

-- 1. Tabela de Jogos da Copa
CREATE TABLE IF NOT EXISTS copa_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase VARCHAR(50) NOT NULL,
  group_name VARCHAR(50) NOT NULL,
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  home_flag TEXT,
  away_flag TEXT,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'finished'
  home_score INT,
  away_score INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Cartelas de Palpites (Bolões do Usuário)
CREATE TABLE IF NOT EXISTS copa_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  payment_proof TEXT,
  total_points INT DEFAULT 0,
  exact_hits INT DEFAULT 0,
  total_hits INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Palpites Individuais por Jogo (Itens da Cartela)
CREATE TABLE IF NOT EXISTS copa_prediction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copa_prediction_id UUID REFERENCES copa_predictions(id) ON DELETE CASCADE,
  match_id UUID REFERENCES copa_matches(id) ON DELETE CASCADE,
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  points INT DEFAULT 0,
  UNIQUE(copa_prediction_id, match_id) -- Garante apenas um palpite por jogo por cartela
);

-- ========================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ========================================================
-- (Opcional, caso você use RLS configurado no Supabase para as tabelas)
-- Habilite o RLS caso ainda não esteja habilitado globalmente (recomendado para novas tabelas):
-- ALTER TABLE copa_matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE copa_predictions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE copa_prediction_items ENABLE ROW LEVEL SECURITY;
