ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS direction text DEFAULT 'descendo',
ADD COLUMN IF NOT EXISTS operating_days integer[] DEFAULT '{0,1,2,3,4,5,6}';
