DROP TABLE IF EXISTS public.operational_reports CASCADE;

CREATE TABLE public.operational_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date date NOT NULL,
  empresa text NOT NULL,
  report_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(report_date, empresa)
);

ALTER TABLE public.operational_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to operational_reports"
  ON public.operational_reports
  FOR ALL
  USING (true)
  WITH CHECK (true);
