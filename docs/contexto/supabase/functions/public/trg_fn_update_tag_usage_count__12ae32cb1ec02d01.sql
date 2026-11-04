CREATE OR REPLACE FUNCTION public.trg_fn_update_tag_usage_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags
    SET usage_count = COALESCE(usage_count, 0) + 1,
        updated_at  = now()
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags
    SET usage_count = GREATEST(0, COALESCE(usage_count, 1) - 1),
        updated_at  = now()
    WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$function$
