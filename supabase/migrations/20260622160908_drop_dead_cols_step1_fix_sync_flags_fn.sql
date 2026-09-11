
-- MELHORIA 1 · PASSO 1/5
-- Remove lógica de is_on_sale/is_on_sale_expires_at de fn_sync_derived_product_flags
-- Mantém intacta a lógica de is_new, is_featured, is_bestseller
CREATE OR REPLACE FUNCTION public.fn_sync_derived_product_flags()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_expired      integer := 0;
  v_featured_exp     integer := 0;
  v_bestseller_exp   integer := 0;
BEGIN
  -- is_new: limpa produtos com novidade expirada
  UPDATE products
  SET is_new = false, updated_at = now()
  WHERE is_new = true
    AND is_new_expires_at IS NOT NULL
    AND is_new_expires_at < now();
  GET DIAGNOSTICS v_new_expired = ROW_COUNT;

  -- is_featured: limpa produtos com destaque expirado
  UPDATE products
  SET is_featured = false, updated_at = now()
  WHERE is_featured = true
    AND is_featured_expires_at IS NOT NULL
    AND is_featured_expires_at < now();
  GET DIAGNOSTICS v_featured_exp = ROW_COUNT;

  -- is_bestseller: limpa produtos com bestseller expirado
  UPDATE products
  SET is_bestseller = false, updated_at = now()
  WHERE is_bestseller = true
    AND is_bestseller_expires_at IS NOT NULL
    AND is_bestseller_expires_at < now();
  GET DIAGNOSTICS v_bestseller_exp = ROW_COUNT;

  RETURN jsonb_build_object(
    'version',               'v4_2026-06-22_removed_on_sale',
    'is_new_expired',        v_new_expired,
    'is_featured_expired',   v_featured_exp,
    'is_bestseller_expired', v_bestseller_exp
  );
END;
$function$;
;
