
-- =========================================================
-- Shared trigger function for updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================================
-- partner_companies
-- =========================================================
CREATE TABLE public.partner_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_companies TO anon, authenticated;
GRANT ALL ON public.partner_companies TO service_role;
ALTER TABLE public.partner_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prototype_read_partners" ON public.partner_companies FOR SELECT USING (true);
CREATE POLICY "prototype_write_partners" ON public.partner_companies FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_partner_companies_updated BEFORE UPDATE ON public.partner_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- sellers
-- =========================================================
CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  company_id UUID REFERENCES public.partner_companies(id) ON DELETE SET NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO anon, authenticated;
GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prototype_read_sellers" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "prototype_write_sellers" ON public.sellers FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sellers_updated BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- trips (viagens operacionais do dia)
-- =========================================================
CREATE TYPE public.trip_status AS ENUM ('scheduled', 'imminent', 'late', 'checked_in', 'cancelled');

CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  company_id UUID REFERENCES public.partner_companies(id) ON DELETE SET NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  scheduled_departure TIMESTAMPTZ NOT NULL,
  real_departure TIMESTAMPTZ,
  car_plate TEXT,
  driver_name TEXT,
  status public.trip_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trips_scheduled ON public.trips (scheduled_departure);
CREATE INDEX idx_trips_status ON public.trips (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO anon, authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prototype_read_trips" ON public.trips FOR SELECT USING (true);
CREATE POLICY "prototype_write_trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_trips_updated BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- checkins
-- =========================================================
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  real_departure TIMESTAMPTZ NOT NULL DEFAULT now(),
  car_plate TEXT,
  driver_name TEXT,
  packages_count INTEGER NOT NULL DEFAULT 0,
  packages_notes TEXT,
  operator_name TEXT,
  sent_to_whatsapp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_checkins_trip ON public.checkins (trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO anon, authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prototype_read_checkins" ON public.checkins FOR SELECT USING (true);
CREATE POLICY "prototype_write_checkins" ON public.checkins FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- sos_alerts
-- =========================================================
CREATE TABLE public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sos_alerts_trip ON public.sos_alerts (trip_id);
CREATE INDEX idx_sos_alerts_open ON public.sos_alerts (resolved) WHERE resolved = false;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_alerts TO anon, authenticated;
GRANT ALL ON public.sos_alerts TO service_role;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prototype_read_sos" ON public.sos_alerts FOR SELECT USING (true);
CREATE POLICY "prototype_write_sos" ON public.sos_alerts FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- sales (faturamento por vendedor / empresa)
-- =========================================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.partner_companies(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_date ON public.sales (sale_date);
CREATE INDEX idx_sales_company ON public.sales (company_id);
CREATE INDEX idx_sales_seller ON public.sales (seller_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO anon, authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prototype_read_sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "prototype_write_sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- monthly_goals
-- =========================================================
CREATE TABLE public.monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_period ON public.monthly_goals (period_month);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_goals TO anon, authenticated;
GRANT ALL ON public.monthly_goals TO service_role;
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prototype_read_goals" ON public.monthly_goals FOR SELECT USING (true);
CREATE POLICY "prototype_write_goals" ON public.monthly_goals FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Realtime publication
-- =========================================================
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.checkins REPLICA IDENTITY FULL;
ALTER TABLE public.sos_alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
