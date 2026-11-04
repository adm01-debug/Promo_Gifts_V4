CREATE OR REPLACE FUNCTION public.fn_set_category_min_quantity(p_category_slug character varying, p_min_quantity integer)
 RETURNS TABLE(category_id uuid, category_name character varying, old_min integer, new_min integer, products_affected integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_category_id UUID;
    v_category_name VARCHAR;
    v_old_min INTEGER;
    v_affected INTEGER;
BEGIN
    -- Buscar categoria pelo slug
    SELECT c.id, c.name, c.min_order_quantity 
    INTO v_category_id, v_category_name, v_old_min
    FROM categories c
    WHERE c.slug = p_category_slug;
    
    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Categoria com slug "%" não encontrada', p_category_slug;
    END IF;
    
    -- Atualizar categoria (trigger propagará para produtos)
    UPDATE categories
    SET min_order_quantity = p_min_quantity
    WHERE id = v_category_id;
    
    -- Contar produtos afetados (qualificando a coluna)
    SELECT COUNT(*) INTO v_affected
    FROM products p
    WHERE p.category_id = v_category_id
      AND p.min_order_quantity IS NULL;
    
    RETURN QUERY SELECT v_category_id, v_category_name, v_old_min, p_min_quantity, v_affected;
END;
$function$
