-- Add goal relationships to existing modules

ALTER TABLE pos_habits 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES pos_goals(id) ON DELETE SET NULL;

ALTER TABLE pos_library 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES pos_goals(id) ON DELETE SET NULL;

ALTER TABLE pos_tasks 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES pos_goals(id) ON DELETE SET NULL;
