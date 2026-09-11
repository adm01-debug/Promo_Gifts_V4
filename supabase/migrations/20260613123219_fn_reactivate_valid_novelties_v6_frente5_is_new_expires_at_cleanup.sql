
CREATE OR REPLACE FUNCTION public.fn_reactivate_valid_novelties()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
/*
  v6_2026-06-13 — Quadrupla proteção:
  1. DISTINCT ON + NOT EXISTS active (v4)
  2. Hard block: migration_from_supplier NUNCA reativa (source denylist)
  3. Sincroniza is_new_expires_at ao setar is_new=true (M3)
  4. [NOVO] Frente 5: limpa is_new_expires_at/novelty_expires_at órfão
     quando is_new=false mas is_new_expires_at ainda preenchido (gap detectado em 2026-06-13)
*/
DECLARE
  v_novelties_fixed      int := 0;
  v_products_fixed       int := 0;
  v_orphans_fixed        int := 0;
  v_expires_at_cleaned   int := 0;
BEGIN
  -- Frente 1: reativar APENAS produtos SEM novelty ativa, 1 por produto (DISTINCT ON)
  -- v6: quadrupla proteção
  WITH candidates AS (
    SELECT DISTINCT ON (pn.product_id) pn.id
    FROM product_novelties pn
    JOIN products p ON pn.product_id = p.id
    WHERE p.is_active    = true
      AND p.is_stockout  = false
      AND pn.is_active   = false
      AND pn.expires_at  IS NOT NULL
      AND pn.expires_at  > now()
      -- BLOQUEIO ABSOLUTO: migration_from_supplier nunca volta a ativo
      AND pn.source      != 'migration_from_supplier'
      -- CRÍTICO v4: só produtos SEM nenhuma novelty ativa
      AND NOT EXISTS (
        SELECT 1 FROM product_novelties pn_active
        WHERE pn_active.product_id = pn.product_id
          AND pn_active.is_active  = true
      )
    ORDER BY pn.product_id, pn.expires_at DESC
  ),
  fixed AS (
    UPDATE product_novelties pn
    SET is_active = true, updated_at = clock_timestamp()
    WHERE pn.id IN (SELECT id FROM candidates)
    RETURNING pn.product_id
  )
  SELECT COUNT(*) INTO v_novelties_fixed FROM fixed;

  -- Frente 2: desativar novelties de produtos INATIVOS
  WITH deact AS (
    UPDATE product_novelties pn
    SET is_active = false, updated_at = clock_timestamp()
    FROM products p
    WHERE pn.product_id = p.id AND p.is_active = false AND pn.is_active = true
    RETURNING pn.product_id
  ) SELECT COUNT(*) INTO v_orphans_fixed FROM deact;

  -- Frente 2b: desativar novelties de produtos STOCKOUT
  UPDATE product_novelties pn
  SET is_active = false, updated_at = clock_timestamp()
  FROM products p
  WHERE pn.product_id = p.id AND p.is_active = true
    AND p.is_stockout = true AND pn.is_active = true;

  -- Frente 3: sincronizar products.is_new + is_new_expires_at (M3)
  UPDATE products p
  SET is_new = true,
      novelty_detected_at = pn.detected_at,
      novelty_expires_at  = pn.expires_at,
      is_new_expires_at   = pn.expires_at,
      updated_at = now()
  FROM product_novelties pn
  WHERE pn.product_id = p.id AND pn.is_active = true
    AND p.is_active = true AND p.is_stockout = false AND p.is_new = false;
  GET DIAGNOSTICS v_products_fixed = ROW_COUNT;

  -- Frente 4: limpar is_new=true órfão + todos os campos de novelty
  UPDATE products SET
    is_new              = false,
    novelty_detected_at = NULL,
    novelty_expires_at  = NULL,
    is_new_expires_at   = NULL,
    updated_at          = now()
  WHERE is_new = true
    AND NOT EXISTS (SELECT 1 FROM product_novelties pn
      WHERE pn.product_id = products.id AND pn.is_active = true);

  -- Frente 5 [v6 — gap fix 2026-06-13]:
  -- Limpar is_new_expires_at/novelty_expires_at residuais quando:
  -- is_new = false (já limpo) mas is_new_expires_at ainda preenchido
  -- Cenário: produto foi novo → foi para stockout (Frente 2b desativou novelty)
  -- → algo externo setou is_new=false (trigger, gold promote) mas não limpou expires_at
  UPDATE products SET
    is_new_expires_at   = NULL,
    novelty_expires_at  = NULL,
    updated_at          = now()
  WHERE is_new = false
    AND is_new_expires_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM product_novelties pn
      WHERE pn.product_id = products.id AND pn.is_active = true);
  GET DIAGNOSTICS v_expires_at_cleaned = ROW_COUNT;

  RETURN jsonb_build_object(
    'novelties_reactivated',         v_novelties_fixed,
    'inactive_products_deactivated', v_orphans_fixed,
    'products_synced',               v_products_fixed,
    'expires_at_residuals_cleaned',  v_expires_at_cleaned,
    'version',                       'v6_2026-06-13_frente5_gap_fix',
    'ran_at',                        now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_reactivate_valid_novelties() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reactivate_valid_novelties() TO service_role;
;
