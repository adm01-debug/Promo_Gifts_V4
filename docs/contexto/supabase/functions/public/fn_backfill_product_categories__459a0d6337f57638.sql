CREATE OR REPLACE FUNCTION public.fn_backfill_product_categories(p_batch_size integer DEFAULT 100, p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product RECORD;
    v_result JSONB;
    v_category_id UUID;
    v_processed INTEGER := 0;
    v_success INTEGER := 0;
    v_failed INTEGER := 0;
    v_skipped INTEGER := 0;
    v_results JSONB[] := '{}';
BEGIN
    -- Buscar produtos sem categoria
    FOR v_product IN (
        SELECT id, name
        FROM products
        WHERE category_id IS NULL
          AND name IS NOT NULL
          AND TRIM(name) != ''
        ORDER BY created_at DESC
        LIMIT p_batch_size
    ) LOOP
        v_processed := v_processed + 1;
        
        BEGIN
            -- Classificar produto
            SELECT fn_master_classify_product(v_product.name, v_product.id) INTO v_result;
            
            IF v_result IS NOT NULL AND v_result->>'category_id' IS NOT NULL THEN
                v_category_id := (v_result->>'category_id')::UUID;
                
                IF NOT p_dry_run THEN
                    -- Atualizar produto (desabilitar trigger temporariamente para evitar loop)
                    UPDATE products 
                    SET category_id = v_category_id,
                        updated_at = NOW()
                    WHERE id = v_product.id;
                END IF;
                
                v_success := v_success + 1;
                
                -- Guardar amostra dos resultados
                IF v_success <= 10 THEN
                    v_results := array_append(v_results, jsonb_build_object(
                        'product_id', v_product.id,
                        'name', v_product.name,
                        'category_slug', v_result->>'category_slug',
                        'detected_type', v_result->>'detected_type'
                    ));
                END IF;
            ELSE
                v_skipped := v_skipped + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            RAISE WARNING 'Erro ao processar %: %', v_product.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'processed', v_processed,
        'success', v_success,
        'failed', v_failed,
        'skipped', v_skipped,
        'dry_run', p_dry_run,
        'sample_results', to_jsonb(v_results)
    );
END;
$function$
