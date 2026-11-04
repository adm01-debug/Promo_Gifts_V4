CREATE OR REPLACE FUNCTION public.fn_cor_generate_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(NEW.codigo, '[^a-zA-Z0-9]+', '-', 'g'));
        NEW.slug := trim(BOTH '-' FROM NEW.slug);
    END IF;
    RETURN NEW;
END;
$function$
