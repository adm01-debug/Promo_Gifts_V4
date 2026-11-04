CREATE OR REPLACE FUNCTION public.fn_purge_expired_restock_dates(p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pv_nd1  int:=0; v_pv_nd2 int:=0; v_pv_nd3 int:=0;
    v_pv_nd4  int:=0; v_pv_nd5 int:=0; v_pv_nd6 int:=0;
    v_vss_nd1 int:=0; v_vss_nd2 int:=0; v_vss_nd3 int:=0;
    v_vss_nd4 int:=0; v_vss_nd5 int:=0; v_vss_nd6 int:=0;
    v_silver  int:=0; v_inactive int:=0;
    v_today   date := CURRENT_DATE;
    v_t0      timestamptz := clock_timestamp();
BEGIN
    IF NOT pg_try_advisory_xact_lock(hashtext('fn_purge_expired_restock_dates')::bigint) THEN
        RETURN jsonb_build_object('skipped','lock_ocupado','ts',now());
    END IF;
    PERFORM set_config('app.bulk_import_mode','true',true);
    PERFORM set_config('app.write_source','pipeline_cleanup',true);

    -- Diagnóstico
    SELECT COUNT(CASE WHEN next_date_1<v_today AND next_date_1 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_2<v_today AND next_date_2 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_3<v_today AND next_date_3 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_4<v_today AND next_date_4 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_5<v_today AND next_date_5 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_6<v_today AND next_date_6 IS NOT NULL THEN 1 END)
    INTO v_pv_nd1,v_pv_nd2,v_pv_nd3,v_pv_nd4,v_pv_nd5,v_pv_nd6 FROM product_variants;

    SELECT COUNT(CASE WHEN next_date_1<v_today AND next_date_1 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_2<v_today AND next_date_2 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_3<v_today AND next_date_3 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_4<v_today AND next_date_4 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_5<v_today AND next_date_5 IS NOT NULL THEN 1 END),
           COUNT(CASE WHEN next_date_6<v_today AND next_date_6 IS NOT NULL THEN 1 END)
    INTO v_vss_nd1,v_vss_nd2,v_vss_nd3,v_vss_nd4,v_vss_nd5,v_vss_nd6 FROM variant_supplier_sources;

    SELECT COUNT(*) INTO v_silver FROM produtos_padronizacao_variantes
    WHERE next_date_1 IS NOT NULL AND next_date_1 < v_today;

    SELECT COUNT(*) INTO v_inactive FROM product_variants
    WHERE is_active=false AND (next_date_1 IS NOT NULL OR next_date_2 IS NOT NULL);

    IF p_dry_run THEN
        RETURN jsonb_build_object('dry_run',true,
            'pv',  jsonb_build_object('nd1',v_pv_nd1,'nd2',v_pv_nd2,'nd3',v_pv_nd3,'nd4',v_pv_nd4,'nd5',v_pv_nd5,'nd6',v_pv_nd6),
            'vss', jsonb_build_object('nd1',v_vss_nd1,'nd2',v_vss_nd2,'nd3',v_vss_nd3,'nd4',v_vss_nd4,'nd5',v_vss_nd5,'nd6',v_vss_nd6),
            'silver_expiradas',v_silver,'inactive_with_dates',v_inactive,'cutoff_date',v_today);
    END IF;

    -- PV (janelas 1-6)
    UPDATE product_variants SET next_date_1=NULL,next_quantity_1=NULL,updated_at=now() WHERE next_date_1 IS NOT NULL AND next_date_1<v_today;
    UPDATE product_variants SET next_date_2=NULL,next_quantity_2=NULL,updated_at=now() WHERE next_date_2 IS NOT NULL AND next_date_2<v_today;
    UPDATE product_variants SET next_date_3=NULL,next_quantity_3=NULL,updated_at=now() WHERE next_date_3 IS NOT NULL AND next_date_3<v_today;
    UPDATE product_variants SET next_date_4=NULL,next_quantity_4=NULL,updated_at=now() WHERE next_date_4 IS NOT NULL AND next_date_4<v_today;
    UPDATE product_variants SET next_date_5=NULL,next_quantity_5=NULL,updated_at=now() WHERE next_date_5 IS NOT NULL AND next_date_5<v_today;
    UPDATE product_variants SET next_date_6=NULL,next_quantity_6=NULL,updated_at=now() WHERE next_date_6 IS NOT NULL AND next_date_6<v_today;

    -- VSS (janelas 1-6)
    UPDATE variant_supplier_sources SET next_date_1=NULL,next_quantity_1=NULL,updated_at=now() WHERE next_date_1 IS NOT NULL AND next_date_1<v_today;
    UPDATE variant_supplier_sources SET next_date_2=NULL,next_quantity_2=NULL,updated_at=now() WHERE next_date_2 IS NOT NULL AND next_date_2<v_today;
    UPDATE variant_supplier_sources SET next_date_3=NULL,next_quantity_3=NULL,updated_at=now() WHERE next_date_3 IS NOT NULL AND next_date_3<v_today;
    UPDATE variant_supplier_sources SET next_date_4=NULL,next_quantity_4=NULL,updated_at=now() WHERE next_date_4 IS NOT NULL AND next_date_4<v_today;
    UPDATE variant_supplier_sources SET next_date_5=NULL,next_quantity_5=NULL,updated_at=now() WHERE next_date_5 IS NOT NULL AND next_date_5<v_today;
    UPDATE variant_supplier_sources SET next_date_6=NULL,next_quantity_6=NULL,updated_at=now() WHERE next_date_6 IS NOT NULL AND next_date_6<v_today;

    -- SILVER: rede de segurança contra re-injeção via Medallion tick
    UPDATE produtos_padronizacao_variantes
    SET next_date_1=NULL,next_quantity_1=NULL,next_date_2=NULL,next_quantity_2=NULL,
        next_date_3=NULL,next_quantity_3=NULL,updated_at=now()
    WHERE (next_date_1 IS NOT NULL AND next_date_1<v_today)
       OR (next_date_2 IS NOT NULL AND next_date_2<v_today)
       OR (next_date_3 IS NOT NULL AND next_date_3<v_today);

    -- Pares incoerentes
    UPDATE product_variants SET next_quantity_1=NULL WHERE next_date_1 IS NULL AND next_quantity_1 IS NOT NULL;
    UPDATE variant_supplier_sources SET next_quantity_1=NULL WHERE next_date_1 IS NULL AND next_quantity_1 IS NOT NULL;

    -- PASSO 4: inativas
    UPDATE product_variants SET
        next_date_1=NULL,next_quantity_1=NULL,next_date_2=NULL,next_quantity_2=NULL,
        next_date_3=NULL,next_quantity_3=NULL,next_date_4=NULL,next_quantity_4=NULL,
        next_date_5=NULL,next_quantity_5=NULL,next_date_6=NULL,next_quantity_6=NULL,
        updated_at=now()
    WHERE is_active=false AND (next_date_1 IS NOT NULL OR next_date_2 IS NOT NULL
        OR next_date_3 IS NOT NULL OR next_date_4 IS NOT NULL);

    RETURN jsonb_build_object('success',true,
        'pv_limpos',  jsonb_build_object('nd1',v_pv_nd1,'nd2',v_pv_nd2,'nd3',v_pv_nd3,'nd4',v_pv_nd4,'nd5',v_pv_nd5,'nd6',v_pv_nd6),
        'vss_limpos', jsonb_build_object('nd1',v_vss_nd1,'nd2',v_vss_nd2,'nd3',v_vss_nd3,'nd4',v_vss_nd4,'nd5',v_vss_nd5,'nd6',v_vss_nd6),
        'silver_limpos',v_silver,'inactive_cleaned',v_inactive,
        'cobertura','PV+VSS+SILVER+INATIVAS_6janelas',
        'segundos',round(extract(epoch FROM clock_timestamp()-v_t0)::numeric,2),'ts',now());
END;
$function$
