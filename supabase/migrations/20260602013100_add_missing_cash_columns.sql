ALTER TABLE public.cash_closings
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS closed_by text;
