CREATE OR REPLACE FUNCTION public.fn_expire_novelties_with_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/*
  v2_2026-06-13 — Expira novidades vencidas + sincroniza is_new=false imediatamente.
  FIX vs v1: v1 só desativava product_novelties mas não sincronizava is_new em products.
  Isso causava janela de até ~65min onde o produto ainda mostrava is_new=true
  (até fn_reactivate Frente 4 rodar na hora seguinte).
*/
DECLARE
    v_expired        INTEGER;
    v_before_count   INTEGER;
    v_after_count    INTEGER;
    v_is_new_cleared INTEGER;
BEGIN
    -- Contar antes
    SELECT COUNT(*) INTO v_before_count
    FROM product_novelties WHERE is_active = TRUE;

    -- Expirar novidades onde expires_at já passou
    WITH expired_ids AS (
        UPDATE product_novelties
        SET is_active = FALSE, updated_at = now()
        WHERE is_active = TRUE
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
        RETURNING product_id
    )
    -- Sincronizar is_new=false para produtos cujas novidades expiraram
    -- e que NÃO têm nenhuma outra novelty ativa
    UPDATE products p
    SET is_new              = FALSE,
        novelty_detected_at = NULL,
        novelty_expires_at  = NULL,
        is_new_expires_at   = NULL,
        updated_at          = now()
    WHERE p.id IN (SELECT product_id FROM expired_ids)
      AND p.is_new = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM product_novelties pn
          WHERE pn.product_id = p.id AND pn.is_active = TRUE
      );

    GET DIAGNOSTICS v_is_new_cleared = ROW_COUNT;

    -- Total expirado (separado para não usar CTEs no GET DIAGNOSTICS)
    SELECT COUNT(*) INTO v_expired
    FROM product_novelties
    WHERE is_active = FALSE
      AND updated_at >= now() - interval '10 seconds';

    SELECT COUNT(*) INTO v_after_count
    FROM product_novelties WHERE is_active = TRUE;

    RAISE NOTICE 'fn_expire v2: expiradas=% is_new_cleared=% ativas_antes=% ativas_depois=%',
                 v_expired, v_is_new_cleared, v_before_count, v_after_count;

    RETURN jsonb_build_object(
        'version',         'v2_2026-06-13',
        'expired_count',   v_expired,
        'is_new_cleared',  v_is_new_cleared,
        'active_before',   v_before_count,
        'active_after',    v_after_count,
        'executed_at',     NOW(),
        'next_expiring', (
            SELECT MIN(expires_at)
            FROM product_novelties
            WHERE is_active = TRUE AND expires_at > NOW()
        )
    );
END;
$function$
