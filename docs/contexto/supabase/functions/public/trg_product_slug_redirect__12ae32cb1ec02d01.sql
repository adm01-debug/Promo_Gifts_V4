CREATE OR REPLACE FUNCTION public.trg_product_slug_redirect()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se slug mudou e tinha valor anterior, criar redirect
  IF OLD.slug IS NOT NULL 
     AND NEW.slug IS NOT NULL 
     AND OLD.slug != NEW.slug 
     AND LENGTH(OLD.slug) > 0 THEN
    
    INSERT INTO seo_redirects (source_path, target_path, redirect_type, reason)
    VALUES (
      '/produto/' || OLD.slug,
      '/produto/' || NEW.slug,
      301,
      'product_slug_changed'
    )
    ON CONFLICT (source_path) WHERE is_active = true
    DO UPDATE SET 
      target_path = EXCLUDED.target_path,
      reason = 'product_slug_changed_updated';
  END IF;
  
  RETURN NEW;
END;
$function$
