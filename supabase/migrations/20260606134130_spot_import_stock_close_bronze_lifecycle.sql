CREATE OR REPLACE FUNCTION public.fn_import_stock_from_spot(p_stocks jsonb)
 RETURNS TABLE(total_processed integer, total_updated integer, total_created integer, total_skipped integer, total_errors integer, details jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_stock JSONB;
    v_processed INTEGER := 0;
    v_updated INTEGER := 0;
    v_created INTEGER := 0;
    v_skipped INTEGER := 0;
    v_errors INTEGER := 0;
    v_bronze_closed INTEGER := 0;
    v_supplier_id UUID;
    v_variant_id UUID;
    v_sku TEXT;
    v_error_skus TEXT[] := '{}';
    v_skipped_skus TEXT[] := '{}';
BEGIN
    SELECT id INTO v_supplier_id
    FROM suppliers
    WHERE code = 'STRICKER' OR code = 'SPOT'
       OR name ILIKE '%spot%' OR name ILIKE '%stricker%'
    LIMIT 1;

    IF v_supplier_id IS NULL THEN
        RAISE EXCEPTION 'Fornecedor SPOT/Stricker não encontrado na tabela suppliers';
    END IF;

    FOR v_stock IN SELECT * FROM jsonb_array_elements(p_stocks)
    LOOP
        v_processed := v_processed + 1;
        v_sku := v_stock->>'Sku';

        BEGIN
            UPDATE variant_supplier_sources
            SET
                quantity = COALESCE((v_stock->>'Quantity')::INTEGER, 0),
                next_quantity_1 = NULLIF((v_stock->>'NextQuantity1')::INTEGER, 0),
                next_date_1 = NULLIF(v_stock->>'NextDate1', '')::DATE,
                next_quantity_2 = NULLIF((v_stock->>'NextQuantity2')::INTEGER, 0),
                next_date_2 = NULLIF(v_stock->>'NextDate2', '')::DATE,
                next_quantity_3 = NULLIF((v_stock->>'NextQuantity3')::INTEGER, 0),
                next_date_3 = NULLIF(v_stock->>'NextDate3', '')::DATE,
                last_synced_at = NOW(),
                sync_status = 'synced',
                sync_error = NULL,
                source = 'spot_api',
                raw_data = v_stock,
                updated_at = NOW()
            WHERE supplier_sku = v_sku
              AND supplier_id = v_supplier_id;

            IF FOUND THEN
                v_updated := v_updated + 1;
            ELSE
                SELECT id INTO v_variant_id
                FROM product_variants
                WHERE sku = v_sku OR supplier_sku = v_sku
                LIMIT 1;

                IF v_variant_id IS NOT NULL THEN
                    INSERT INTO variant_supplier_sources (
                        organization_id, variant_id, supplier_id, supplier_sku,
                        quantity, next_quantity_1, next_date_1,
                        next_quantity_2, next_date_2, next_quantity_3, next_date_3,
                        pack_quantity, min_qty_1, min_order_qty,
                        is_active, is_preferred, priority,
                        source, sync_status, last_synced_at, raw_data, sale_multiplier
                    ) VALUES (
                        '5db5aee1-064b-4ef4-9193-345dcd8274ea',
                        v_variant_id, v_supplier_id, v_sku,
                        COALESCE((v_stock->>'Quantity')::INTEGER, 0),
                        NULLIF((v_stock->>'NextQuantity1')::INTEGER, 0),
                        NULLIF(v_stock->>'NextDate1', '')::DATE,
                        NULLIF((v_stock->>'NextQuantity2')::INTEGER, 0),
                        NULLIF(v_stock->>'NextDate2', '')::DATE,
                        NULLIF((v_stock->>'NextQuantity3')::INTEGER, 0),
                        NULLIF(v_stock->>'NextDate3', '')::DATE,
                        1, 1, 1, true, true, 1,
                        'spot_api', 'synced', NOW(), v_stock, 1
                    )
                    ON CONFLICT (organization_id, variant_id, supplier_id)
                    DO UPDATE SET
                        quantity = EXCLUDED.quantity,
                        next_quantity_1 = EXCLUDED.next_quantity_1,
                        next_date_1 = EXCLUDED.next_date_1,
                        next_quantity_2 = EXCLUDED.next_quantity_2,
                        next_date_2 = EXCLUDED.next_date_2,
                        next_quantity_3 = EXCLUDED.next_quantity_3,
                        next_date_3 = EXCLUDED.next_date_3,
                        last_synced_at = NOW(),
                        sync_status = 'synced',
                        raw_data = EXCLUDED.raw_data,
                        updated_at = NOW();

                    v_created := v_created + 1;
                ELSE
                    v_skipped := v_skipped + 1;
                    v_skipped_skus := array_append(v_skipped_skus, v_sku);
                END IF;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            v_error_skus := array_append(v_error_skus, v_sku || ': ' || SQLERRM);
            CONTINUE;
        END;
    END LOOP;

    -- Fechar ciclo de vida Bronze: SPOT stocks API = dump completo.
    -- Apos sync bem-sucedido, todos os rows STRICKER pendentes sao marcados processed.
    -- (stock_data=NULL e esperado para SPOT; o estoque flui API->VSS, nao via Bronze)
    UPDATE public.supplier_products_raw
    SET stock_status = 'processed'::supplier_raw_status,
        stock_synced_at = now()
    WHERE supplier_id = v_supplier_id
      AND stock_status IS DISTINCT FROM 'processed'::supplier_raw_status;
    GET DIAGNOSTICS v_bronze_closed = ROW_COUNT;

    RETURN QUERY SELECT
        v_processed, v_updated, v_created, v_skipped, v_errors,
        jsonb_build_object(
            'error_skus', to_jsonb(v_error_skus[1:10]),
            'skipped_skus_sample', to_jsonb(v_skipped_skus[1:10]),
            'supplier_id', v_supplier_id,
            'bronze_closed', v_bronze_closed
        );
END;
$function$;;
