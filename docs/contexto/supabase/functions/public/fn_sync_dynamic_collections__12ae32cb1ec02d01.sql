CREATE OR REPLACE FUNCTION public.fn_sync_dynamic_collections()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_nov_id   uuid := 'a1b2c3d4-0001-0000-0000-000000000001';
    v_stock_id uuid := 'a1b2c3d4-0002-0000-0000-000000000002';
    v_textil_id uuid := 'be449327-bb3c-4382-a564-f6151e63c410';
    v_ins_nov  int := 0;
    v_del_nov  int := 0;
    v_ins_stk  int := 0;
    v_del_stk  int := 0;
    v_ins_txt  int := 0;
BEGIN
    -- === NOVIDADES: adicionar produtos com novelty ativa ===
    INSERT INTO b2b_collection_products (b2b_collection_id, product_id, display_order, added_at)
    SELECT v_nov_id, pn.product_id,
           ROW_NUMBER() OVER (ORDER BY pn.detected_at DESC), now()
    FROM product_novelties pn
    JOIN products p ON p.id = pn.product_id
    WHERE pn.is_active = true AND p.is_active = true
    ON CONFLICT (b2b_collection_id, product_id) DO NOTHING;
    GET DIAGNOSTICS v_ins_nov = ROW_COUNT;

    -- Remover produtos cujas novelties expiraram da coleção Novidades
    DELETE FROM b2b_collection_products bcp
    WHERE bcp.b2b_collection_id = v_nov_id
      AND NOT EXISTS (
        SELECT 1 FROM product_novelties pn
        WHERE pn.product_id = bcp.product_id AND pn.is_active = true
      );
    GET DIAGNOSTICS v_del_nov = ROW_COUNT;

    -- === STOCKOUT: adicionar/remover baseado em flag ===
    INSERT INTO b2b_collection_products (b2b_collection_id, product_id, display_order, added_at)
    SELECT v_stock_id, p.id, ROW_NUMBER() OVER (ORDER BY p.name), now()
    FROM products p
    WHERE p.is_active = true AND p.is_stockout = true
    ON CONFLICT (b2b_collection_id, product_id) DO NOTHING;
    GET DIAGNOSTICS v_ins_stk = ROW_COUNT;

    DELETE FROM b2b_collection_products bcp
    WHERE bcp.b2b_collection_id = v_stock_id
      AND NOT EXISTS (
        SELECT 1 FROM products p
        WHERE p.id = bcp.product_id AND p.is_active = true AND p.is_stockout = true
      );
    GET DIAGNOSTICS v_del_stk = ROW_COUNT;

    -- === TÊXTIL: fechar gap ===
    INSERT INTO b2b_collection_products (b2b_collection_id, product_id, display_order, added_at)
    SELECT v_textil_id, p.id, ROW_NUMBER() OVER (ORDER BY p.name) + 800, now()
    FROM products p
    WHERE p.is_active = true AND p.is_textil = true
    ON CONFLICT (b2b_collection_id, product_id) DO NOTHING;
    GET DIAGNOSTICS v_ins_txt = ROW_COUNT;

    RETURN jsonb_build_object(
        'novidades_adicionados', v_ins_nov, 'novidades_removidos', v_del_nov,
        'stockout_adicionados',  v_ins_stk,  'stockout_removidos',  v_del_stk,
        'textil_adicionados',    v_ins_txt,
        'executed_at', now()
    );
END;
$function$
