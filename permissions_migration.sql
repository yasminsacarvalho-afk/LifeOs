ALTER TABLE user_roles
ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;
