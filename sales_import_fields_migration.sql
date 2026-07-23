-- Adicionando colunas de detalhamento de importação de relatórios
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tarifa numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS hr text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS fp1 text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS fp2 text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS ori text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS des text;

-- Novos campos solicitados
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS codigo_servico text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tipo_passagem text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS poltrona text;

-- Tipo de operação (VENDA, CANCELAMENTO, DEVOLUCAO, etc)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS operation_type text DEFAULT 'VENDA';

-- Taxas (Seguro/Pedágio)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS taxas numeric DEFAULT 0;
