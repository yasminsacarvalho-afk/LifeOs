CREATE TABLE IF NOT EXISTS public.daily_analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_date date NOT NULL UNIQUE,
  notes text,
  top_lines jsonb DEFAULT '[]'::jsonb,
  top_city text,
  clima text,
  taxas text,
  horario text,
  pagamento text,
  ticket_medio text,
  empresa text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.daily_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to daily_analyses"
  ON public.daily_analyses
  FOR ALL
  USING (true)
  WITH CHECK (true);
