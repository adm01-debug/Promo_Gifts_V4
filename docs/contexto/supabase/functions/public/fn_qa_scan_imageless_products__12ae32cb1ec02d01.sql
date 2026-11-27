CREATE OR REPLACE FUNCTION public.fn_qa_scan_imageless_products()
 RETURNS TABLE(total_violacoes bigint, alertas_novos bigint, alertas_resolvidos bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_novos bigint := 0;
  v_resolvidos bigint := 0;
  v_total bigint := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT COALESCE(public.is_admin_or_above(auth.uid()), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH resolvidos AS (
    UPDATE public.product_qa_image_alerts qa
    SET is_resolved = true,
        resolved_at = now(),
        resolution_notes = CASE
          WHEN COALESCE(p.is_deleted, false) THEN 'produto deletado'
          WHEN NOT COALESCE(p.is_active, false) THEN 'produto desativado'
          ELSE 'imagem detectada na varredura automática'
        END
    FROM public.products p
    WHERE qa.product_id = p.id
      AND qa.is_resolved = false
      AND (
        COALESCE(p.is_deleted, false)
        OR NOT COALESCE(p.is_active, false)
        OR EXISTS (
          SELECT 1 FROM public.product_images pi
          WHERE pi.product_id = p.id AND pi.is_active = true
        )
        OR COALESCE(p.primary_image_url, '') <> ''
        OR (jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0)
      )
    RETURNING qa.id
  )
  SELECT count(*) INTO v_resolvidos FROM resolvidos;

  WITH novos AS (
    INSERT INTO public.product_qa_image_alerts
      (product_id, supplier_id, sku_promo, product_name, alert_type)
    SELECT p.id, p.supplier_id, COALESCE(p.sku_promo, p.sku), left(p.name, 200), 'active_without_image'
    FROM public.products p
    WHERE COALESCE(p.is_active, false)
      AND NOT COALESCE(p.is_deleted, false)
      AND NOT EXISTS (
        SELECT 1 FROM public.product_images pi
        WHERE pi.product_id = p.id AND pi.is_active = true
      )
      AND COALESCE(p.primary_image_url, '') = ''
      AND NOT (jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0)
      AND NOT EXISTS (
        SELECT 1 FROM public.product_qa_image_alerts qa
        WHERE qa.product_id = p.id AND qa.is_resolved = false
      )
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_novos FROM novos;

  SELECT count(*) INTO v_total
  FROM public.product_qa_image_alerts
  WHERE is_resolved = false;

  RETURN QUERY SELECT v_total, v_novos, v_resolvidos;
END;
$function$
