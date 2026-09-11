
-- ══════════════════════════════════════════════════════════════════
-- Melhoria D: Adicionar coluna escalar dimensions_source
-- Migra o último dado único do jsonb dimensions (unit_detected)
-- para um campo de primeira classe.
-- Após isso: TODOS os dados de dimensions têm equivalente escalar
-- → dimensions torna-se candidata real a DROP.
-- ══════════════════════════════════════════════════════════════════

-- D1: Adicionar coluna
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS dimensions_source varchar(20)
  CHECK (dimensions_source IS NULL
         OR dimensions_source IN ('cm', 'mm', 'estimated', 'manual', 'supplier'));

COMMENT ON COLUMN public.products.dimensions_source IS
'Origem/unidade das dimensões detectadas pelo pipeline.
Valores: cm (extraído do nome em cm), mm (extraído do nome em mm → convertido p/ cm),
         estimated (estimado pelo pipeline), manual (editado manualmente), supplier (fornecido pelo fornecedor).
Migrado de dimensions->unit_detected (jsonb) em 2026-06-23 (Melhoria D).
Após esta migração, dimensions jsonb não tem mais dados únicos.';

-- D2: Backfill a partir do jsonb
SELECT set_config('app.write_source', 'pipeline', true);
SELECT set_config('app.bulk_import_mode', 'true', true);

UPDATE public.products
SET dimensions_source = (dimensions->>'unit_detected')
WHERE dimensions IS NOT NULL
  AND dimensions->>'unit_detected' IS NOT NULL
  AND dimensions_source IS NULL;

SELECT set_config('app.write_source', 'ui', true);
SELECT set_config('app.bulk_import_mode', 'false', true);

-- D3: Índice parcial para filtragem por fonte
CREATE INDEX IF NOT EXISTS idx_products_dimensions_source
  ON public.products(dimensions_source)
  WHERE dimensions_source IS NOT NULL;
;
