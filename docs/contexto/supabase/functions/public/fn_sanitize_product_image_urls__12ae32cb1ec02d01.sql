CREATE OR REPLACE FUNCTION public.fn_sanitize_product_image_urls()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Sanitizar url_original (CDN do fornecedor)
  NEW.url_original := fn_sanitize_url(NEW.url_original);

  -- Sanitizar url_cdn (CF Images) — só aplicar trim e controles
  IF NEW.url_cdn IS NOT NULL THEN
    NEW.url_cdn := TRIM(NEW.url_cdn);
    NEW.url_cdn := REPLACE(NEW.url_cdn, CHR(13), '');
    NEW.url_cdn := REPLACE(NEW.url_cdn, CHR(10), '');
  END IF;

  RETURN NEW;
END;
$function$
