CREATE OR REPLACE FUNCTION public.fn_sync_dimensions_display()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Se dimensions_display foi atualizado → espelhar em combined_sizes
    IF TG_OP = 'UPDATE' AND NEW.dimensions_display IS DISTINCT FROM OLD.dimensions_display THEN
        NEW.combined_sizes := NEW.dimensions_display;
    END IF;
    -- Se combined_sizes foi atualizado → espelhar em dimensions_display
    IF TG_OP = 'UPDATE' AND NEW.combined_sizes IS DISTINCT FROM OLD.combined_sizes THEN
        NEW.dimensions_display := NEW.combined_sizes;
    END IF;
    -- INSERT: garantir que ambos estejam alinhados
    IF TG_OP = 'INSERT' THEN
        IF NEW.dimensions_display IS NOT NULL AND NEW.combined_sizes IS NULL THEN
            NEW.combined_sizes := NEW.dimensions_display;
        ELSIF NEW.combined_sizes IS NOT NULL AND NEW.dimensions_display IS NULL THEN
            NEW.dimensions_display := NEW.combined_sizes;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
