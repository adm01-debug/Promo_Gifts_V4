
-- ============================================================
-- FIX P0-B: fn_sync_derived_product_flags v2
-- MUDANÇAS vs v1:
--   1. Adicionado bloco de AUTO-RESET: is_on_sale=FALSE quando estoque volta
--   2. O reset respeita is_on_sale_expires_at (promoções manuais protegidas)
--   3. Inclui produtos inativos no reset (limpeza geral)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_derived_product_flags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_on_sale_set      integer := 0;
  v_on_sale_cleared  integer := 0;   -- reset quando estoque volta
  v_on_sale_expired  integer := 0;   -- limpeza por expires_at
  v_new_expired      integer := 0;
  v_featured_exp     integer := 0;
  v_bestseller_exp   integer := 0;
BEGIN

  -- ── AUTO-RESET is_on_sale quando estoque voltou ───────────────────
  -- Limpa produtos que tinham is_on_sale=TRUE por stockout mas agora
  -- têm estoque (is_stockout=FALSE). Não toca produtos com expires_at
  -- manual (promoções legítimas definidas pelo time).
  UPDATE products
  SET is_on_sale = false, updated_at = now()
  WHERE is_on_sale  = true
    AND is_stockout = false
    AND is_on_sale_expires_at IS NULL;
  GET DIAGNOSTICS v_on_sale_cleared = ROW_COUNT;

  -- ── ATIVAR is_on_sale por stockout ───────────────────────────────
  -- Ativa SOMENTE para produtos ativos sem estoque que ainda não estão
  -- marcados como on_sale (e sem expires_at manual).
  UPDATE products
  SET is_on_sale = true, updated_at = now()
  WHERE is_active   = true
    AND is_stockout = true
    AND is_on_sale  = false
    AND is_on_sale_expires_at IS NULL;
  GET DIAGNOSTICS v_on_sale_set = ROW_COUNT;

  -- ── EXPIRAR is_on_sale por expires_at ────────────────────────────
  UPDATE products
  SET is_on_sale = false, updated_at = now()
  WHERE is_on_sale = true
    AND is_on_sale_expires_at IS NOT NULL
    AND is_on_sale_expires_at < now();
  GET DIAGNOSTICS v_on_sale_expired = ROW_COUNT;

  -- ── EXPIRAR is_new ────────────────────────────────────────────────
  UPDATE products
  SET is_new = false, updated_at = now()
  WHERE is_new = true
    AND is_new_expires_at IS NOT NULL
    AND is_new_expires_at < now();
  GET DIAGNOSTICS v_new_expired = ROW_COUNT;

  -- ── EXPIRAR is_featured ───────────────────────────────────────────
  UPDATE products
  SET is_featured = false, updated_at = now()
  WHERE is_featured = true
    AND is_featured_expires_at IS NOT NULL
    AND is_featured_expires_at < now();
  GET DIAGNOSTICS v_featured_exp = ROW_COUNT;

  -- ── EXPIRAR is_bestseller ─────────────────────────────────────────
  UPDATE products
  SET is_bestseller = false, updated_at = now()
  WHERE is_bestseller = true
    AND is_bestseller_expires_at IS NOT NULL
    AND is_bestseller_expires_at < now();
  GET DIAGNOSTICS v_bestseller_exp = ROW_COUNT;

  RETURN jsonb_build_object(
    'version',            'v2_2026-06-14_auto_reset',
    'is_on_sale_cleared', v_on_sale_cleared,
    'is_on_sale_set',     v_on_sale_set,
    'is_on_sale_expired', v_on_sale_expired,
    'is_new_expired',     v_new_expired,
    'is_featured_expired',   v_featured_exp,
    'is_bestseller_expired', v_bestseller_exp
  );
END;
$$;
;
