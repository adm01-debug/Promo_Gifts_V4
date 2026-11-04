CREATE OR REPLACE FUNCTION public.validate_material_percentages()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE total_percentage DECIMAL;
BEGIN
  SELECT COALESCE(SUM(percentage),0) INTO total_percentage
  FROM product_materials
  WHERE product_id = NEW.product_id
    AND organization_id = NEW.organization_id
    AND part IS NOT DISTINCT FROM NEW.part
    AND is_active = true
    AND (
      CASE WHEN TG_OP = 'UPDATE' THEN id <> NEW.id
           ELSE material_id <> NEW.material_id
      END
    );
  IF total_percentage + COALESCE(NEW.percentage, 0) > 100 THEN
    RAISE EXCEPTION 'Total de percentuais da parte "%" excede 100%% (atual: %, novo: %)',
      COALESCE(NEW.part,'(sem parte)'), total_percentage, NEW.percentage;
  END IF;
  RETURN NEW;
END;
$function$
