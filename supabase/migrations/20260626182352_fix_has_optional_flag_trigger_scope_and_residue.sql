-- ════════════════════════════════════════════════════════════════════
-- CORRECAO DE GAP (achado em teste adversarial): trg_set_has_optional_packaging
-- so observava packing_classification, deixando 2 produtos com flag dessincronizada
-- (residuo historico) e nao ressincronizando mudancas de optional_packaging_ref /
-- description_packaging_info. Correcao: re-backfill global + ampliar escopo do trigger.
-- A sincronizacao por mudanca de COMPAT continua coberta por trg_compat_sync_optional.
-- fix_version=2026-06-26_flag_trigger_scope_v1
-- ════════════════════════════════════════════════════════════════════

UPDATE products p SET has_optional_packaging = (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')))
WHERE p.product_type IN ('product','kit') AND COALESCE(p.has_optional_packaging,false) IS DISTINCT FROM (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')));

-- ANTI-REGRESSAO: o trigger DEVE observar as 3 colunas de sinal (nao apenas packing_classification)
DROP TRIGGER IF EXISTS trg_set_has_optional_packaging ON products;
CREATE TRIGGER trg_set_has_optional_packaging
  BEFORE INSERT OR UPDATE OF packing_classification, optional_packaging_ref, description_packaging_info
  ON products FOR EACH ROW EXECUTE FUNCTION fn_trigger_set_has_optional_packaging();

NOTIFY pgrst, 'reload schema';;
