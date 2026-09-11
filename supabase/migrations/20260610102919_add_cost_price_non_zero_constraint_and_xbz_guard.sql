-- ═══════════════════════════════════════════════════════
-- 1. CHECK CONSTRAINT: cost_price nunca pode ser = 0
-- NULL é OK (preço desconhecido); > 0 é o valor real
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.products
  ADD CONSTRAINT chk_cost_price_not_zero
  CHECK (cost_price IS NULL OR cost_price > 0);

-- ═══════════════════════════════════════════════════════
-- 2. Mesmo constraint em variant_supplier_sources
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.variant_supplier_sources
  ADD CONSTRAINT chk_vss_cost_price_not_zero
  CHECK (cost_price IS NULL OR cost_price > 0);

-- ═══════════════════════════════════════════════════════
-- 3. Função auxiliar: parse de PrecoVendaFormatado XBZ
-- converte "2,46" → 2.46 com fallback seguro
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_xbz_parse_price(
  p_preco_venda      TEXT,
  p_preco_formatado  TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_raw  NUMERIC := 0;
  v_fmt  NUMERIC := 0;
BEGIN
  -- Tentar PrecoVenda primeiro (já é numeric-string)
  BEGIN
    v_raw := p_preco_venda::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    v_raw := 0;
  END;

  -- Se PrecoVenda = 0, tentar PrecoVendaFormatado (pt-BR: vírgula decimal)
  IF v_raw = 0 AND p_preco_formatado IS NOT NULL THEN
    BEGIN
      v_fmt := REPLACE(p_preco_formatado, ',', '.')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      v_fmt := 0;
    END;
    IF v_fmt > 0.05 THEN   -- ignora valores absurdamente baixos (R$0.01 = catálogo grátis)
      RETURN v_fmt;
    END IF;
  END IF;

  -- Se PrecoVenda > 0, usar diretamente
  IF v_raw > 0 THEN RETURN v_raw; END IF;

  -- Ambos zero ou inválidos → NULL (não temos preço)
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.fn_xbz_parse_price(TEXT, TEXT) IS
  'Parse preço XBZ: usa PrecoVenda se > 0; fallback para PrecoVendaFormatado (vírgula→ponto).
   Retorna NULL quando ambos são 0 ou inválidos. Previne cost_price=0 no Gold.';
COMMENT ON CONSTRAINT chk_cost_price_not_zero ON public.products IS
  'cost_price NUNCA pode ser 0: NULL=desconhecido, >0=valor real.';
COMMENT ON CONSTRAINT chk_vss_cost_price_not_zero ON public.variant_supplier_sources IS
  'cost_price nunca 0 em variant_supplier_sources. Usar NULL para preço desconhecido.';;
