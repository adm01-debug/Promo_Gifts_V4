CREATE OR REPLACE FUNCTION public.fn_sync_product_seo_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
-- fix_version: satellite_seo_20260627
-- anti-regression: manter SECURITY DEFINER + search_path=pg_catalog,public.
-- Não remover: este trigger mantém product_seo sincronizado com products.
BEGIN
  INSERT INTO public.product_seo (
    product_id, meta_title, meta_description, meta_keywords,
    canonical_url, robots_meta, og_title, og_description, og_image_url,
    schema_json, seo_score, seo_issues, seo_last_audit_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.meta_title, NEW.meta_description, NEW.meta_keywords,
    NEW.canonical_url, COALESCE(NEW.robots_meta,'index, follow'),
    NEW.og_title, NEW.og_description, NEW.og_image_url,
    NEW.schema_json, COALESCE(NEW.seo_score,0),
    COALESCE(NEW.seo_issues,'[]'::jsonb),
    NEW.seo_last_audit_at, now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    meta_title        = EXCLUDED.meta_title,
    meta_description  = EXCLUDED.meta_description,
    meta_keywords     = EXCLUDED.meta_keywords,
    canonical_url     = EXCLUDED.canonical_url,
    robots_meta       = EXCLUDED.robots_meta,
    og_title          = EXCLUDED.og_title,
    og_description    = EXCLUDED.og_description,
    og_image_url      = EXCLUDED.og_image_url,
    schema_json       = EXCLUDED.schema_json,
    seo_score         = EXCLUDED.seo_score,
    seo_issues        = EXCLUDED.seo_issues,
    seo_last_audit_at = EXCLUDED.seo_last_audit_at,
    updated_at        = now();
  RETURN NEW;
END;
$function$
