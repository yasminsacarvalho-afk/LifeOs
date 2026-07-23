CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('login', 'information', 'process')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.knowledge_base;
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.knowledge_base;
END
$$;

CREATE POLICY "Enable read access for all users" ON public.knowledge_base FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.knowledge_base FOR ALL USING (auth.role() = 'authenticated');
