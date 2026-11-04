CREATE OR REPLACE FUNCTION public.fn_populate_novelties_from_supplier()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/*
  v4.1_2026-06-13 — Backfill de novidades para produtos recentemente promovidos.
  FIX v4.1: INSERT agora inclui supplier_id e supplier_code (antes omitidos → registros NULL)
*/
DECLARE
    v_inserted        INTEGER := 0;
    v_expired         INTEGER := 0;
    v_skipped         INTEGER := 0;
    rec               RECORD;
    v_update_date     TIMESTAMPTZ;
    v_expires_at      TIMESTAMPTZ;
    v_is_active       BOOLEAN;
    v_source          TEXT;
    v_lock_acquired   BOOLEAN;
    LOCK_ID CONSTANT  BIGINT := 73910284;
BEGIN
    SELECT pg_try_advisory_xact_lock(LOCK_ID) INTO v_lock_acquired;
    IF NOT v_lock_acquired THEN
        RETURN jsonb_build_object(
            'version','v4.1_2026-06-13',
            'status','skipped_already_running',
            'executed_at', now()
        );
    END IF;

    FOR rec IN
        SELECT DISTINCT ON (p.id)
            p.id            AS product_id,
            p.supplier_id   AS supplier_id,   -- FIX v4.1: adicionado
            p.created_at    AS product_created_at,
            s.code          AS supplier_code,
            spr.raw_data->>'UpdateDate' AS update_date_str
        FROM products p
        JOIN suppliers s ON s.id = p.supplier_id
        LEFT JOIN supplier_products_raw spr ON spr.product_id = p.id
        WHERE p.is_active    = true
          AND p.is_stockout  = false
          AND p.supplier_id != 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'  -- exclui SPOT
          AND p.created_at  >= now() - INTERVAL '30 days'
          AND NOT EXISTS (
              SELECT 1 FROM product_novelties pn WHERE pn.product_id = p.id
          )
        ORDER BY p.id, spr.created_at DESC
    LOOP
        v_source := lower(coalesce(rec.supplier_code,'generic')) || '_recently_promoted';

        BEGIN
            IF rec.update_date_str IS NOT NULL AND rec.update_date_str != '' THEN
                v_update_date := TO_TIMESTAMP(rec.update_date_str, 'MM/DD/YYYY HH24:MI:SS');
            ELSE
                v_update_date := rec.product_created_at;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_update_date := rec.product_created_at;
        END;

        v_expires_at := v_update_date + INTERVAL '30 days';
        v_is_active  := v_expires_at > NOW();

        BEGIN
            -- FIX v4.1: supplier_id e supplier_code agora incluídos
            INSERT INTO product_novelties (
                product_id, supplier_id, supplier_code,
                detected_at, expires_at, is_active, source, notes
            ) VALUES (
                rec.product_id,
                rec.supplier_id,       -- FIX v4.1
                rec.supplier_code,     -- FIX v4.1
                v_update_date,
                v_expires_at,
                v_is_active,
                v_source,
                'Backfill v4.1: supplier_id incluído, fonte dinâmica por fornecedor'
            );

            IF v_is_active THEN
                UPDATE products
                SET is_new_expires_at = v_expires_at, updated_at = now()
                WHERE id = rec.product_id AND is_new = true AND is_new_expires_at IS NULL;
                v_inserted := v_inserted + 1;
            ELSE
                v_expired := v_expired + 1;
            END IF;
        EXCEPTION WHEN unique_violation THEN
            v_skipped := v_skipped + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'version',            'v4.1_2026-06-13',
        'total_processed',    v_inserted + v_expired,
        'active_novelties',   v_inserted,
        'already_expired',    v_expired,
        'skipped_duplicates', v_skipped,
        'fix',                'supplier_id_e_supplier_code_agora_incluidos',
        'executed_at',        now()
    );
END;
$function$
