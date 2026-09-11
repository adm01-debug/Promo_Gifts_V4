
-- ============================================================
-- FIX #5A: CHECK CONSTRAINT — is_on_sale obriga expires_at
-- Impede is_on_sale=TRUE sem data de expiração (promoção sem prazo)
-- ============================================================
ALTER TABLE public.products
  ADD CONSTRAINT chk_on_sale_requires_expires
  CHECK (NOT (is_on_sale = TRUE AND is_on_sale_expires_at IS NULL));

COMMENT ON CONSTRAINT chk_on_sale_requires_expires ON public.products IS
'Garante que toda promoção tenha data de expiração. is_on_sale=TRUE sem is_on_sale_expires_at é proibido. Use fn_set_product_on_sale() para ativar promoções.';

-- ============================================================
-- FIX #5B: FUNÇÃO HELPER — ativar promoção com prazo obrigatório
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_set_product_on_sale(
  p_product_id    uuid,
  p_expires_at    timestamptz,
  p_discount_pct  numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sku    text;
  v_name   text;
BEGIN
  -- Validações
  IF p_expires_at IS NULL THEN
    RAISE EXCEPTION 'p_expires_at é obrigatório para promoções (constraint chk_on_sale_requires_expires)';
  END IF;
  IF p_expires_at <= NOW() THEN
    RAISE EXCEPTION 'p_expires_at deve ser uma data futura (recebido: %)', p_expires_at;
  END IF;
  IF p_discount_pct IS NOT NULL AND (p_discount_pct <= 0 OR p_discount_pct >= 100) THEN
    RAISE EXCEPTION 'p_discount_pct deve estar entre 0 e 100 (recebido: %)', p_discount_pct;
  END IF;

  SELECT sku, name INTO v_sku, v_name FROM products WHERE id=p_product_id;
  IF v_sku IS NULL THEN
    RAISE EXCEPTION 'Produto % não encontrado', p_product_id;
  END IF;

  -- Ativar promoção
  UPDATE products
  SET
    is_on_sale            = TRUE,
    is_on_sale_expires_at = p_expires_at,
    updated_at            = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'status',           'on_sale_ativado',
    'product_id',       p_product_id,
    'sku',              v_sku,
    'name',             v_name,
    'expires_at',       p_expires_at,
    'discount_pct',     p_discount_pct,
    'dias_restantes',   EXTRACT(DAY FROM p_expires_at - NOW())::integer
  );
END;
$$;

-- ============================================================
-- FIX #5C: FUNÇÃO HELPER — remover promoção
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_remove_product_on_sale(
  p_product_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_sku text;
BEGIN
  SELECT sku INTO v_sku FROM products WHERE id=p_product_id;
  UPDATE products
  SET is_on_sale=FALSE, is_on_sale_expires_at=NULL, updated_at=NOW()
  WHERE id=p_product_id;
  RETURN jsonb_build_object('status','on_sale_removido','sku',v_sku);
END;
$$;

COMMENT ON FUNCTION public.fn_set_product_on_sale IS
'Ativa promoção em um produto com data de expiração obrigatória. Parâmetros: product_id, expires_at (futuro), discount_pct (opcional, 0-100). Respeita constraint chk_on_sale_requires_expires.';
COMMENT ON FUNCTION public.fn_remove_product_on_sale IS
'Remove promoção de um produto (is_on_sale=FALSE, is_on_sale_expires_at=NULL).';
;
