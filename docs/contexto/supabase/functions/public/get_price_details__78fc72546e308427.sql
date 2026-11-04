CREATE OR REPLACE FUNCTION public.get_price_details(p_variant_id uuid, p_quantity integer DEFAULT 1)
 RETURNS TABLE(variant_id uuid, variant_name text, sku text, product_name text, supplier_name text, quantity integer, tier_used integer, min_qty_tier integer, cost_price numeric, markup_percent numeric, markup_source text, sale_price_unit numeric, sale_price_total numeric, margin_value numeric, margin_percent numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cost DECIMAL(10,4);
    v_markup DECIMAL(5,2);
    v_tier INT;
    v_min_qty INT;
    v_markup_source TEXT;
BEGIN
    -- Buscar dados da variante
    FOR variant_id, variant_name, sku, product_name, supplier_name, cost_price, tier_used, min_qty_tier IN
        SELECT 
            pv.id,
            pv.name,
            pv.sku,
            p.name,
            s.name,
            CASE 
                WHEN p_quantity >= COALESCE(pv.min_qty_5, 999999) AND pv.price_5 IS NOT NULL THEN pv.price_5
                WHEN p_quantity >= COALESCE(pv.min_qty_4, 999999) AND pv.price_4 IS NOT NULL THEN pv.price_4
                WHEN p_quantity >= COALESCE(pv.min_qty_3, 999999) AND pv.price_3 IS NOT NULL THEN pv.price_3
                WHEN p_quantity >= COALESCE(pv.min_qty_2, 999999) AND pv.price_2 IS NOT NULL THEN pv.price_2
                ELSE pv.price_1
            END,
            CASE 
                WHEN p_quantity >= COALESCE(pv.min_qty_5, 999999) AND pv.price_5 IS NOT NULL THEN 5
                WHEN p_quantity >= COALESCE(pv.min_qty_4, 999999) AND pv.price_4 IS NOT NULL THEN 4
                WHEN p_quantity >= COALESCE(pv.min_qty_3, 999999) AND pv.price_3 IS NOT NULL THEN 3
                WHEN p_quantity >= COALESCE(pv.min_qty_2, 999999) AND pv.price_2 IS NOT NULL THEN 2
                ELSE 1
            END,
            CASE 
                WHEN p_quantity >= COALESCE(pv.min_qty_5, 999999) AND pv.price_5 IS NOT NULL THEN pv.min_qty_5
                WHEN p_quantity >= COALESCE(pv.min_qty_4, 999999) AND pv.price_4 IS NOT NULL THEN pv.min_qty_4
                WHEN p_quantity >= COALESCE(pv.min_qty_3, 999999) AND pv.price_3 IS NOT NULL THEN pv.min_qty_3
                WHEN p_quantity >= COALESCE(pv.min_qty_2, 999999) AND pv.price_2 IS NOT NULL THEN pv.min_qty_2
                ELSE pv.min_qty_1
            END
        FROM product_variants pv
        LEFT JOIN products p ON pv.product_id = p.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE pv.id = p_variant_id
    LOOP
        v_cost := cost_price;
        v_tier := tier_used;
        v_min_qty := min_qty_tier;
        
        -- Buscar markup e sua fonte
        v_markup := get_applicable_markup(p_variant_id);
        
        -- Determinar fonte do markup (simplificado)
        SELECT 
            CASE 
                WHEN mc.variant_id IS NOT NULL THEN 'Variante'
                WHEN mc.product_id IS NOT NULL THEN 'Produto'
                WHEN mc.category_id IS NOT NULL THEN 'Categoria'
                WHEN mc.supplier_id IS NOT NULL THEN 'Fornecedor (config)'
                WHEN mc.organization_id IS NOT NULL THEN 'Organização'
                ELSE 'Padrão'
            END
        INTO v_markup_source
        FROM markup_configurations mc
        WHERE mc.is_active = true
          AND (mc.variant_id = p_variant_id
               OR mc.product_id = (SELECT product_id FROM product_variants WHERE id = p_variant_id)
               OR mc.supplier_id = (SELECT supplier_id FROM products WHERE id = (SELECT product_id FROM product_variants WHERE id = p_variant_id)))
        ORDER BY mc.priority
        LIMIT 1;
        
        IF v_markup_source IS NULL THEN
            v_markup_source := 'Fornecedor (default)';
        END IF;
        
        -- Retornar resultado
        RETURN QUERY SELECT 
            p_variant_id,
            variant_name,
            sku,
            product_name,
            supplier_name,
            p_quantity,
            v_tier,
            v_min_qty,
            v_cost,
            v_markup,
            v_markup_source,
            ROUND(v_cost * (1 + v_markup / 100), 2)::DECIMAL(10,2),
            ROUND(v_cost * (1 + v_markup / 100) * p_quantity, 2)::DECIMAL(12,2),
            ROUND(v_cost * v_markup / 100, 2)::DECIMAL(10,2),
            v_markup;
    END LOOP;
END;
$function$
