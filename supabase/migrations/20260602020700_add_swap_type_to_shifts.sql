ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS swap_type text DEFAULT 'money';
