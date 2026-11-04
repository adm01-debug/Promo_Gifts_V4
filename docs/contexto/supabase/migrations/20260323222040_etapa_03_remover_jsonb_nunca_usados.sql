-- ETAPA 3: Remover campos JSONB nunca usados da tabela products
-- Confirmado: 0 registros preenchidos em todos

ALTER TABLE public.products DROP COLUMN IF EXISTS sizes;
ALTER TABLE public.products DROP COLUMN IF EXISTS personalization_options;
ALTER TABLE public.products DROP COLUMN IF EXISTS personalization_areas;
