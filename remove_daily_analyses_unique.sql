-- Remove a restrição UNIQUE da coluna analysis_date para permitir múltiplas análises (ex: uma por parceiro) no mesmo dia.
ALTER TABLE public.daily_analyses DROP CONSTRAINT IF EXISTS daily_analyses_analysis_date_key;

-- (Opcional) Adicionar uma nova restrição única composta por data e empresa, para evitar duplicações exatas
-- ALTER TABLE public.daily_analyses ADD CONSTRAINT daily_analyses_date_empresa_key UNIQUE (analysis_date, empresa);
