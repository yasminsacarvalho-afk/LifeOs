-- Script de Migração: Expansão do Módulo de Estudos

-- 1. Alteração na tabela de Cursos/Trilhas (pos_studies)
ALTER TABLE pos_studies 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS knowledge_area TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS instructor TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'iniciante', -- 'iniciante', 'intermediario', 'avancado'
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS total_hours NUMERIC,
ADD COLUMN IF NOT EXISTS completed_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS certificate_url TEXT,
ADD COLUMN IF NOT EXISTS course_url TEXT,
ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;

-- 2. Nova Tabela para Sessões de Estudo Diárias
CREATE TABLE IF NOT EXISTS pos_study_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES pos_studies(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME,
    duration_minutes INTEGER NOT NULL,
    module_name TEXT,
    class_name TEXT,
    content_studied TEXT,
    summary TEXT,
    difficulty TEXT DEFAULT 'media', -- 'facil', 'media', 'dificil'
    exercises_done BOOLEAN DEFAULT false,
    personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 10),
    next_subject TEXT,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
