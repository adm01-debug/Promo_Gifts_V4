-- Melhoria 2/4 — Backfill definitivo da projeção + documentação.
-- Dry-run confirmou: +7 linhas, 0 perda de dado, box_length_cm 3053->3402.
DO $$
DECLARE r record; BEGIN
  FOR r IN SELECT id FROM products
           WHERE weight_g IS NOT NULL OR length_cm IS NOT NULL OR width_cm IS NOT NULL
              OR height_cm IS NOT NULL OR diameter_cm IS NOT NULL
  LOOP PERFORM public.fn_sync_product_physical_from_products(r.id); END LOOP;
END $$;

COMMENT ON TABLE public.product_physical IS
  'Projeção derivada (slim-down da products). FONTE-DA-VERDADE = public.products para todos os campos físicos/caixa. '
  'Sincronizada por fn_sync_product_physical_from_products (COALESCE-safe, transform mm->cm) via trigger trg_sync_product_physical. '
  'Colunas EXCLUSIVAS do satélite (não vêm de products): internal_length_cm, internal_width_cm, internal_height_cm. '
  'fix_version=2026-06-26_physical_sourcetruth. NÃO escrever campos físicos diretamente aqui fora do fluxo de sync.';

COMMENT ON COLUMN public.product_physical.box_length_cm IS 'Derivado de products.box_length_mm/10 (precedência) ou products.box_length_cm. Fonte-da-verdade: products.';
COMMENT ON COLUMN public.product_physical.internal_length_cm IS 'Coluna EXCLUSIVA do satélite (dimensão interna). Preservada por COALESCE no sync.';

ANALYZE public.product_physical;;
