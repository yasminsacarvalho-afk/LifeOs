-- supabase/migrations/20260602010000_analytics_and_packages.sql

-- Atualiza tabela de vendas
ALTER TABLE public.sales
ADD COLUMN payment_method text,
ADD COLUMN sales_channel text,
ADD COLUMN trip_id uuid REFERENCES public.trips(id);

-- Cria Enum de status da encomenda
CREATE TYPE public.package_status AS ENUM ('aguardando', 'enviada', 'chegou', 'entregue');

-- Cria tabela de encomendas
CREATE TABLE public.packages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL,
    sender_name text NOT NULL,
    receiver_name text NOT NULL,
    origin text NOT NULL,
    destination text NOT NULL,
    status public.package_status NOT NULL DEFAULT 'aguardando',
    price numeric(10,2) NOT NULL DEFAULT 0,
    commission numeric(10,2) NOT NULL DEFAULT 0,
    company_id uuid REFERENCES public.partner_companies(id),
    trip_id uuid REFERENCES public.trips(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE packages;
