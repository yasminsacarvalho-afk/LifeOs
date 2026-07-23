-- supabase/migrations/20260602000000_add_trip_cities.sql
ALTER TABLE public.trips
ADD COLUMN cities text[];
