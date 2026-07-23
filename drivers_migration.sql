-- Create drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    lines TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    company_id UUID REFERENCES public.partner_companies(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ativo' NOT NULL
);

-- Create driver evaluations table
CREATE TABLE IF NOT EXISTS public.driver_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    observations TEXT NOT NULL,
    evaluator_name TEXT
);

-- RLS for drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to drivers" ON public.drivers FOR ALL TO authenticated USING (true);

-- RLS for driver evaluations
ALTER TABLE public.driver_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to driver_evaluations" ON public.driver_evaluations FOR ALL TO authenticated USING (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_drivers_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_drivers_updated_at_column();
