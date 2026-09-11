
-- Fix 1: fn_site_pipeline_health — adicionar SET search_path
CREATE OR REPLACE FUNCTION public.fn_site_pipeline_health(
    p_supplier uuid DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
    SELECT jsonb_build_object(
        'ts', now(),
        'bronze', (SELECT jsonb_build_object(
            'total',count(*),'processed',count(*) FILTER (WHERE site_status::text='processed'),
            'failed',count(*) FILTER (WHERE site_status::text='failed'),
            'sem_scrape',count(*) FILTER (WHERE site_status IS NULL),
            'pct_done',round(100.0*count(*) FILTER (WHERE site_status::text='processed')/nullif(count(*),0),1)
        ) FROM supplier_products_raw WHERE supplier_id=p_supplier),
        'silver_api', (SELECT jsonb_build_object(
            'total_pais',count(*),'promoted',count(*) FILTER (WHERE status='promoted'),
            'ncm_pct',round(100.0*count(*) FILTER (WHERE ncm_code IS NOT NULL)/nullif(count(*),0),2),
            'sem_ncm_worklist',count(*) FILTER (WHERE validation_errors ? 'ncm_ausente_origem')
        ) FROM produtos_padronizacao WHERE supplier_id=p_supplier),
        'silver_site', (SELECT jsonb_build_object(
            'total',count(*),'promoted',count(*) FILTER (WHERE status='promoted'),
            'standardized',count(*) FILTER (WHERE status='standardized'),
            'rejected',count(*) FILTER (WHERE status='rejected'),
            'linkados',count(*) FILTER (WHERE product_id IS NOT NULL),
            'pct_promoted',round(100.0*count(*) FILTER (WHERE status='promoted')/nullif(count(*),0),1)
        ) FROM produtos_site_padronizacao WHERE supplier_id=p_supplier),
        'staging_imagens', (SELECT jsonb_build_object(
            'total',count(*),'produtos',count(DISTINCT sku),
            'pending',  count(*) FILTER (WHERE status='pending'),
            'uploading',count(*) FILTER (WHERE status='uploading'),
            'uploaded', count(*) FILTER (WHERE status='uploaded'),
            'error',    count(*) FILTER (WHERE status='error')
        ) FROM xbz_gallery_staging),
        'cron',(SELECT row_to_json(t) FROM (
            SELECT jobid,schedule,active FROM cron.job
            WHERE command ILIKE '%fn_xbz_site_tick%' LIMIT 1
        ) t)
    ) INTO r;
    RETURN r;
END $$;

-- Fix 2: status nullable — alinha com SM (YES nullable)
ALTER TABLE public.xbz_gallery_staging
    ALTER COLUMN status DROP NOT NULL;

NOTIFY pgrst, 'reload schema';
;
