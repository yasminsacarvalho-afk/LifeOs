ALTER TABLE treasury_accounts ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;
ALTER TABLE treasury_accounts ADD COLUMN IF NOT EXISTS account_context TEXT DEFAULT 'business';
ALTER TABLE treasury_accounts ADD COLUMN IF NOT EXISTS notes TEXT;
