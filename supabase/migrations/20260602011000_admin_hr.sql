-- supabase/migrations/20260602011000_admin_hr.sql

-- Adiciona campos de RH na tabela de colaboradores (sellers)
ALTER TABLE public.sellers
ADD COLUMN base_salary numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN role text NOT NULL DEFAULT 'vendedor',
ADD COLUMN sales_goal numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN bonus_amount numeric(10,2) NOT NULL DEFAULT 0;

-- Cria Enum de tipos de turno
CREATE TYPE public.shift_type AS ENUM ('completa', 'manha', 'tarde', 'folga');

-- Cria Enum de status do turno
CREATE TYPE public.shift_status AS ENUM ('agendado', 'realizado', 'trocado', 'falta');

-- Cria tabela de escalas (shifts)
CREATE TABLE public.shifts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id uuid NOT NULL REFERENCES public.sellers(id),
    shift_date date NOT NULL,
    shift_type public.shift_type NOT NULL DEFAULT 'completa',
    start_time time without time zone,
    end_time time without time zone,
    status public.shift_status NOT NULL DEFAULT 'agendado',
    
    -- Controle de Trocas de Turno
    swap_requested boolean NOT NULL DEFAULT false,
    covered_by_id uuid REFERENCES public.sellers(id),
    swap_fee numeric(10,2) NOT NULL DEFAULT 0,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Restrição: um colaborador só pode ter uma escala por dia (salvo regras complexas, mas para este caso, simplifica)
    UNIQUE(seller_id, shift_date)
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
