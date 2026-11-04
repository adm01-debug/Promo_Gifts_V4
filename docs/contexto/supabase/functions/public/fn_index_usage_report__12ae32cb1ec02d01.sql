CREATE OR REPLACE FUNCTION public.fn_index_usage_report()
 RETURNS TABLE(tabela text, indice text, tamanho text, scans bigint, tipo text, recomendacao text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT 
    (s.schemaname || '.' || s.relname)::text AS tabela,
    s.indexrelname::text AS indice,
    pg_size_pretty(pg_relation_size(s.indexrelid))::text AS tamanho,
    s.idx_scan AS scans,
    CASE 
      WHEN s.indexrelname LIKE '%_pkey' THEN 'PRIMARY KEY'
      WHEN s.indexrelname LIKE 'uq_%' THEN 'UNIQUE'
      WHEN s.indexrelname LIKE '%_brin' THEN 'BRIN'
      WHEN s.indexrelname LIKE 'idx_%_gin' THEN 'GIN'
      WHEN s.indexrelname LIKE 'idx_%_fkey%' OR s.indexrelname LIKE '%_fk_idx' THEN 'FK support'
      ELSE 'BTREE'
    END::text AS tipo,
    CASE 
      WHEN s.indexrelname LIKE '%_pkey' THEN 'MANTER (PK)'
      WHEN s.indexrelname LIKE 'uq_%' THEN 'MANTER (UNIQUE)'
      WHEN s.idx_scan = 0 AND pg_relation_size(s.indexrelid) > 1024*1024 
        THEN 'AVALIAR: sem uso e >1MB (mas verifique FK)'
      WHEN s.idx_scan = 0 THEN 'AVALIAR: sem uso'
      WHEN s.idx_scan < 10 THEN 'OK (uso baixo)'
      ELSE 'OK (usado)'
    END::text AS recomendacao
  FROM pg_stat_user_indexes s
  WHERE s.schemaname = 'public'
  ORDER BY pg_relation_size(s.indexrelid) DESC, s.idx_scan DESC;
$function$
