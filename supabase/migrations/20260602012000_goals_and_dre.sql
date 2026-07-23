-- supabase/migrations/20260602012000_goals_and_dre.sql

-- Cria tabela de metas por colaborador (Multiplas metas)
CREATE TABLE public.seller_goals (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    description text NOT NULL,
    target_amount numeric(10,2) NOT NULL DEFAULT 0,
    bonus_amount numeric(10,2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Cria Enum de categorias de despesa
CREATE TYPE public.expense_category AS ENUM ('fixo', 'variavel');

-- Cria tabela de despesas (Expenses) para o DRE
CREATE TABLE public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL DEFAULT 0,
    category public.expense_category NOT NULL DEFAULT 'fixo',
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    company_id uuid REFERENCES public.partner_companies(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE seller_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
