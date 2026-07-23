CREATE TABLE IF NOT EXISTS company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  agency_company TEXT,
  phone TEXT,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas abertas para que todos os funcionários possam ler, criar, editar e excluir contatos
CREATE POLICY "Allow public select on company_contacts" ON company_contacts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on company_contacts" ON company_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on company_contacts" ON company_contacts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on company_contacts" ON company_contacts FOR DELETE USING (true);
