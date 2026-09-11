-- ════════════════════════════════════════════════════════════════════════
-- MELHORIA 1: Sincronização canônica de products.has_optional_packaging
-- Definição: flag = (menção do fornecedor) OR (existe compat dimensional ativa)
-- Corrige 1.435 falsos-negativos (têm caixa, flag dizia não) e
--         1.347 falsos-positivos (polybag 'protective', sem evidência)
-- fix_version: 2026-06-26.m1 | ANTI-REGRESSÃO: não remover SET search_path
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_recalc_has_optional_packaging(p_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE products p
  SET has_optional_packaging = (
        COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR p.optional_packaging_ref IS NOT NULL
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active)
      )
  WHERE p.id = p_product_id
    AND p.has_optional_packaging IS DISTINCT FROM (
        COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR p.optional_packaging_ref IS NOT NULL
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active)
      );
END$$;
COMMENT ON FUNCTION fn_recalc_has_optional_packaging(uuid) IS
  'fix_version 2026-06-26.m1 — recalcula has_optional_packaging (menção OR compat ativa). Mantém SET search_path=public.';

CREATE OR REPLACE FUNCTION fn_trg_compat_sync_optional()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    PERFORM fn_recalc_has_optional_packaging(OLD.product_id); RETURN OLD;
  ELSE
    PERFORM fn_recalc_has_optional_packaging(NEW.product_id);
    IF TG_OP='UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      PERFORM fn_recalc_has_optional_packaging(OLD.product_id);
    END IF;
    RETURN NEW;
  END IF;
END$$;
COMMENT ON FUNCTION fn_trg_compat_sync_optional() IS
  'fix_version 2026-06-26.m1 — mantém products.has_optional_packaging sincronizada com compat. Mantém SET search_path=public.';

REVOKE EXECUTE ON FUNCTION fn_recalc_has_optional_packaging(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION fn_trg_compat_sync_optional() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_compat_sync_optional ON product_packaging_compatibility;
CREATE TRIGGER trg_compat_sync_optional
AFTER INSERT OR UPDATE OR DELETE ON product_packaging_compatibility
FOR EACH ROW EXECUTE FUNCTION fn_trg_compat_sync_optional();

-- Backfill canônico (set-based)
UPDATE products p
SET has_optional_packaging = (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active)
    )
WHERE p.product_type IN ('product','kit')
  AND p.has_optional_packaging IS DISTINCT FROM (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active)
    );;
