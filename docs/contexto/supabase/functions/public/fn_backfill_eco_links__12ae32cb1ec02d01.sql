CREATE OR REPLACE FUNCTION public.fn_backfill_eco_links()
 RETURNS TABLE(produtos_processados integer, links_categoria_criados integer, links_data_criados integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ecologia_category_id UUID := '896277ce-50ee-4bf5-9e5f-c118e6b4a36a';
    v_meio_ambiente_date_id UUID := '11b59fa3-14f1-4f5b-8c92-2e9bcb03e216';
    v_produtos INTEGER;
    v_cat_links INTEGER;
    v_date_links INTEGER;
BEGIN
    -- Contar produtos com materiais eco
    SELECT COUNT(DISTINCT pm.product_id)
    INTO v_produtos
    FROM product_materials pm
    JOIN eco_material_config emc ON pm.material_id = emc.material_id
    WHERE emc.is_active = TRUE;
    
    -- Inserir links de categoria
    WITH inserted AS (
        INSERT INTO product_category_assignments (product_id, category_id, is_primary, created_at)
        SELECT DISTINCT pm.product_id, v_ecologia_category_id, FALSE, NOW()
        FROM product_materials pm
        JOIN eco_material_config emc ON pm.material_id = emc.material_id
        WHERE emc.is_active = TRUE
        ON CONFLICT (product_id, category_id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_cat_links FROM inserted;
    
    -- Inserir links de data comemorativa
    WITH inserted AS (
        INSERT INTO product_commemorative_dates (product_id, commemorative_date_id, created_at)
        SELECT DISTINCT pm.product_id, v_meio_ambiente_date_id, NOW()
        FROM product_materials pm
        JOIN eco_material_config emc ON pm.material_id = emc.material_id
        WHERE emc.is_active = TRUE
        ON CONFLICT (product_id, commemorative_date_id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_date_links FROM inserted;
    
    RETURN QUERY SELECT v_produtos, v_cat_links, v_date_links;
END;
$function$
