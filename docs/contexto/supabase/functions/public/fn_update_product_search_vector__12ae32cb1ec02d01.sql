CREATE OR REPLACE FUNCTION public.fn_update_product_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT')
     OR (OLD.name              IS DISTINCT FROM NEW.name)
     OR (OLD.description       IS DISTINCT FROM NEW.description)
     OR (OLD.short_description IS DISTINCT FROM NEW.short_description)
     OR (OLD.meta_title        IS DISTINCT FROM NEW.meta_title)
     OR (OLD.brand             IS DISTINCT FROM NEW.brand)
     OR (OLD.supplier_reference IS DISTINCT FROM NEW.supplier_reference)
     OR (OLD.sku               IS DISTINCT FROM NEW.sku)
  THEN
    NEW.search_vector := to_tsvector('portuguese',
      unaccent(
        COALESCE(NEW.name, '') || ' ' ||
        COALESCE(NEW.sku, '') || ' ' ||
        COALESCE(NEW.short_description, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.meta_title, '') || ' ' ||
        COALESCE(NEW.brand, '') || ' ' ||
        COALESCE(NEW.supplier_reference, '')
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
