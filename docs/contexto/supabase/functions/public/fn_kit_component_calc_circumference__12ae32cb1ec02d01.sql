CREATE OR REPLACE FUNCTION public.fn_kit_component_calc_circumference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Para cilíndricos: circumference = π × diameter
  -- Só calcula se:
  --   (a) shape é cylindrical
  --   (b) diameter_mm está preenchido
  --   (c) circumference_mm não foi informado manualmente
  --       OU o diameter mudou (recalcula)
  IF NEW.shape_type = 'cylindrical'
     AND NEW.diameter_mm IS NOT NULL
     AND (
       NEW.circumference_mm IS NULL
       OR (TG_OP = 'UPDATE' AND OLD.diameter_mm IS DISTINCT FROM NEW.diameter_mm)
     )
  THEN
    NEW.circumference_mm := ROUND(PI() * NEW.diameter_mm);
  END IF;
  RETURN NEW;
END;
$function$
