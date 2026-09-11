
-- G1/G2 residue (SAFE, metadata-only): document that public.mv_* are EXPOSURE VIEWS
-- over real materialized views living in schema analytics, refreshed hourly by cron job 47.
-- Goal: remove the "naming trap" (prefix mv_ on a plain public VIEW) for future maintainers.

COMMENT ON VIEW public.mv_product_cards IS
  'VIEW pública de exposição (PostgREST só enxerga public). Dados materializados em analytics.mv_product_cards (matview real, índice único, refresh CONCURRENTLY). Atualizada de hora em hora pelo cron job 47 "refresh-all-materialized-views" (30 * * * *). Apesar do prefixo mv_, ESTE objeto em public é uma VIEW comum — NUNCA rode REFRESH MATERIALIZED VIEW aqui (rode em analytics.*). Defasagem máx vs products ~1h.';

COMMENT ON VIEW public.mv_product_compositions IS
  'VIEW pública de exposição sobre a matview analytics.mv_product_compositions (refresh CONCURRENTLY via cron 47, hourly). public.mv_* é VIEW, não matview — não rode REFRESH aqui.';

COMMENT ON VIEW public.mv_product_intelligence IS
  'VIEW pública de exposição sobre a matview analytics.mv_product_intelligence (depende de mv_stock_velocity; refresh via cron 47, hourly). public.mv_* é VIEW, não matview.';

COMMENT ON VIEW public.mv_stock_velocity IS
  'VIEW pública de exposição sobre a matview analytics.mv_stock_velocity (refresh CONCURRENTLY via cron 47, hourly). public.mv_* é VIEW, não matview.';

COMMENT ON VIEW public.mv_material_group_stats IS
  'VIEW pública de exposição sobre a matview analytics.mv_material_group_stats (refresh CONCURRENTLY via cron 47, hourly). public.mv_* é VIEW, não matview.';

COMMENT ON VIEW public.mv_media_health IS
  'VIEW pública de exposição sobre a matview analytics.mv_media_health (refresh CONCURRENTLY via cron 47, hourly). public.mv_* é VIEW, não matview.';

COMMENT ON FUNCTION public.refresh_all_materialized_views() IS
  'CORRETA E EM USO (cron job 47, 30 * * * *). Atualiza as 7 matviews REAIS em analytics: CONCURRENTLY nas 6 com índice único; REFRESH plain em analytics.categories_tree_visual (sem índice único). NÃO é bug — os objetos analytics.mv_* são matviews de fato.';

COMMENT ON FUNCTION public.refresh_materialized_views() IS
  'Atualiza analytics.mv_material_group_stats e analytics.mv_product_compositions (CONCURRENTLY). Alvos são matviews REAIS no schema analytics — função correta.';

COMMENT ON FUNCTION public.fn_refresh_media_health() IS
  'Atualiza analytics.mv_media_health (CONCURRENTLY). Alvo é matview REAL no schema analytics — função correta.';
;
