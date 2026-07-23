-- Migration to add fields for full CRUD on partner companies

ALTER TABLE public.partner_companies
ADD COLUMN meta numeric,
ADD COLUMN comissao numeric,
ADD COLUMN linhas_exclusivas text[],
ADD COLUMN protocolo text,
ADD COLUMN politica_devolucao text,
ADD COLUMN politica_troca text,
ADD COLUMN ticket_medio numeric,
ADD COLUMN carros_por_dia integer,
ADD COLUMN mais_informacoes text;
