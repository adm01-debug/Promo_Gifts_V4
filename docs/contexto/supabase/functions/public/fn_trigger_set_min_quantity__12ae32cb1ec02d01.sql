CREATE OR REPLACE FUNCTION public.fn_trigger_set_min_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_category_min integer;
BEGIN
    IF NEW.min_order_quantity IS NULL AND NEW.category_id IS NOT NULL THEN
        -- Busca mínimo da categoria
        SELECT min_order_quantity INTO v_category_min
        FROM categories WHERE id = NEW.category_id;

        -- GREATEST: preserva o maior valor entre o atual e o da categoria
        -- Garante que não fica abaixo da categoria mas respeita mínimo do fornecedor
        IF v_category_min IS NOT NULL THEN
            NEW.min_quantity := GREATEST(
                COALESCE(NEW.min_quantity, 0),
                v_category_min
            );
        END IF;

    ELSIF NEW.min_order_quantity IS NOT NULL THEN
        -- Override explícito por produto — tem precedência máxima
        NEW.min_quantity := NEW.min_order_quantity;
    END IF;

    RETURN NEW;
END;
$function$
