CREATE OR REPLACE FUNCTION public.fn_auto_classify_kit_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_res   JSONB;
  v_catid UUID;
BEGIN
  IF NOT COALESCE(NEW.is_kit, FALSE) OR NEW.name IS NULL THEN
    RETURN NEW;
  END IF;

  v_res := classify_kit_churrasco(NEW.name);
  IF (v_res->>'is_kit_churrasco')::BOOLEAN IS TRUE THEN
    v_catid := (v_res->>'category_id')::UUID;

  ELSIF ((classify_kit_vinho(NEW.name))->>'is_kit_vinho')::BOOLEAN IS TRUE THEN
    v_catid := ((classify_kit_vinho(NEW.name))->>'category_id')::UUID;

  ELSIF ((classify_kit_queijo(NEW.name))->>'is_kit_queijo')::BOOLEAN IS TRUE THEN
    v_catid := ((classify_kit_queijo(NEW.name))->>'category_id')::UUID;

  ELSIF ((classify_kit_banho(NEW.name))->>'is_kit_banho')::BOOLEAN IS TRUE THEN
    v_catid := ((classify_kit_banho(NEW.name))->>'category_id')::UUID;

  ELSE
    v_res := classify_kit_ferramentas(NEW.name);
    IF (v_res->>'category_id') IS NOT NULL THEN
      v_catid := (v_res->>'category_id')::UUID;
    END IF;
  END IF;

  IF v_catid IS NOT NULL THEN
    NEW.category_id      := COALESCE(NEW.category_id, v_catid);
    NEW.main_category_id := COALESCE(NEW.main_category_id, v_catid);
  END IF;

  RETURN NEW;
END;
$function$
