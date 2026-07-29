-- SQL para criar as tabelas do módulo Financeiro do Personal OS
-- Execute este script no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.pos_budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    amount_limit NUMERIC NOT NULL,
    period TEXT DEFAULT 'mensal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pos_credit_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    limit_amount NUMERIC NOT NULL,
    closing_day INTEGER NOT NULL,
    due_day INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pos_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES public.pos_budgets(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.pos_credit_cards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Caso a tabela pos_expenses já exista e não tenha a coluna card_id:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pos_expenses' AND column_name='card_id') THEN
    ALTER TABLE public.pos_expenses ADD COLUMN card_id UUID REFERENCES public.pos_credit_cards(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Configurar RLS (Row Level Security)
ALTER TABLE public.pos_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_expenses ENABLE ROW LEVEL SECURITY;

-- Políticas temporárias para permitir todas as operações
CREATE POLICY "Enable all for users on pos_budgets" ON public.pos_budgets FOR ALL USING (true);
CREATE POLICY "Enable all for users on pos_credit_cards" ON public.pos_credit_cards FOR ALL USING (true);
CREATE POLICY "Enable all for users on pos_expenses" ON public.pos_expenses FOR ALL USING (true);
