ALTER TABLE pos_library ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}';
