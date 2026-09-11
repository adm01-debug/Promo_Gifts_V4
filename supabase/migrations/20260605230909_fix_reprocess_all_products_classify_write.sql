-- Conserto: (a) ordem correta de args em fn_master_classify_product (p_name, p_product_id)
-- e (b) GRAVAR o category_id resultante (antes era só contado, no-op).
CREATE OR REPLACE FUNCTION public.reprocess_all_products(p_batch_size integer DEFAULT 100, p_supplier_id uuid DEFAULT NULL::uuid, p_force_reclassify boolean DEFAULT false)
 RETURNS TABLE(processed integer, classified integer, materials_linked integer, prices_calculated integer, errors integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product RECORD;
    v_result JSONB;
    v_materials INTEGER;
    v_price NUMERIC;
    v_processed INTEGER := 0;
    v_classified INTEGER := 0;
    v_materials_total INTEGER := 0;
    v_prices_total INTEGER := 0;
    v_errors INTEGER := 0;
BEGIN
    FOR v_product IN (
        SELECT p.id, p.name, p.category_id, p.supplier_id
        FROM products p
        WHERE (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
          AND (p_force_reclassify OR p.category_id IS NULL)
        ORDER BY p.created_at DESC
        LIMIT p_batch_size
    )
    LOOP
        BEGIN
            -- 1. Classificar (CORRIGIDO: ordem (name, id) + GRAVA o category_id)
            IF v_product.category_id IS NULL OR p_force_reclassify THEN
                v_result := fn_master_classify_product(v_product.name, v_product.id);
                IF v_result->>'category_id' IS NOT NULL THEN
                    UPDATE products
                       SET category_id = (v_result->>'category_id')::uuid
                     WHERE id = v_product.id;
                    v_classified := v_classified + 1;
                END IF;
            END IF;

            -- 2. Vincular materiais (path de derivação do batch)
            v_materials := fn_link_product_materials(v_product.id, v_product.supplier_id);
            v_materials_total := v_materials_total + v_materials;

            -- 3. Calcular preço
            v_price := fn_calculate_sale_price(v_product.id);
            IF v_price IS NOT NULL THEN
                v_prices_total := v_prices_total + 1;
            END IF;

            v_processed := v_processed + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE NOTICE 'Erro processando %: %', v_product.id, SQLERRM;
        END;
    END LOOP;

    processed := v_processed;
    classified := v_classified;
    materials_linked := v_materials_total;
    prices_calculated := v_prices_total;
    errors := v_errors;

    RETURN NEXT;
END;
$function$;;
