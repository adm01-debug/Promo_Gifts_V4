CREATE OR REPLACE FUNCTION public.fn_alert_products_without_images()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  v_oldest DATE;
BEGIN
  SELECT COUNT(*), MIN(created_at)::date
  INTO v_count, v_oldest
  FROM public.v_products_pending_images
  WHERE created_at < NOW() - INTERVAL '3 days';
  
  IF v_count > 0 THEN
    RAISE WARNING 'ALERT[products_without_images]: % produtos ativos sem imagem criados há mais de 3 dias (mais antigo: %)', v_count, v_oldest;
  END IF;
END;
$function$
