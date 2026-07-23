CREATE TYPE financial_type AS ENUM ('income', 'expense');
CREATE TYPE financial_context AS ENUM ('personal', 'business');

CREATE TABLE financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type financial_type NOT NULL,
    context financial_context NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    paid BOOLEAN DEFAULT false,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON financial_records
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable realtime
alter publication supabase_realtime add table financial_records;
