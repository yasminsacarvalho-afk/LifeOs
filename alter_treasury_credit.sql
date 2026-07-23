ALTER TABLE treasury_accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'checking';
ALTER TABLE treasury_accounts ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC DEFAULT 0;
ALTER TABLE treasury_accounts ADD COLUMN IF NOT EXISTS invoice_date TEXT;
