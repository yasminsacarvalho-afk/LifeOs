-- Adicionando vínculo opcional com a biblioteca de leitura
ALTER TABLE public.pos_habits
ADD COLUMN book_id UUID REFERENCES public.pos_library(id) ON DELETE SET NULL;
