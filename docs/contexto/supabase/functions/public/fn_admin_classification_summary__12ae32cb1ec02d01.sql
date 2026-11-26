CREATE OR REPLACE FUNCTION public.fn_admin_classification_summary()
 RETURNS TABLE(total_sugestoes bigint, nao_atribuidas bigint, kits_para_revisao bigint, conflitos bigint, alta_confianca bigint, ultima_analise timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'classification_audit', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    count(*)::bigint AS total_sugestoes,
    count(*) FILTER (WHERE NOT s.already_assigned)::bigint AS nao_atribuidas,
    count(*) FILTER (
      WHERE NOT s.already_assigned
        AND s.matches >= 3
        AND (p.is_kit OR p.name ILIKE '%KIT%' OR p.name ILIKE '%CONJ%')
    )::bigint AS kits_para_revisao,
    count(*) FILTER (
      WHERE coalesce(s.material_conflict, false) OR coalesce(s.type_conflict, false)
    )::bigint AS conflitos,
    count(*) FILTER (WHERE NOT s.already_assigned AND s.matches >= 4)::bigint AS alta_confianca,
    max(s.computed_at) AS ultima_analise
  FROM classification_audit.category_suggestions AS s
  JOIN public.products AS p ON p.id = s.product_id AND p.is_active;
END;
$function$
