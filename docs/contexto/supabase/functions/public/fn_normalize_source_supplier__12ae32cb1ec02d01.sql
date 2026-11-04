CREATE OR REPLACE FUNCTION public.fn_normalize_source_supplier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.source_supplier := CASE UPPER(COALESCE(NEW.source_supplier,'SPOT'))
    WHEN 'STRICKER'  THEN 'SPOT'
    WHEN 'SPOT'      THEN 'SPOT'
    WHEN 'XBZ'       THEN 'XBZ'
    WHEN 'ASIA'      THEN 'ASIA'
    WHEN 'SOMARCAS'  THEN 'SOMARCAS'
    WHEN '88BRINDES' THEN '88BRINDES'
    ELSE UPPER(COALESCE(NEW.source_supplier,'SPOT'))
  END;

  IF NEW.supplier_code IS NULL OR TRIM(NEW.supplier_code) = '' THEN
    NEW.supplier_code := NEW.source_supplier;
  END IF;

  IF NEW.supplier_code IS DISTINCT FROM (
    CASE UPPER(NEW.source_supplier)
      WHEN 'SPOT'      THEN 'SPOT'
      WHEN 'XBZ'       THEN 'XBZ'
      WHEN 'ASIA'      THEN 'ASIA'
      WHEN 'SOMARCAS'  THEN 'SOMARCAS'
      WHEN '88BRINDES' THEN '88BRINDES'
      ELSE UPPER(NEW.source_supplier)
    END
  ) THEN
    NEW.supplier_code := NEW.source_supplier;
  END IF;

  RETURN NEW;
END;
$function$
