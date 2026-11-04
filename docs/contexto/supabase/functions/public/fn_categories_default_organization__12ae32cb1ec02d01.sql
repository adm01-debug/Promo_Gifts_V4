CREATE OR REPLACE FUNCTION public.fn_categories_default_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Normalizar organization_id NULL para a organização padrão
  -- (handles explicit NULL from ETL/bots/migration scripts)
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
  END IF;
  RETURN NEW;
END;
$function$
