CREATE TABLE IF NOT EXISTS academy_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'course', 'book', 'topic'
  category TEXT NOT NULL, -- 'financas', 'onibus', 'geral'
  title TEXT NOT NULL,
  description TEXT,
  author TEXT,
  duration TEXT,
  modules INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  drive_link TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  priority TEXT,
  status TEXT DEFAULT 'Pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE academy_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON academy_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON academy_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON academy_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON academy_items FOR DELETE USING (true);
