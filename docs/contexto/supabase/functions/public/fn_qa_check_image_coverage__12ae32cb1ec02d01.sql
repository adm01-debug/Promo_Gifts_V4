CREATE OR REPLACE FUNCTION public.fn_qa_check_image_coverage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_crit int; v_semnorm int; v_sample jsonb;
BEGIN
  SELECT count(*) FILTER (WHERE severidade='CRITICO'),
         count(*) FILTER (WHERE severidade='SEM_NORMALIZACAO')
    INTO v_crit, v_semnorm
  FROM public.vw_qa_products_missing_images;

  SELECT jsonb_agg(x) INTO v_sample FROM (
    SELECT sku, name, supplier_id FROM public.vw_qa_products_missing_images
    WHERE severidade='CRITICO' LIMIT 20) x;

  INSERT INTO public.qa_image_coverage_log(critico_count, sem_normalizacao_count, sample)
  VALUES (v_crit, v_semnorm, COALESCE(v_sample,'[]'::jsonb));

  RETURN jsonb_build_object('ran_at', now(), 'critico', v_crit, 'sem_normalizacao', v_semnorm);
END;
$function$
