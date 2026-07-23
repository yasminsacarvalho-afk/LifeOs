CREATE TABLE IF NOT EXISTS public.growth_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.partners(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned',
    budget NUMERIC DEFAULT 0,
    spent NUMERIC DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    sales_generated INTEGER DEFAULT 0,
    cac_target NUMERIC DEFAULT 0,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.competitor_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    competitor_price NUMERIC DEFAULT 0,
    our_price NUMERIC DEFAULT 0,
    last_checked DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS policies
ALTER TABLE public.growth_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.growth_experiments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.competitor_prices FOR ALL USING (auth.role() = 'authenticated');

