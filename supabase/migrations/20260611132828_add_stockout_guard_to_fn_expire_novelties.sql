
-- FIX E07 + E15: adiciona Frente 3 ao fn_expire_novelties()
-- Desativa novidades de produtos que são is_stockout=true
-- (produtos em liquidação não devem ter selo "NOVO")
CREATE OR REPLACE FUNCTION public.fn_expire_novelties()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_novelties_expired   int := 0;
    v_products_fixed      int := 0;
    v_stockout_deactivated int := 0;
    v_result              jsonb;
BEGIN
    IF NOT pg_try_advisory_xact_lock(74108912) THEN
        RETURN jsonb_build_object(
            'status', 'skipped', 'reason', 'advisory_lock_busy', 'ts', now());
    END IF;

    -- ── Frente 1: product_novelties com expires_at vencido ──────
    WITH expired AS (
        UPDATE public.product_novelties
        SET is_active=false, updated_at=clock_timestamp()
        WHERE is_active=true AND expires_at IS NOT NULL AND expires_at < now()
        RETURNING product_id
    )
    SELECT COUNT(*) INTO v_novelties_expired FROM expired;

    -- ── Frente 2: products.is_new orphans ──────────────────────
    WITH stale_products AS (
        UPDATE public.products
        SET is_new=false, novelty_detected_at=NULL, novelty_expires_at=NULL, updated_at=now()
        WHERE is_new=true
          AND novelty_expires_at IS NOT NULL
          AND novelty_expires_at < now()
          AND NOT EXISTS (
              SELECT 1 FROM public.product_novelties pn
              WHERE pn.product_id=products.id AND pn.is_active=true
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_products_fixed FROM stale_products;

    -- ── Frente 3 (NEW): novidades ativas de produtos stockout ─────
    -- Produtos em liquidação (is_stockout=true) NÃO devem ter selo NOVO
    WITH stockout_novelties AS (
        UPDATE public.product_novelties pn
        SET is_active=false, updated_at=clock_timestamp(),
            notes=COALESCE(notes||' | ','')|| 'Desativado automaticamente: produto is_stockout=true'
        FROM public.products p
        WHERE pn.product_id=p.id
          AND pn.is_active=true
          AND p.is_stockout=true
        RETURNING pn.product_id
    )
    SELECT COUNT(*) INTO v_stockout_deactivated FROM stockout_novelties;

    v_result := jsonb_build_object(
        'status',                 'ok',
        'novelties_expired',      v_novelties_expired,
        'products_stale_fixed',   v_products_fixed,
        'stockout_deactivated',   v_stockout_deactivated,
        'total_actions',          v_novelties_expired + v_products_fixed + v_stockout_deactivated,
        'ran_at',                 now()
    );
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fn_expire_novelties() IS
    'Expira novidades em 3 frentes: '
    '(1) product_novelties com expires_at vencido; '
    '(2) products.is_new orphans stale; '
    '(3) novelties de produtos is_stockout=true. '
    'Advisory lock 74108912. clock_timestamp() para updated_at preciso.';
;
