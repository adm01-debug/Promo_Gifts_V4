CREATE OR REPLACE FUNCTION public.limpar_nome_produto_spot(p_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  -- DEPRECATED: use fn_clean_spot_name(p_name) diretamente.
  -- Esta função existe apenas como alias de compatibilidade retroativa.
  SELECT public.fn_clean_spot_name(p_name);
$function$
