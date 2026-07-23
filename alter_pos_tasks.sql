-- Script de Migração: Expansão do Módulo de Tarefas

-- 1. Alteração na tabela de Tarefas
ALTER TABLE pos_tasks 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS goal_id UUID, -- Vinculado a pos_goals
ADD COLUMN IF NOT EXISTS due_time TIME,
ADD COLUMN IF NOT EXISTS actual_minutes INTEGER,
ADD COLUMN IF NOT EXISTS responsible TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB, -- Array de strings
ADD COLUMN IF NOT EXISTS checklist JSONB, -- Array de objetos { title, completed }
ADD COLUMN IF NOT EXISTS dependencies JSONB, -- Array de UUIDs de outras tarefas
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS is_focus_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- Alterar restrições ou tipos se necessário, mas para SQLite/Postgres no Supabase
-- o ideal é garantir que o status possa receber novos valores: 'pendente', 'em_andamento', 'concluida', 'cancelada', 'arquivada'
-- e priority: 'baixa', 'media', 'alta', 'critica'
