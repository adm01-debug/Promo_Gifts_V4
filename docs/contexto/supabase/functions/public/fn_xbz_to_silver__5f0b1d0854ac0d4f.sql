CREATE OR REPLACE FUNCTION public.fn_xbz_to_silver(p_bronze_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- ╔══════════════════════════════════════════════════════════════════════╗
  -- ║  DEPRECADA 2026-06 — NÃO CHAMAR DIRETAMENTE                         ║
  -- ║                                                                      ║
  -- ║  Escrevia em silver_products / silver_variants (Família B),          ║
  -- ║  tabelas DROPADAS. Qualquer execução real geraria:                    ║
  -- ║    ERROR 42P01: relation "silver_products" does not exist             ║
  -- ║                                                                      ║
  -- ║  PIPELINE CANÔNICO XBZ (use este):                                   ║
  -- ║  API  → fn_standardize_raw  → produtos_padronizacao (Família A)      ║
  -- ║  SITE → fn_site_to_silver_all → produtos_site_padronizacao (DE→PARA) ║
  -- ║       → fn_site_flag_divergent (guarda integridade)                  ║
  -- ║       → fn_site_promote_to_gold → product_properties / relationships  ║
  -- ║                                                                      ║
  -- ║  Orquestrador automático: fn_xbz_site_tick (cron jobid=56, */2 min) ║
  -- ║  Normalização: fn_sanitize_text (site) · fn_normalize_ncm (API)      ║
  -- ╚══════════════════════════════════════════════════════════════════════╝
  RAISE WARNING '[fn_xbz_to_silver] DEPRECADA 2026-06 — use fn_standardize_raw (API) ou fn_site_to_silver_all (site). Bronze ID ignorado: %', p_bronze_id;
  RETURN jsonb_build_object(
    'deprecated', true,
    'versao',     '2026-06',
    'motivo',     'Tabelas silver_products/silver_variants dropadas. Família B encerrada.',
    'pipeline_api',  'fn_standardize_raw → produtos_padronizacao → fn_promote_padronizacao',
    'pipeline_site', 'fn_site_to_silver_all → fn_site_flag_divergent → fn_site_promote_to_gold',
    'orquestrador',  'fn_xbz_site_tick (cron */2 min)',
    'bronze_id_ignorado', p_bronze_id,
    'ran_at', now()
  );
END $function$
