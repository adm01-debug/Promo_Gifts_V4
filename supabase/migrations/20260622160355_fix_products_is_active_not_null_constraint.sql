
-- GAP-3: Adicionar NOT NULL constraint em products.is_active
-- Verificado: COUNT(*) WHERE is_active IS NULL = 0 (D04 PASS)
-- Coluna já tem DEFAULT true, então novos inserts sem valor ficam TRUE
-- Esta constraint impede futuros NULLs acidentais

-- BEGIN dry-run mental: qualquer NULL existente causaria falha em ALTER
-- D04 provou COUNT=0, então é seguro executar diretamente

ALTER TABLE public.products
  ALTER COLUMN is_active SET NOT NULL;

-- Verificação imediata
DO $$
BEGIN
  IF (SELECT is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name='products' AND column_name='is_active') = 'NO'
  THEN
    RAISE NOTICE 'PASS: products.is_active NOT NULL constraint aplicada com sucesso';
  ELSE
    RAISE EXCEPTION 'FAIL: constraint NOT NULL não foi aplicada';
  END IF;
END;
$$;
;
