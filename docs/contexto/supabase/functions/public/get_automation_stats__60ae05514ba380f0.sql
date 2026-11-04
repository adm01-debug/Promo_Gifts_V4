CREATE OR REPLACE FUNCTION public.get_automation_stats(p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(metric text, value bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Total de produtos
    RETURN QUERY
    SELECT 'total_products'::TEXT, COUNT(*)
    FROM products
    WHERE p_supplier_id IS NULL OR supplier_id = p_supplier_id;
    
    -- Com categoria
    RETURN QUERY
    SELECT 'with_category'::TEXT, COUNT(*)
    FROM products
    WHERE category_id IS NOT NULL
      AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id);
    
    -- Sem categoria
    RETURN QUERY
    SELECT 'without_category'::TEXT, COUNT(*)
    FROM products
    WHERE category_id IS NULL
      AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id);
    
    -- Com preço de venda
    RETURN QUERY
    SELECT 'with_sale_price'::TEXT, COUNT(*)
    FROM products
    WHERE sale_price IS NOT NULL AND sale_price > 0
      AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id);
    
    -- Sem preço de venda
    RETURN QUERY
    SELECT 'without_sale_price'::TEXT, COUNT(*)
    FROM products
    WHERE (sale_price IS NULL OR sale_price = 0)
      AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id);
    
    -- Vínculos de categoria
    RETURN QUERY
    SELECT 'category_assignments'::TEXT, COUNT(*)
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id
    WHERE p_supplier_id IS NULL OR p.supplier_id = p_supplier_id;
    
    -- Vínculos de material
    RETURN QUERY
    SELECT 'material_links'::TEXT, COUNT(*)
    FROM product_materials pm
    JOIN products p ON p.id = pm.product_id
    WHERE p_supplier_id IS NULL OR p.supplier_id = p_supplier_id;
END;
$function$
