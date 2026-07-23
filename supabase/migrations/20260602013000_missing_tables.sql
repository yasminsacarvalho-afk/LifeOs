-- Tabela de Fechamentos de Caixa (Histórico de Faturamento)
CREATE TABLE IF NOT EXISTS public.cash_closings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    closing_date date NOT NULL UNIQUE,
    total_sales numeric(10,2) NOT NULL DEFAULT 0,
    total_commission numeric(10,2) NOT NULL DEFAULT 0,
    expenses numeric(10,2) NOT NULL DEFAULT 0,
    net_amount numeric(10,2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de Encomendas (Pacotes)
DO $$ BEGIN
    CREATE TYPE public.package_status AS ENUM ('aguardando', 'enviada', 'chegou', 'entregue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.packages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE,
    sender_name text NOT NULL,
    receiver_name text NOT NULL,
    origin text NOT NULL,
    destination text NOT NULL,
    price numeric(10,2) NOT NULL DEFAULT 0,
    commission numeric(10,2) NOT NULL DEFAULT 0,
    status public.package_status NOT NULL DEFAULT 'aguardando',
    company_id uuid REFERENCES public.partner_companies(id),
    trip_id uuid REFERENCES public.trips(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cash_closings;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE packages;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
