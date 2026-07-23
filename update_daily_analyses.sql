-- Create the table if it does not exist
CREATE TABLE IF NOT EXISTS public.daily_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_date TEXT,
    empresa TEXT,
    top_lines JSONB,
    top_city TEXT,
    clima TEXT,
    notes TEXT,
    taxas TEXT,
    horario TEXT,
    pagamento TEXT,
    ticket_medio TEXT
);

-- Add the new columns
ALTER TABLE public.daily_analyses
ADD COLUMN IF NOT EXISTS receita_origem TEXT,
ADD COLUMN IF NOT EXISTS receita_destino TEXT,
ADD COLUMN IF NOT EXISTS receita_rota TEXT,
ADD COLUMN IF NOT EXISTS receita_horario TEXT,
ADD COLUMN IF NOT EXISTS total_vendas TEXT,
ADD COLUMN IF NOT EXISTS volume_vendas TEXT,
ADD COLUMN IF NOT EXISTS top_destinations JSONB;

-- Habilita o realtime para a tabela, garantindo que o dashboard seja reativo
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_analyses;

-- Adiciona os novos campos na tabela trips para o match perfeito
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS route_name TEXT,
ADD COLUMN IF NOT EXISTS origin_code TEXT,
ADD COLUMN IF NOT EXISTS destination_code TEXT;

-- Habilita o realtime para trips caso não esteja
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;

-- Nova Tabela de Códigos de Cidades Independentes
CREATE TABLE IF NOT EXISTS public.city_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city_name TEXT NOT NULL,
    code TEXT NOT NULL,
    company_id UUID REFERENCES public.partner_companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.city_codes;
