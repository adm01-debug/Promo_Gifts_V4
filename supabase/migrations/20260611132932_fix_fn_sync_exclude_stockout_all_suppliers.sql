
-- FIX: fn_sync_product_novelties → adiciona filtro is_stockout=false
-- para TODOS os fornecedores (antes só STRICKER filtrava via Bronze IsStockOut)
CREATE OR REPLACE FUNCTION public.fn_sync_product_novelties(
    p_recent_days_xbz   int  DEFAULT 60,
    p_recent_days_asia  int  DEFAULT 60,
    p_recent_days_sm    int  DEFAULT 60,
    p_recent_days_88    int  DEFAULT 60,
    p_expires_days      int  DEFAULT 60,
    p_dry_run           boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stricker_id  uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
    v_xbz_id       uuid := 'd6718a29-e954-4c1b-bd84-03ea24884900';
    v_asia_id      uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
    v_sm_id        uuid := '841cd690-210a-422a-908c-7676828db272';
    v_88_id        uuid;
    v_ins_stricker_new  int := 0;
    v_ins_stricker_cat  int := 0;
    v_ins_xbz           int := 0;
    v_ins_asia          int := 0;
    v_ins_sm            int := 0;
    v_ins_88            int := 0;
    v_total             int := 0;
BEGIN
    IF NOT pg_try_advisory_xact_lock(74108913) THEN
        RETURN jsonb_build_object('status','skipped','reason','advisory_lock_busy','ts',now());
    END IF;

    SELECT id INTO v_88_id FROM public.suppliers WHERE code='88BRINDES' LIMIT 1;

    IF p_dry_run THEN
        SELECT COUNT(*) INTO v_ins_stricker_new
        FROM public.products p
        JOIN public.supplier_products_raw spr
            ON spr.supplier_id=p.supplier_id
            AND SPLIT_PART(spr.supplier_sku,'-',1)=p.supplier_reference
        WHERE p.supplier_id=v_stricker_id
          AND p.is_active=true
          AND p.is_stockout=false                         -- FIX: filtro adicionado
          AND spr.raw_data->>'NewProduct'='true'
          AND COALESCE(spr.raw_data->>'IsStockOut','false')<>'true'
          AND NOT EXISTS(SELECT 1 FROM public.product_novelties pn WHERE pn.product_id=p.id AND pn.is_active=true);
        RETURN jsonb_build_object('status','dry_run','would_insert_stricker_new_product',v_ins_stricker_new,'ts',now());
    END IF;

    -- ─── STRICKER: NewProduct=true ──────────────────────────────────
    WITH to_insert AS (
        SELECT DISTINCT p.id AS product_id
        FROM public.products p
        JOIN public.supplier_products_raw spr
            ON spr.supplier_id=p.supplier_id
            AND SPLIT_PART(spr.supplier_sku,'-',1)=p.supplier_reference
        WHERE p.supplier_id=v_stricker_id
          AND p.is_active=true
          AND p.is_stockout=false                         -- FIX ←
          AND spr.raw_data->>'NewProduct'='true'
          AND COALESCE(spr.raw_data->>'IsStockOut','false')<>'true'
          AND NOT EXISTS(SELECT 1 FROM public.product_novelties pn WHERE pn.product_id=p.id AND pn.is_active=true)
    ), inserted AS (
        INSERT INTO public.product_novelties(product_id,supplier_id,supplier_code,source,detected_at,expires_at,is_active,is_highlighted,notes)
        SELECT ti.product_id,v_stricker_id,'STRICKER','spot_new_product',now(),now()+(p_expires_days||' days')::interval,true,false,
               'Detectado automaticamente via Bronze raw_data.NewProduct=true'
        FROM to_insert ti ON CONFLICT DO NOTHING RETURNING 1
    ) SELECT COUNT(*) INTO v_ins_stricker_new FROM inserted;

    -- ─── STRICKER: Catalogs Novidades ────────────────────────────────
    WITH to_insert AS (
        SELECT DISTINCT p.id AS product_id
        FROM public.products p
        JOIN public.supplier_products_raw spr
            ON spr.supplier_id=p.supplier_id
            AND SPLIT_PART(spr.supplier_sku,'-',1)=p.supplier_reference
        WHERE p.supplier_id=v_stricker_id
          AND p.is_active=true
          AND p.is_stockout=false                         -- FIX ←
          AND spr.raw_data->>'Catalogs' ILIKE '%Novidades%'
          AND COALESCE(spr.raw_data->>'NewProduct','false')<>'true'
          AND COALESCE(spr.raw_data->>'IsStockOut','false')<>'true'
          AND NOT EXISTS(SELECT 1 FROM public.product_novelties pn WHERE pn.product_id=p.id AND pn.is_active=true)
    ), inserted AS (
        INSERT INTO public.product_novelties(product_id,supplier_id,supplier_code,source,detected_at,expires_at,is_active,is_highlighted,notes)
        SELECT ti.product_id,v_stricker_id,'STRICKER','spot_catalogo_novidades',now(),now()+(p_expires_days||' days')::interval,true,false,
               'Detectado automaticamente via Bronze Catalogs contém Novidades'
        FROM to_insert ti ON CONFLICT DO NOTHING RETURNING 1
    ) SELECT COUNT(*) INTO v_ins_stricker_cat FROM inserted;

    -- ─── XBZ: recentemente promovidos ──────────────────────────────
    WITH to_insert AS (
        SELECT p.id AS product_id
        FROM public.products p
        WHERE p.supplier_id=v_xbz_id
          AND p.is_active=true
          AND p.is_stockout=false                         -- FIX ←
          AND p.created_at>=now()-(p_recent_days_xbz||' days')::interval
          AND NOT EXISTS(SELECT 1 FROM public.product_novelties pn WHERE pn.product_id=p.id AND pn.is_active=true)
    ), inserted AS (
        INSERT INTO public.product_novelties(product_id,supplier_id,supplier_code,source,detected_at,expires_at,is_active,is_highlighted,notes)
        SELECT ti.product_id,v_xbz_id,'XBZ','xbz_recently_promoted',p.created_at,p.created_at+(p_expires_days||' days')::interval,true,false,
               'XBZ promovido nos últimos '||p_recent_days_xbz||' dias'
        FROM to_insert ti JOIN public.products p ON p.id=ti.product_id
        ON CONFLICT DO NOTHING RETURNING 1
    ) SELECT COUNT(*) INTO v_ins_xbz FROM inserted;

    -- ─── ASIA: recentemente promovidos ──────────────────────────────
    WITH to_insert AS (
        SELECT p.id AS product_id
        FROM public.products p
        WHERE p.supplier_id=v_asia_id
          AND p.is_active=true
          AND p.is_stockout=false                         -- FIX ←
          AND p.created_at>=now()-(p_recent_days_asia||' days')::interval
          AND NOT EXISTS(SELECT 1 FROM public.product_novelties pn WHERE pn.product_id=p.id AND pn.is_active=true)
    ), inserted AS (
        INSERT INTO public.product_novelties(product_id,supplier_id,supplier_code,source,detected_at,expires_at,is_active,is_highlighted,notes)
        SELECT ti.product_id,v_asia_id,'ASIA','asia_recently_promoted',p.created_at,p.created_at+(p_expires_days||' days')::interval,true,false,
               'ASIA promovido nos últimos '||p_recent_days_asia||' dias'
        FROM to_insert ti JOIN public.products p ON p.id=ti.product_id
        ON CONFLICT DO NOTHING RETURNING 1
    ) SELECT COUNT(*) INTO v_ins_asia FROM inserted;

    -- ─── SOMARCAS ────────────────────────────────────────────────────
    WITH to_insert AS (
        SELECT p.id AS product_id
        FROM public.products p
        WHERE p.supplier_id=v_sm_id
          AND p.is_active=true
          AND p.is_stockout=false                         -- FIX ←
          AND p.created_at>=now()-(p_recent_days_sm||' days')::interval
          AND NOT EXISTS(SELECT 1 FROM public.product_novelties pn WHERE pn.product_id=p.id AND pn.is_active=true)
    ), inserted AS (
        INSERT INTO public.product_novelties(product_id,supplier_id,supplier_code,source,detected_at,expires_at,is_active,is_highlighted,notes)
        SELECT ti.product_id,v_sm_id,'SOMARCAS','sm_recently_promoted',p.created_at,p.created_at+(p_expires_days||' days')::interval,true,false,
               'SOMARCAS promovido nos últimos '||p_recent_days_sm||' dias'
        FROM to_insert ti JOIN public.products p ON p.id=ti.product_id
        ON CONFLICT DO NOTHING RETURNING 1
    ) SELECT COUNT(*) INTO v_ins_sm FROM inserted;

    -- ─── 88BRINDES ──────────────────────────────────────────────────
    IF v_88_id IS NOT NULL THEN
        WITH to_insert AS (
            SELECT p.id AS product_id
            FROM public.products p
            WHERE p.supplier_id=v_88_id
              AND p.is_active=true
              AND p.is_stockout=false                     -- FIX ←
              AND p.created_at>=now()-(p_recent_days_88||' days')::interval
              AND NOT EXISTS(SELECT 1 FROM public.product_novelties pn WHERE pn.product_id=p.id AND pn.is_active=true)
        ), inserted AS (
            INSERT INTO public.product_novelties(product_id,supplier_id,supplier_code,source,detected_at,expires_at,is_active,is_highlighted,notes)
            SELECT ti.product_id,v_88_id,'88BRINDES','88brindes_recently_promoted',p.created_at,p.created_at+(p_expires_days||' days')::interval,true,false,
                   '88BRINDES promovido nos últimos '||p_recent_days_88||' dias'
            FROM to_insert ti JOIN public.products p ON p.id=ti.product_id
            ON CONFLICT DO NOTHING RETURNING 1
        ) SELECT COUNT(*) INTO v_ins_88 FROM inserted;
    END IF;

    v_total := v_ins_stricker_new+v_ins_stricker_cat+v_ins_xbz+v_ins_asia+v_ins_sm+v_ins_88;

    RETURN jsonb_build_object(
        'status','ok','total_inserted',v_total,
        'stricker_new_product',v_ins_stricker_new,'stricker_catalogo',v_ins_stricker_cat,
        'xbz',v_ins_xbz,'asia',v_ins_asia,'somarcas',v_ins_sm,'88brindes',v_ins_88,
        'params',jsonb_build_object('expires_days',p_expires_days,
            'recent_days_xbz',p_recent_days_xbz,'recent_days_asia',p_recent_days_asia,
            'recent_days_sm',p_recent_days_sm,'recent_days_88',p_recent_days_88),
        'ran_at',now()
    );
END;
$$;
;
