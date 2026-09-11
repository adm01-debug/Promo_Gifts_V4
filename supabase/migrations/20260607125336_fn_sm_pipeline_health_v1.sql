
-- ============================================================
--  fn_sm_pipeline_health — Diagnóstico completo do pipeline SM
--  Retorna um JSON com todos os KPIs em uma chamada.
--  Útil para dashboards, alertas e validação pós-deploy.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sm_pipeline_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_sup   uuid := '841cd690-210a-422a-908c-7676828db272';
  v_jina  text;
  v_cook  text;
  v_res   jsonb;
BEGIN
  -- Verificar Vault secrets (sem expor valores)
  BEGIN
    SELECT decrypted_secret INTO v_jina
    FROM vault.decrypted_secrets WHERE name='jina_api_key';
    SELECT decrypted_secret INTO v_cook
    FROM vault.decrypted_secrets WHERE name='sm_session_cookie';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  SELECT jsonb_build_object(
    'ts', now(),
    'supplier', 'Só Marcas',
    'supplier_id', v_sup,

    -- ── Vault ─────────────────────────────────────────────────────────────
    'vault', jsonb_build_object(
      'jina_api_key',       CASE WHEN v_jina IS NULL OR v_jina LIKE '__PLACEHOLDER%'
                                 THEN 'placeholder/missing' ELSE 'ok' END,
      'sm_session_cookie',  CASE WHEN v_cook IS NULL OR v_cook LIKE '__PLACEHOLDER%'
                                 THEN 'placeholder/missing' ELSE 'ok' END
    ),

    -- ── Bronze ────────────────────────────────────────────────────────────
    'bronze', jsonb_build_object(
      'total',        (SELECT count(*) FROM supplier_products_raw WHERE supplier_id=v_sup),
      'site_pending', (SELECT count(*) FROM supplier_products_raw
                       WHERE supplier_id=v_sup AND site_status='pending'),
      'site_processing', (SELECT count(*) FROM supplier_products_raw
                          WHERE supplier_id=v_sup AND site_status='processing'),
      'site_processed',  (SELECT count(*) FROM supplier_products_raw
                          WHERE supplier_id=v_sup AND site_status='processed'),
      'site_failed',     (SELECT count(*) FROM supplier_products_raw
                          WHERE supplier_id=v_sup AND site_status='failed'),
      'site_promoted',   (SELECT count(*) FROM supplier_products_raw
                          WHERE supplier_id=v_sup AND site_promoted_at IS NOT NULL),
      'last_scraped_at', (SELECT max(site_scraped_at) FROM supplier_products_raw
                          WHERE supplier_id=v_sup),
      'pct_scraped', round(100.0 *
        (SELECT count(*) FROM supplier_products_raw
         WHERE supplier_id=v_sup AND site_status='processed') /
        NULLIF((SELECT count(*) FROM supplier_products_raw WHERE supplier_id=v_sup), 0), 1),
      'errors_sample', (SELECT jsonb_agg(jsonb_build_object('codigo', raw_data->>'codigo',
                          'err', site_last_error, 'att', site_attempts))
                        FROM (SELECT raw_data, site_last_error, site_attempts
                              FROM supplier_products_raw
                              WHERE supplier_id=v_sup AND site_status='failed'
                              LIMIT 5) e)
    ),

    -- ── URL Map ───────────────────────────────────────────────────────────
    'url_map', jsonb_build_object(
      'total',           (SELECT count(*) FROM sm_site_url_map WHERE supplier_id=v_sup),
      'with_url',        (SELECT count(*) FROM sm_site_url_map
                          WHERE supplier_id=v_sup AND site_url IS NOT NULL),
      'without_site_id', (SELECT count(*) FROM sm_site_url_map
                          WHERE supplier_id=v_sup AND site_id IS NULL),
      'coverage_pct',    round(100.0 *
        (SELECT count(*) FROM sm_site_url_map WHERE supplier_id=v_sup AND site_url IS NOT NULL) /
        NULLIF((SELECT count(*) FROM supplier_products_raw WHERE supplier_id=v_sup), 0), 1),
      'by_source', (SELECT jsonb_object_agg(source, cnt)
                    FROM (SELECT source, count(*) AS cnt FROM sm_site_url_map
                          WHERE supplier_id=v_sup AND site_id IS NOT NULL
                          GROUP BY source) s),
      'search_status', (SELECT jsonb_object_agg(COALESCE(ss,'null'), cnt)
                        FROM (SELECT search_status AS ss, count(*) AS cnt
                              FROM sm_site_url_map
                              WHERE supplier_id=v_sup AND site_id IS NULL
                              GROUP BY ss) s)
    ),

    -- ── Gold ──────────────────────────────────────────────────────────────
    'gold', jsonb_build_object(
      'total_products',    (SELECT count(*) FROM products WHERE supplier_id=v_sup),
      'with_site_url',     (SELECT count(*) FROM products
                            WHERE supplier_id=v_sup AND supplier_product_url IS NOT NULL),
      'with_ncm',          (SELECT count(*) FROM products
                            WHERE supplier_id=v_sup AND ncm_code IS NOT NULL),
      'site_properties',   (SELECT count(*) FROM product_properties pp
                            JOIN products p ON p.id=pp.product_id
                            WHERE p.supplier_id=v_sup AND pp.source LIKE 'sm_site%'),
      'by_property_code',  (SELECT jsonb_object_agg(property_code, cnt)
                            FROM (SELECT pp.property_code, count(*) AS cnt
                                  FROM product_properties pp
                                  JOIN products p ON p.id=pp.product_id
                                  WHERE p.supplier_id=v_sup AND pp.source LIKE 'sm_site%'
                                  GROUP BY pp.property_code) s)
    ),

    -- ── Cron jobs ─────────────────────────────────────────────────────────
    'cron_jobs', (SELECT jsonb_agg(jsonb_build_object(
      'id', j.jobid, 'name', j.jobname, 'schedule', j.schedule, 'active', j.active,
      'last_run', jr.start_time, 'last_status', jr.status
    ))
    FROM cron.job j
    LEFT JOIN LATERAL (
      SELECT start_time, status FROM cron.job_run_details
      WHERE jobid = j.jobid ORDER BY start_time DESC LIMIT 1
    ) jr ON true
    WHERE j.jobname ILIKE '%sm%' OR j.command ILIKE '%sm%')

  ) INTO v_res;

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_sm_pipeline_health() TO service_role, authenticated;

COMMENT ON FUNCTION public.fn_sm_pipeline_health IS
    'Health check completo do SM Jina Scraping Pipeline. '
    'Retorna KPIs de Vault, Bronze, URL Map, Gold e Cron Jobs em um JSON.';
;
