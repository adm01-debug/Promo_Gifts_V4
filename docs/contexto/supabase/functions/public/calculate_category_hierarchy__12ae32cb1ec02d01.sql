CREATE OR REPLACE FUNCTION public.calculate_category_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_parent_level   INTEGER;
    v_parent_path    TEXT;
    v_parent_fpr     TEXT;
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Categoria raiz
        NEW.level              := 1;
        NEW.path               := '/' || NEW.id::TEXT || '/';
        NEW.full_path_readable := UPPER(COALESCE(NEW.name, ''));
    ELSE
        -- Subcategoria: buscar level, path e full_path_readable do parent
        SELECT level, path, full_path_readable
        INTO   v_parent_level, v_parent_path, v_parent_fpr
        FROM   categories
        WHERE  id = NEW.parent_id;

        IF v_parent_level IS NULL THEN
            RAISE EXCEPTION 'Parent category % not found', NEW.parent_id;
        END IF;

        NEW.level  := v_parent_level + 1;
        NEW.path   := v_parent_path || NEW.id::TEXT || '/';
        -- Usar FPR do pai (ou fallback para UPPER(name) se pai ainda não tiver FPR)
        NEW.full_path_readable :=
            COALESCE(v_parent_fpr, UPPER(COALESCE(NEW.name, '')))
            || ' > '
            || UPPER(COALESCE(NEW.name, ''));
    END IF;

    RETURN NEW;
END;
$function$
