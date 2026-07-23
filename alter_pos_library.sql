-- Script de Migração: Expansão do Módulo de Biblioteca e Leitura

-- 1. Alteração na tabela de Biblioteca (pos_library)
ALTER TABLE pos_library 
ADD COLUMN IF NOT EXISTS author TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS knowledge_area TEXT,
ADD COLUMN IF NOT EXISTS publisher TEXT,
ADD COLUMN IF NOT EXISTS publish_year INTEGER,
ADD COLUMN IF NOT EXISTS isbn TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS buy_link TEXT,
ADD COLUMN IF NOT EXISTS acquisition_date DATE,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'fisico'; -- 'fisico', 'digital', 'pdf', 'audiobook'

-- Se o status não contemplar 'pausado' ou 'abandonado', é recomendável que a aplicação aceite esses valores no campo TEXT.

-- 2. Nova Tabela para Sessões de Leitura
CREATE TABLE IF NOT EXISTS pos_reading_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID REFERENCES pos_library(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME,
    duration_minutes INTEGER NOT NULL,
    start_page INTEGER,
    end_page INTEGER,
    pages_read INTEGER NOT NULL,
    notes TEXT,
    difficulty TEXT DEFAULT 'media', -- 'facil', 'media', 'dificil'
    concentration_level INTEGER CHECK (concentration_level >= 1 AND concentration_level <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Nova Tabela para Anotações de Leitura (Highlights/Resumos)
CREATE TABLE IF NOT EXISTS pos_reading_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID REFERENCES pos_library(id) ON DELETE CASCADE,
    chapter TEXT,
    note_type TEXT DEFAULT 'anotacao', -- 'resumo', 'destaque', 'citacao', 'licao'
    content TEXT NOT NULL,
    page_reference INTEGER,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
