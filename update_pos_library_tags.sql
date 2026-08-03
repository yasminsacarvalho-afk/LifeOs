ALTER TABLE pos_library ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE pos_library ADD COLUMN IF NOT EXISTS collections text[] DEFAULT '{}';
