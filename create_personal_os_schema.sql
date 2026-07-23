-- Sistema Operacional Pessoal (Personal OS) - Schema Completo

-- 2. Agenda Inteligente
CREATE TABLE IF NOT EXISTS pos_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    type TEXT NOT NULL, -- 'compromisso', 'reuniao', 'faculdade', etc.
    status TEXT DEFAULT 'agendado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Central de Tarefas (e 11. Antiprocrastinação)
CREATE TABLE IF NOT EXISTS pos_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT, -- 'hoje', 'proximas', 'urgentes', 'backlog'
    priority TEXT DEFAULT 'media',
    deadline TIMESTAMP WITH TIME ZONE,
    project_id UUID,
    estimated_minutes INTEGER,
    status TEXT DEFAULT 'pendente',
    next_action TEXT,
    delayed_count INTEGER DEFAULT 0, -- Para o sistema antiprocrastinação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Gestão de Projetos
CREATE TABLE IF NOT EXISTS pos_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    objective TEXT,
    progress_percentage INTEGER DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'media',
    status TEXT DEFAULT 'ativo',
    next_steps TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Gestão de Hábitos
CREATE TABLE IF NOT EXISTS pos_habits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    current_streak INTEGER DEFAULT 0,
    frequency TEXT, -- 'diario', 'semanal'
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_habit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    habit_id UUID REFERENCES pos_habits(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    status TEXT DEFAULT 'concluido',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, log_date)
);

-- 6. Gestão de Estudos
CREATE TABLE IF NOT EXISTS pos_studies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    area TEXT, -- 'faculdade', 'idiomas', 'programacao'
    hours_studied NUMERIC DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    status TEXT DEFAULT 'em_andamento',
    next_topics TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Biblioteca e Leitura
CREATE TABLE IF NOT EXISTS pos_library (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT, -- 'livro', 'pdf', 'audiobook'
    status TEXT DEFAULT 'quero_ler',
    pages_read INTEGER DEFAULT 0,
    total_pages INTEGER,
    rating INTEGER,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Sistema de Ideias
CREATE TABLE IF NOT EXISTS pos_ideas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    priority TEXT,
    potential TEXT,
    complexity TEXT,
    next_action TEXT,
    status TEXT DEFAULT 'capturada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Gestão de Metas
CREATE TABLE IF NOT EXISTS pos_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT, -- 'diaria', 'mensal', 'anual'
    reason TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER DEFAULT 0,
    milestones TEXT,
    status TEXT DEFAULT 'ativa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Diário e Reflexões
CREATE TABLE IF NOT EXISTS pos_journal (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    entry_date DATE NOT NULL UNIQUE,
    learnings TEXT,
    ideas TEXT,
    gratitude TEXT,
    problems TEXT,
    decisions TEXT,
    reflections TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Sessões Inteligentes (Histórico de Reuniões/Reviews)
CREATE TABLE IF NOT EXISTS pos_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL, -- 'matinal', 'noturna', 'semanal', 'mensal'
    session_date DATE NOT NULL,
    notes TEXT,
    productivity_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
