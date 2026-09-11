ALTER TABLE public.produtos_padronizacao_variantes
  ADD COLUMN IF NOT EXISTS next_quantity_4 integer,
  ADD COLUMN IF NOT EXISTS next_quantity_5 integer,
  ADD COLUMN IF NOT EXISTS next_quantity_6 integer,
  ADD COLUMN IF NOT EXISTS next_date_4 date,
  ADD COLUMN IF NOT EXISTS next_date_5 date,
  ADD COLUMN IF NOT EXISTS next_date_6 date;

ALTER TABLE public.variant_supplier_sources
  ADD COLUMN IF NOT EXISTS next_quantity_4 integer,
  ADD COLUMN IF NOT EXISTS next_quantity_5 integer,
  ADD COLUMN IF NOT EXISTS next_quantity_6 integer,
  ADD COLUMN IF NOT EXISTS next_date_4 date,
  ADD COLUMN IF NOT EXISTS next_date_5 date,
  ADD COLUMN IF NOT EXISTS next_date_6 date;;
