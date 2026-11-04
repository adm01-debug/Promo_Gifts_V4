CREATE OR REPLACE FUNCTION public.fn_trigger_set_has_optional_packaging()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- ANTI-REGRESSAO(canonical_v2): inclui compat COMPATIVEL (rating tight/good/loose). Nao remover.
  NEW.has_optional_packaging :=
        COALESCE((NEW.description_packaging_info->>'has_optional_mention')::boolean,false)
        OR NEW.optional_packaging_ref IS NOT NULL OR NEW.packing_classification = 'protective'
        OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id = NEW.id AND c.active AND c.fit_rating IN ('tight','good','loose'));
  RETURN NEW;
END;$function$
