CREATE OR REPLACE FUNCTION public.reprocess_product_materials(p_batch_size integer DEFAULT 100, p_supplier_id uuid DEFAULT 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'::uuid)
 RETURNS TABLE(processed integer, materials_linked integer, products_with_materials integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product RECORD;
    v_materials INTEGER;
    v_processed INTEGER := 0;
    v_linked INTEGER := 0;
BEGIN
    -- Loop pelos produtos que ainda não têm materiais
    FOR v_product IN (
        SELECT p.id, p.supplier_id
        FROM products p
        LEFT JOIN product_materials pm ON pm.product_id = p.id
        WHERE p.supplier_id = p_supplier_id
          AND pm.id IS NULL  -- Apenas produtos SEM materiais
        ORDER BY p.created_at DESC
        LIMIT p_batch_size
    )
    LOOP
        v_materials := fn_link_product_materials(v_product.id, v_product.supplier_id);
        v_linked := v_linked + v_materials;
        v_processed := v_processed + 1;
    END LOOP;
    
    -- Contar produtos com materiais
    SELECT COUNT(DISTINCT product_id)
    INTO products_with_materials
    FROM product_materials;
    
    processed := v_processed;
    materials_linked := v_linked;
    
    RETURN NEXT;
END;
$function$
