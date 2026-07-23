-- supabase/migrations/20260601235959_create_cash_closings.sql
CREATE TABLE public.cash_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_closings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

-- RLS
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prototype_read_cash_closings" ON public.cash_closings FOR SELECT USING (true);
CREATE POLICY "prototype_write_cash_closings" ON public.cash_closings FOR ALL USING (true) WITH CHECK (true);
