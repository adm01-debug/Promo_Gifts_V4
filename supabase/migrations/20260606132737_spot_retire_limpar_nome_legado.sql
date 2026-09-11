-- Aposenta limpar_nome_produto_spot: substitui pela versão canônica (fn_clean_spot_name).
-- Assinatura original: (p_name text) → mantida para compatibilidade.
CREATE OR REPLACE FUNCTION public.limpar_nome_produto_spot(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public','extensions' AS $$
  -- DEPRECATED: use fn_clean_spot_name(p_name) diretamente.
  -- Esta função existe apenas como alias de compatibilidade retroativa.
  SELECT public.fn_clean_spot_name(p_name);
$$;

COMMENT ON FUNCTION public.limpar_nome_produto_spot(text) IS
  'DEPRECATED — alias retroativo para fn_clean_spot_name. Será removida na próxima limpeza de DDL.';;
