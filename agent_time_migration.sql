-- Add agent_indicated_time to trips table
ALTER TABLE public.trips 
ADD COLUMN agent_indicated_time TEXT DEFAULT NULL;
