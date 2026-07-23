-- Add boleto fields to cash closings table
ALTER TABLE cash_closings 
ADD COLUMN IF NOT EXISTS boleto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS boleto_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS boleto_receipt_url TEXT;

-- Update types/Supabase types might need refresh, but we can typecast for now.
