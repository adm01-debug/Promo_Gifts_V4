CREATE OR REPLACE FUNCTION public.fn_sync_product_ai_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
-- fix_version: satellite_ai_20260627
-- anti-regression: manter SECURITY DEFINER + search_path.
BEGIN
  INSERT INTO public.product_ai_content (
    product_id, ai_title, ai_description, ai_summary,
    ai_version, ai_model, ai_generated_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.ai_title, NEW.ai_description, NEW.ai_summary,
    COALESCE(NEW.ai_version,0), NEW.ai_model, NEW.ai_generated_at, now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    ai_title        = EXCLUDED.ai_title,
    ai_description  = EXCLUDED.ai_description,
    ai_summary      = EXCLUDED.ai_summary,
    ai_version      = EXCLUDED.ai_version,
    ai_model        = EXCLUDED.ai_model,
    ai_generated_at = EXCLUDED.ai_generated_at,
    updated_at      = now();
  RETURN NEW;
END;
$function$
