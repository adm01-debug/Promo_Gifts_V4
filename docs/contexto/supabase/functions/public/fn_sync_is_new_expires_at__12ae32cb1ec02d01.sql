CREATE OR REPLACE FUNCTION public.fn_sync_is_new_expires_at()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/*
  v1_2026-06-13 — Mantém is_new_expires_at sincronizado com product_novelties.
  Chamado pelos jobs de novelty para garantir que a coluna reflita a realidade.
*/
DECLARE
  v_set int := 0;
  v_cleared int := 0;
BEGIN
  -- Setar: produtos is_new=true com novelty ativa mas is_new_expires_at NULL
  WITH d AS (
    UPDATE products p
    SET is_new_expires_at = pn.expires_at, updated_at = now()
    FROM product_novelties pn
    WHERE pn.product_id = p.id
      AND pn.is_active = true
      AND p.is_new = true
      AND (p.is_new_expires_at IS NULL OR p.is_new_expires_at != pn.expires_at)
    RETURNING 1
  ) SELECT count(*) INTO v_set FROM d;

  -- Limpar: produtos is_new=false que ainda têm is_new_expires_at preenchido
  WITH d AS (
    UPDATE products
    SET is_new_expires_at = NULL, updated_at = now()
    WHERE is_new = false
      AND is_new_expires_at IS NOT NULL
    RETURNING 1
  ) SELECT count(*) INTO v_cleared FROM d;

  RAISE NOTICE 'fn_sync_is_new_expires_at: set=% cleared=%', v_set, v_cleared;
  RETURN v_set + v_cleared;
END $function$
