
-- ══════════════════════════════════════════════════════════════════
-- fn_expire_novelties(): expira novidades vencidas (G-03)
-- Atua em DUAS frentes:
--   1. product_novelties: is_active=false quando expires_at < now()
--   2. products: is_new=false quando novelty_expires_at < now()
--      (cobre produtos com flags diretos mas sem registro em product_novelties)
-- Advisory lock: 74108912 (evita corrida com outras chamadas)
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_expire_novelties()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_novelties_expired   int := 0;
    v_products_fixed      int := 0;
    v_result              jsonb;
BEGIN
    -- Advisory lock: só uma instância roda por vez
    IF NOT pg_try_advisory_xact_lock(74108912) THEN
        RETURN jsonb_build_object(
            'status',  'skipped',
            'reason',  'advisory_lock_busy',
            'ts',      now()
        );
    END IF;

    -- ── Frente 1: product_novelties com expires_at vencido ──────
    WITH expired AS (
        UPDATE public.product_novelties
        SET    is_active  = false,
               updated_at = now()
        WHERE  is_active   = true
          AND  expires_at  IS NOT NULL
          AND  expires_at  < now()
        RETURNING product_id
    )
    SELECT COUNT(*) INTO v_novelties_expired FROM expired;

    -- ── Frente 2: products.is_new orphans (sem product_novelties) ─
    -- Cobre o legado: produtos que tinham is_new=true direto no Gold
    -- mas novelty_expires_at já passou (os 127 stale da STRICKER)
    WITH stale_products AS (
        UPDATE public.products
        SET    is_new              = false,
               novelty_detected_at = NULL,
               novelty_expires_at  = NULL,
               updated_at          = now()
        WHERE  is_new            = true
          AND  novelty_expires_at IS NOT NULL
          AND  novelty_expires_at < now()
          -- Não tem registro ativo em product_novelties
          AND  NOT EXISTS (
                SELECT 1 FROM public.product_novelties pn
                WHERE  pn.product_id = products.id
                  AND  pn.is_active  = true
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_products_fixed FROM stale_products;

    v_result := jsonb_build_object(
        'status',                 'ok',
        'novelties_expired',      v_novelties_expired,
        'products_stale_fixed',   v_products_fixed,
        'total_actions',          v_novelties_expired + v_products_fixed,
        'ran_at',                 now()
    );

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fn_expire_novelties() IS
    'Expira novidades vencidas em DUAS frentes: product_novelties e products.is_new orphans. '
    'Complementa a Edge Function cleanup-novelties. Advisory lock 74108912. '
    'Retorna JSON com contagens de ações realizadas.';

REVOKE ALL ON FUNCTION public.fn_expire_novelties() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_expire_novelties() TO service_role;
;
