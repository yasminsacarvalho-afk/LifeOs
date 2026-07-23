CREATE TABLE IF NOT EXISTS treasury_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_purpose TEXT,
  account_context TEXT DEFAULT 'business',
  theme TEXT DEFAULT 'blue',
  current_balance NUMERIC DEFAULT 0,
  allocations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE treasury_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON treasury_accounts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON treasury_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON treasury_accounts FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON treasury_accounts FOR DELETE USING (true);
