CREATE OR REPLACE FUNCTION public.magazine_items_guard_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_magazine_id UUID := CASE WHEN TG_OP = 'INSERT' THEN NEW.magazine_id ELSE OLD.magazine_id END;
  v_status TEXT;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  SELECT status::TEXT, deleted_at INTO v_status, v_deleted_at
  FROM public.magazines WHERE id = v_magazine_id FOR UPDATE;
  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'magazine_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_deleted_at IS NOT NULL OR v_status <> 'draft' THEN
    RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.magazine_id IS DISTINCT FROM v_magazine_id
       OR jsonb_typeof(NEW.product_snapshot) IS DISTINCT FROM 'object'
       OR jsonb_typeof(NEW.overrides) IS DISTINCT FROM 'object'
       OR NEW.position < 0
       OR (NEW.page_number IS NOT NULL AND NEW.page_number NOT BETWEEN 1 AND 200) THEN
      RAISE EXCEPTION 'magazine_item_invalid' USING ERRCODE = '22023';
    END IF;
    NEW.updated_at := clock_timestamp();
  END IF;
  IF TG_OP = 'INSERT' AND (
    SELECT count(*) FROM public.magazine_items WHERE magazine_id = v_magazine_id
  ) >= 500 THEN
    RAISE EXCEPTION 'magazine_item_limit_exceeded' USING ERRCODE = '22023';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$
