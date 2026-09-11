CREATE OR REPLACE VIEW public.v_kit_ficha_pipeline_health AS
SELECT
  (SELECT count(*) FROM kit_component_ficha_staging)                                   AS staging_total,
  (SELECT count(*) FROM kit_component_ficha_staging WHERE match_status='pending')      AS staging_pendentes,
  (SELECT count(*) FROM kit_component_ficha_staging WHERE match_status='promoted')     AS staging_promovidos,
  (SELECT count(*) FROM kit_component_ficha_staging WHERE match_status='no_component') AS staging_sem_componente,
  (SELECT count(*) FROM kit_component_ficha_staging WHERE match_status='skipped')      AS staging_skipped,
  (SELECT count(*) FROM product_kit_components WHERE dim_source='ficha')               AS componentes_dim_real_ficha,
  (SELECT count(*) FROM product_kit_components WHERE dim_source='heuristic')           AS componentes_dim_heuristica,
  (SELECT count(*) FROM product_kit_components WHERE dim_source='manual')              AS componentes_dim_manual,
  (SELECT count(*) FROM v_xbz_ficha_parse_queue WHERE prioridade=1)                    AS fila_kits_dims_heuristicas,
  (SELECT count(*) FROM v_xbz_ficha_parse_queue WHERE prioridade=2)                    AS fila_kits_sem_componentes,
  (SELECT count(*) FROM v_xbz_ficha_parse_queue WHERE prioridade=3)                    AS fila_reclassificar,
  (SELECT coalesce(sum(n_dim_heuristicas),0) FROM v_xbz_ficha_parse_queue WHERE prioridade=1) AS dims_heuristicas_corrigiveis_via_ficha,
  round(100.0*(SELECT count(*) FROM product_kit_components WHERE dim_source='ficha')
        / NULLIF((SELECT count(*) FROM product_kit_components WHERE dim_source IS NOT NULL),0),2) AS pct_dims_reais;

COMMENT ON VIEW public.v_kit_ficha_pipeline_health IS
  'Saude do pipeline de ficha tecnica: estado da staging, procedencia das medidas (real vs heuristica) e tamanho da fila acionavel de parse.';;
