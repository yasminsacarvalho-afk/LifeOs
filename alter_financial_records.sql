ALTER TABLE financial_records ADD COLUMN IF NOT EXISTS treasury_account_id UUID REFERENCES treasury_accounts(id) ON DELETE SET NULL;
