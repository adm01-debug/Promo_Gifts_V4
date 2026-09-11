
-- ============================================================
-- FIX P2-A: fn_sync_derived_product_flags v3
-- MUDANÇA: Remove lógica "stockout → is_on_sale" completamente.
-- is_on_sale agora deve ser setado APENAS por:
--   (a) Pipeline do fornecedor com dado real de promoção
--   (b) Admin manual com is_on_sale_expires_at obrigatório
-- O badge "Fora de estoque" já é tratado por is_stockout.
-- Manter: auto-reset (limpa is_on_sale residual quando estoque volta)
-- Manter: expiração por expires_at (para promoções futuras)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_derived_product_flags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_on_sale_cleared  integer := 0;
  v_on_sale_expired  integer := 0;
  v_new_expired      integer := 0;
  v_featured_exp     integer := 0;
  v_bestseller_exp   integer := 0;
BEGIN

  -- ── AUTO-RESET is_on_sale residual ───────────────────────────────
  -- Remove is_on_sale=TRUE de produtos que NÃO têm expires_at definido
  -- (limpeza de resíduos de lógica antiga stockout→onsale)
  -- Promoções manuais legítimas TÊM expires_at → ficam protegidas.
  UPDATE products
  SET is_on_sale = false, updated_at = now()
  WHERE is_on_sale  = true
    AND is_on_sale_expires_at IS NULL;
  GET DIAGNOSTICS v_on_sale_cleared = ROW_COUNT;

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
    'version',               'v3_2026-06-14_remove_stockout_onsale',
    'is_on_sale_cleared',    v_on_sale_cleared,
    'is_on_sale_expired',    v_on_sale_expired,
    'is_new_expired',        v_new_expired,
    'is_featured_expired',   v_featured_exp,
    'is_bestseller_expired', v_bestseller_exp
  );
END;
$$;
;
