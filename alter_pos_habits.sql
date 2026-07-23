-- Script de Migração: Expansão do Módulo de Hábitos

-- 1. Alteração na tabela de Hábitos
ALTER TABLE pos_habits 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'activity',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'blue',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS objective TEXT,
ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'conclusao', -- 'conclusao', 'tempo', 'quantidade'
ADD COLUMN IF NOT EXISTS goal_value NUMERIC,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS days_of_week JSONB, -- Array de dias ex: [1,2,3,4,5]
ADD COLUMN IF NOT EXISTS preferred_time TIME,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'media',
ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;

-- 2. Alteração na tabela de Logs de Hábitos
ALTER TABLE pos_habit_logs
ADD COLUMN IF NOT EXISTS value_achieved NUMERIC,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Atualizar status permitidos caso esteja usando CHECK constraint (se não houver, ignore)
-- Status permitidos em logs: 'concluido', 'nao_realizado', 'parcial'
-- Status permitidos em hábitos: 'ativo', 'pausado', 'arquivado'
