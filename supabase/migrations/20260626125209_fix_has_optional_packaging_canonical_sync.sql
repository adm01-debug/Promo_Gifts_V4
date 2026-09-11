-- ════════════════════════════════════════════════════════════════════
-- MELHORIA 1: Unificar definicao canonica de has_optional_packaging
-- Causa raiz: trg_set_has_optional_packaging (products) ignorava compat e
-- zerava a flag a cada UPDATE, conflitando com trg_compat_sync_optional.
-- Correcao: formula canonica IDENTICA nos 2 caminhos + backfill.
-- fix_version=2026-06-26_canonical_v1
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_trigger_set_has_optional_packaging()
 RETURNS trigger LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- ANTI-REGRESSAO: a flag DEVE considerar compat dimensional (EXISTS) para
  -- nao oscilar a cada UPDATE do produto (preco/estoque). Nao remover o EXISTS.
  NEW.has_optional_packaging :=
        COALESCE((NEW.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR NEW.optional_packaging_ref IS NOT NULL
        OR NEW.packing_classification = 'protective'
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c
                   WHERE c.product_id = NEW.id AND c.active);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_recalc_has_optional_packaging(p_product_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- ANTI-REGRESSAO: formula identica ao trigger de products (canonical_v1)
  UPDATE products p
  SET has_optional_packaging = (
        COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR p.optional_packaging_ref IS NOT NULL
        OR p.packing_classification = 'protective'
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active))
  WHERE p.id = p_product_id
    AND p.has_optional_packaging IS DISTINCT FROM (
        COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR p.optional_packaging_ref IS NOT NULL
        OR p.packing_classification = 'protective'
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active));
END$function$;

-- Backfill canonico (somente linhas divergentes)
UPDATE products p
SET has_optional_packaging = (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL
      OR p.packing_classification = 'protective'
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active))
WHERE p.product_type IN ('product','kit')
  AND COALESCE(p.has_optional_packaging,false) IS DISTINCT FROM (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL
      OR p.packing_classification = 'protective'
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active));

NOTIFY pgrst, 'reload schema';;
