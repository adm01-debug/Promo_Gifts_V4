
-- FIX: Frente 4 — stockout orphans sem novelty ativa
-- Cobre o caso: pipeline set is_new=true diretamente em products (sem passar por product_novelties)
-- para produtos que são is_stockout=true — esses nunca devem ter badge NOVO
CREATE OR REPLACE FUNCTION public.fn_expire_novelties()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_novelties_expired    int := 0;
    v_products_fixed       int := 0;
    v_stockout_deactivated int := 0;
    v_stockout_orphans     int := 0;
    v_result               jsonb;
BEGIN
    IF NOT pg_try_advisory_xact_lock(74108912) THEN
        RETURN jsonb_build_object('status','skipped','reason','advisory_lock_busy','ts',now());
    END IF;

    -- ── Frente 1: product_novelties com expires_at vencido ──────────
    WITH expired AS (
        UPDATE public.product_novelties
        SET is_active=false, updated_at=clock_timestamp()
        WHERE is_active=true AND expires_at IS NOT NULL AND expires_at < now()
        RETURNING product_id
    ) SELECT COUNT(*) INTO v_novelties_expired FROM expired;

    -- ── Frente 2: orphans stale em products (expires passado, sem novelty ativa) ──
    WITH stale AS (
        UPDATE public.products
        SET is_new=false, novelty_detected_at=NULL, novelty_expires_at=NULL, updated_at=now()
        WHERE is_new=true
          AND novelty_expires_at IS NOT NULL AND novelty_expires_at < now()
          AND NOT EXISTS(
              SELECT 1 FROM public.product_novelties pn
              WHERE pn.product_id=products.id AND pn.is_active=true)
        RETURNING id
    ) SELECT COUNT(*) INTO v_products_fixed FROM stale;

    -- ── Frente 3: novelties ativas de produtos is_stockout=true ─────
    WITH stockout AS (
        UPDATE public.product_novelties pn
        SET is_active=false, updated_at=clock_timestamp(),
            notes=COALESCE(notes||' | ','')|| 'Desativado: produto is_stockout=true'
        FROM public.products p
        WHERE pn.product_id=p.id AND pn.is_active=true AND p.is_stockout=true
        RETURNING pn.product_id
    ) SELECT COUNT(*) INTO v_stockout_deactivated FROM stockout;

    -- ── Frente 4 (NEW): orphans stockout em products sem novelty ativa ──
    -- Pipeline pode setar is_new=true diretamente em products mesmo para
    -- produtos is_stockout=true. Essa frente corrige os orphans resultantes.
    WITH stockout_orphans AS (
        UPDATE public.products
        SET is_new=false, novelty_detected_at=NULL, novelty_expires_at=NULL, updated_at=now()
        WHERE is_stockout=true
          AND is_new=true
          AND NOT EXISTS(
              SELECT 1 FROM public.product_novelties pn
              WHERE pn.product_id=products.id AND pn.is_active=true)
        RETURNING id
    ) SELECT COUNT(*) INTO v_stockout_orphans FROM stockout_orphans;

    v_result := jsonb_build_object(
        'status',                 'ok',
        'novelties_expired',      v_novelties_expired,
        'products_stale_fixed',   v_products_fixed,
        'stockout_deactivated',   v_stockout_deactivated,
        'stockout_orphans_fixed', v_stockout_orphans,
        'total_actions',          v_novelties_expired + v_products_fixed + v_stockout_deactivated + v_stockout_orphans,
        'ran_at',                 now()
    );
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fn_expire_novelties() IS
    'Expira novidades em 4 frentes: '
    '(1) product_novelties com expires_at vencido; '
    '(2) products.is_new orphans stale (expires passado, sem novelty ativa); '
    '(3) novelties ativas de produtos is_stockout=true; '
    '(4) products.is_new orphans stockout (pipeline setou diretamente, sem novelty ativa). '
    'Advisory lock 74108912. clock_timestamp() para updated_at preciso.';
;
