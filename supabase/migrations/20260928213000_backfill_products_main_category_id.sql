-- Migration: backfill_products_main_category_id
-- Projeto canônico: doufsxqlfjyuvxuezpln (PG17). Aplicar SÓ via
-- .github/workflows/db-apply-migration.yml (E15) — CLAUDE.md REGRA #8.
--
-- Contexto (medido em 2026-09-28): 489 products com main_category_id IS NULL
--   (XBZ 450, 88BRINDES 20, STRICKER 10, ASIA 9), todos com category_id
--   preenchido. Convenção real do banco: nos 7.649 produtos com
--   main_category_id preenchido, 100% têm main_category_id = category_id
--   (0 divergentes). fn_sync_main_category_from_pca mantém essa igualdade a
--   partir do product_category_assignments primário. main_category_id é usado
--   por fn_super_filtro/facets, SEO (trg_products_seo_autofill,
--   generate_product_jsonld) e fn_trigger_fill_supplier_subtype — produto sem
--   ele não entra corretamente no filtro por categoria.
--
-- Efeito (idempotente, uma transação via psql -1):
--   UPDATE main_category_id = category_id onde nulo. Nenhum DDL.
--
-- Triggers em products afetados por UPDATE OF main_category_id:
--   - trg_aa_capture_manual_edits: 'main_category_id' está na lista capturada;
--     por isso app.write_source='pipeline' (transação-local) — o campo NÃO entra
--     em locked_fields.
--   - trg_auto_classify_product: WHEN NOT bulk_import_mode → pulado.
--   - trg_fill_supplier_subtype: preenche supplier_subtype com o nome da
--     categoria quando nulo (mesmo efeito que fn_sync_main_category_from_pca
--     já produz hoje). Intencional.
--   - trg_product_automation: pulado por bulk_import_mode/write_source.
--
-- Rollback: `UPDATE products SET main_category_id = NULL WHERE
--   main_category_id = category_id AND updated_at >= '<timestamp UTC do apply>'
--   AND updated_at < '<timestamp UTC do apply> + 1 min'` (os 489 recebem
--   updated_at = now() na mesma transação). Nunca reeditar este arquivo.

SELECT set_config('app.write_source',     'pipeline', true);
SELECT set_config('app.bulk_import_mode', 'true',     true);

UPDATE public.products
SET    main_category_id = category_id,
       updated_at       = now()
WHERE  main_category_id IS NULL
  AND  category_id      IS NOT NULL;

-- Pós-check fail-closed (mesma transação: falha → nada é aplicado)
DO $$
DECLARE
  v_left integer;
BEGIN
  SELECT count(*) INTO v_left
  FROM public.products
  WHERE main_category_id IS NULL AND category_id IS NOT NULL;
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'backfill_products_main_category_id: % produtos ainda sem main_category_id', v_left;
  END IF;
END $$;
