
-- ============================================================
-- FIX #1: Adiciona colunas geradas como alias para next_date_1
-- e next_quantity_1 — resolve 100% dos erros HTTP 400 no
-- endpoint /rest/v1/product_variants
-- 
-- MOTIVO: O frontend solicita `next_entry_date` e
-- `next_entry_quantity`, mas o schema tem next_date_1..6 e
-- next_quantity_1..6. GENERATED ALWAYS AS (STORED) garante
-- sincronia automática em toda escrita em next_date_1 / next_quantity_1.
-- ============================================================

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS next_entry_date    date
    GENERATED ALWAYS AS (next_date_1) STORED,
  ADD COLUMN IF NOT EXISTS next_entry_quantity integer
    GENERATED ALWAYS AS (next_quantity_1) STORED;

-- Índice parcial para acelerar filtros de estoque futuro
-- (ex.: variantes com reposição prevista)
CREATE INDEX IF NOT EXISTS idx_pv_next_entry_date_nonnull
  ON public.product_variants (next_entry_date)
  WHERE next_entry_date IS NOT NULL;

-- Notifica PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

-- COMENTÁRIO DESCRITIVO nas colunas geradas
COMMENT ON COLUMN public.product_variants.next_entry_date IS
  'Alias gerado de next_date_1 (primeira data de entrada prevista). Somente leitura — GENERATED STORED.';

COMMENT ON COLUMN public.product_variants.next_entry_quantity IS
  'Alias gerado de next_quantity_1 (quantidade da primeira entrada prevista). Somente leitura — GENERATED STORED.';
;
