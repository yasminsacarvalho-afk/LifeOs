ALTER TABLE pos_library ADD COLUMN IF NOT EXISTS progress_unit text DEFAULT 'pages';
ALTER TABLE pos_library ADD COLUMN IF NOT EXISTS resource_link text;
ALTER TABLE pos_library ADD COLUMN IF NOT EXISTS youtube_link text;
