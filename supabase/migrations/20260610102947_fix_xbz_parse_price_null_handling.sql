-- Fix: tratar PrecoVenda=NULL como 0 (usar Formatado como fallback)
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
  -- NULL ou vazio → 0 (vai usar Formatado como fallback)
  IF p_preco_venda IS NOT NULL AND p_preco_venda != '' THEN
    BEGIN
      v_raw := p_preco_venda::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      v_raw := 0;
    END;
  END IF;

  -- Se PrecoVenda = 0 OU NULL, tentar PrecoVendaFormatado (pt-BR: vírgula decimal)
  IF COALESCE(v_raw, 0) = 0 AND p_preco_formatado IS NOT NULL THEN
    BEGIN
      v_fmt := REPLACE(p_preco_formatado, ',', '.')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      v_fmt := 0;
    END;
    IF COALESCE(v_fmt, 0) > 0.05 THEN  -- ignora valores absurdamente baixos (R$0.01)
      RETURN v_fmt;
    END IF;
  END IF;

  -- Se PrecoVenda > 0, usar diretamente
  IF COALESCE(v_raw, 0) > 0 THEN RETURN v_raw; END IF;

  -- Ambos zero ou inválidos → NULL (não temos preço)
  RETURN NULL;
END;
$$;;
