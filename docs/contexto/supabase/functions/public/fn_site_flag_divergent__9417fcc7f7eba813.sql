CREATE OR REPLACE FUNCTION public.fn_site_flag_divergent(p_supplier uuid DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_flag int; v_clear int;
BEGIN
  WITH pairs AS (
    SELECT s.id,
      (SELECT array_agg(w) FROM unnest(regexp_split_to_array(lower(s.name),'\s+')) w WHERE length(w)>=4) AS s_tok,
      (SELECT array_agg(w) FROM unnest(regexp_split_to_array(lower(p.name),'\s+')) w WHERE length(w)>=4) AS a_tok,
      p.name AS api_name
    FROM public.produtos_site_padronizacao s
    JOIN public.produtos_padronizacao p
      ON p.supplier_id=s.supplier_id AND p.supplier_reference=s.supplier_reference
    WHERE s.supplier_id=p_supplier AND s.name IS NOT NULL AND p.name IS NOT NULL
  ),
  f AS (
    UPDATE public.produtos_site_padronizacao t
       SET status='rejected'::public.produtos_padronizacao_status,
           validation_errors=jsonb_build_object('api_divergente',true,'api_name',pr.api_name,
                                                 'motivo','site sem token>=4 em comum com produto da API (provavel pagina generica)'),
           updated_at=now()
      FROM pairs pr
     WHERE t.id=pr.id
       AND NOT (COALESCE(pr.s_tok,'{}') && COALESCE(pr.a_tok,'{}'))
       AND NOT (t.status='rejected' AND t.validation_errors ? 'api_divergente')
     RETURNING 1
  ),
  c AS (
    UPDATE public.produtos_site_padronizacao t
       SET status='standardized'::public.produtos_padronizacao_status,
           validation_errors=NULL, updated_at=now()
      FROM pairs pr
     WHERE t.id=pr.id
       AND (COALESCE(pr.s_tok,'{}') && COALESCE(pr.a_tok,'{}'))
       AND t.validation_errors ? 'api_divergente'
     RETURNING 1
  )
  SELECT (SELECT count(*) FROM f),(SELECT count(*) FROM c) INTO v_flag,v_clear;
  RETURN jsonb_build_object('rejeitados_divergentes',v_flag,'reabilitados',v_clear);
END $function$
