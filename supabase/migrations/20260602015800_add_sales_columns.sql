ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Dinheiro',
ADD COLUMN IF NOT EXISTS sales_channel text DEFAULT 'Balcão';
