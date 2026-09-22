-- E37 — Divide os statements internos dos 5 cron jobs que são
-- genuinamente multi-statement (245/schema-drift-check já foi corrigido
-- pela migration do E47) em chamadas isoladas de fn_cron_safe_run, para
-- que a falha de um statement não impeça os seguintes de rodar
-- silenciosamente (bug #13 do plano).
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E37)
-- Ver docs/E37_CRON_MULTISTATEMENT_2026-09-17.md para a investigação completa,
-- incluindo a correção da query §8.4 de docs/SCHEMA_REFERENCE.md (falso
-- positivo: contava ';' no texto inteiro do command, que sempre bate 2 para
-- qualquer job wrapped de 1 statement único).
--
-- Exceção deliberada: 244 (refresh-category-ancestors) NÃO é dividido —
-- TRUNCATE+INSERT são uma operação lógica acoplada; embrulhá-los juntos em
-- 1 chamada usa o savepoint implícito do bloco EXCEPTION de
-- fn_cron_safe_run como atomicidade desejada (se o INSERT falhar, o
-- TRUNCATE também é desfeito, evitando tabela derivada permanentemente
-- vazia). Ver doc, seção "244".
--
-- Nenhuma função é criada ou alterada. Nenhum schedule muda. Chaves de
-- advisory lock novas (300, 301, 302) não colidem com nenhuma chave em uso
-- por outro job ativo (verificado nesta revisão).
--
-- [REQUER-PO] — não aplicado nesta revisão. Caminho de aplicação: E15
-- (.github/workflows/db-apply-migration.yml), nunca supabase db push.
--
-- Rollback: cron.alter_job de volta aos 5 commands originais (bare/wrapped
-- multi-statement) — comandos completos na seção "Reversão" ao final deste
-- arquivo. Reintroduz o risco descrito acima; só usar se a divisão causar
-- problema inesperado.

DO $precondition$
DECLARE
  v_cmd text;
BEGIN
  IF to_regprocedure('public.fn_cron_safe_run(bigint, text, integer, text)') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: fn_cron_safe_run(bigint, text, integer, text) não existe';
  END IF;

  -- 233
  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 233 AND jobname = 'ai-queue-stuck-cleanup' AND active;
  IF v_cmd IS NULL OR v_cmd NOT LIKE '%fn_cron_safe_run(154::bigint%'
     OR (length(v_cmd) - length(replace(v_cmd, 'UPDATE ai_enrichment_queue', ''))) / length('UPDATE ai_enrichment_queue') <> 4 THEN
    RAISE EXCEPTION 'Precondição falhou: jobid=233 não bate com o padrão esperado (4 UPDATEs em ai_enrichment_queue, chave 154)';
  END IF;

  -- 208
  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 208 AND jobname = 'fantasmas-deactivate-guard' AND active;
  IF v_cmd IS NULL OR v_cmd NOT LIKE '%fn_cron_safe_run(166::bigint%'
     OR (length(v_cmd) - length(replace(v_cmd, 'UPDATE products', ''))) / length('UPDATE products') <> 3 THEN
    RAISE EXCEPTION 'Precondição falhou: jobid=208 não bate com o padrão esperado (3 UPDATEs em products, chave 166)';
  END IF;

  -- 195
  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 195 AND jobname = 'analyze-weekly-supplement' AND active;
  IF v_cmd IS NULL OR v_cmd LIKE '%fn_cron_safe_run%'
     OR (length(v_cmd) - length(replace(v_cmd, 'ANALYZE public.', ''))) / length('ANALYZE public.') <> 10 THEN
    RAISE EXCEPTION 'Precondição falhou: jobid=195 não bate com o padrão esperado (10 ANALYZE bare)';
  END IF;

  -- 53
  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 53 AND jobname = 'vacuum-analyze-weekly' AND active;
  IF v_cmd IS NULL OR v_cmd LIKE '%fn_cron_safe_run%'
     OR (length(v_cmd) - length(replace(v_cmd, 'ANALYZE public.', ''))) / length('ANALYZE public.') <> 22 THEN
    RAISE EXCEPTION 'Precondição falhou: jobid=53 não bate com o padrão esperado (22 ANALYZE bare)';
  END IF;

  -- 244
  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 244 AND jobname = 'refresh-category-ancestors' AND active;
  IF v_cmd IS NULL OR v_cmd NOT LIKE 'TRUNCATE public.category_ancestors%'
     OR v_cmd NOT LIKE '%WITH RECURSIVE closure%' OR v_cmd LIKE '%fn_cron_safe_run%' THEN
    RAISE EXCEPTION 'Precondição falhou: jobid=244 não bate com o padrão esperado (TRUNCATE+INSERT WITH RECURSIVE, bare)';
  END IF;

  -- chaves novas não podem colidir com nenhum job ativo hoje
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE active AND jobid NOT IN (233, 208, 195, 53, 244)
      AND (command LIKE '%fn_cron_safe_run(300::bigint%'
        OR command LIKE '%fn_cron_safe_run(301::bigint%'
        OR command LIKE '%fn_cron_safe_run(302::bigint%')
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: chave de advisory lock 300/301/302 já em uso por outro job ativo';
  END IF;
END;
$precondition$;

-- 233 — ai-queue-stuck-cleanup: 4 UPDATEs independentes, mesma chave (154, reentrante/sequencial)
SELECT cron.alter_job(233, command := $cmd$
  SELECT public.fn_cron_safe_run(154::bigint, $sql$UPDATE ai_enrichment_queue SET status='pending', locked_by=NULL, locked_at=NULL, last_error='cron-reset:stuck>'||ROUND(EXTRACT(EPOCH FROM (now()-locked_at))/3600,1)||'h', updated_at=now() WHERE status='processing' AND locked_at < now() - interval '2 hours' AND attempts < max_attempts;$sql$, 30000, 'ai-queue-stuck-reset-timeout');
  SELECT public.fn_cron_safe_run(154::bigint, $sql$UPDATE ai_enrichment_queue SET status='error', locked_by=NULL, locked_at=NULL, last_error=COALESCE(last_error,'')||' | exhausted-max='||attempts::text, updated_at=now() WHERE status='processing' AND locked_at < now() - interval '1 hour' AND attempts >= max_attempts;$sql$, 30000, 'ai-queue-stuck-exhausted-processing');
  SELECT public.fn_cron_safe_run(154::bigint, $sql$UPDATE ai_enrichment_queue SET status='error', last_error=COALESCE(last_error,'')||' | pending-exhausted-max='||attempts::text, updated_at=now() WHERE status='pending' AND attempts >= max_attempts;$sql$, 30000, 'ai-queue-stuck-exhausted-pending');
  SELECT public.fn_cron_safe_run(154::bigint, $sql$UPDATE ai_enrichment_queue SET locked_by=NULL, locked_at=NULL, updated_at=now() WHERE status NOT IN ('processing','pending') AND locked_by IS NOT NULL;$sql$, 30000, 'ai-queue-stuck-clear-orphan-lock');
$cmd$);

-- 208 — fantasmas-deactivate-guard: 3 UPDATEs independentes, mesma chave (166, reentrante/sequencial)
SELECT cron.alter_job(208, command := $cmd$
  SELECT public.fn_cron_safe_run(166::bigint, $sql$UPDATE products SET is_active = false, updated_at = now() WHERE is_active = true AND supplier_reference IS NULL AND sku IS NULL AND supplier_id IS NOT NULL;$sql$, 44000, 'fantasmas-guard-orphan-supplier');
  SELECT public.fn_cron_safe_run(166::bigint, $sql$UPDATE products SET is_active = false, updated_at = now() WHERE 'active' = ANY(COALESCE(locked_fields, '{}')) AND is_active = true;$sql$, 44000, 'fantasmas-guard-locked-active');
  SELECT public.fn_cron_safe_run(166::bigint, $sql$UPDATE products SET is_active = true, updated_at = now() WHERE sku LIKE 'XBZ-MANUAL-%' AND is_active = false AND is_deleted = false;$sql$, 44000, 'fantasmas-guard-reactivate-manual');
$cmd$);

-- 195 — analyze-weekly-supplement: 10 ANALYZE independentes, chave nova 300 (reentrante/sequencial)
SELECT cron.alter_job(195, command := $cmd$
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.stock_daily_summary;$sql$, 60000, 'analyze-weekly-supp-01');
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.mv_product_images_audit;$sql$, 60000, 'analyze-weekly-supp-02');
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.image_backfill_queue;$sql$, 60000, 'analyze-weekly-supp-03');
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.variant_supplier_sources;$sql$, 60000, 'analyze-weekly-supp-04');
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.produtos_padronizacao;$sql$, 60000, 'analyze-weekly-supp-05');
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.product_properties;$sql$, 60000, 'analyze-weekly-supp-06');
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.xbz_gallery_staging;$sql$, 60000, 'analyze-weekly-supp-07');
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.xbz_upload_mapping;$sql$, 60000, 'analyze-weekly-supp-08');
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.supplier_customization_options_raw;$sql$, 60000, 'analyze-weekly-supp-09');
  SELECT public.fn_cron_safe_run(300::bigint, $sql$ANALYZE public.product_tags;$sql$, 60000, 'analyze-weekly-supp-10');
$cmd$);

-- 53 — vacuum-analyze-weekly: 22 ANALYZE independentes, chave nova 301 (reentrante/sequencial)
SELECT cron.alter_job(53, command := $cmd$
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.product_images;$sql$, 60000, 'vacuum-analyze-weekly-01');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.product_relationships;$sql$, 60000, 'vacuum-analyze-weekly-02');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.products;$sql$, 60000, 'vacuum-analyze-weekly-03');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.product_variants;$sql$, 60000, 'vacuum-analyze-weekly-04');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.supplier_import_batches;$sql$, 60000, 'vacuum-analyze-weekly-05');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.product_category_assignments;$sql$, 60000, 'vacuum-analyze-weekly-06');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.admin_audit_log;$sql$, 60000, 'vacuum-analyze-weekly-07');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.frontend_telemetry;$sql$, 60000, 'vacuum-analyze-weekly-08');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.supplier_products_raw;$sql$, 60000, 'vacuum-analyze-weekly-09');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.supplier_products_raw_history;$sql$, 60000, 'vacuum-analyze-weekly-10');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.search_analytics;$sql$, 60000, 'vacuum-analyze-weekly-11');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.product_views;$sql$, 60000, 'vacuum-analyze-weekly-12');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.catalog_analytics;$sql$, 60000, 'vacuum-analyze-weekly-13');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.navigation_analytics;$sql$, 60000, 'vacuum-analyze-weekly-14');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.dashboard_insights_cache;$sql$, 60000, 'vacuum-analyze-weekly-15');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.analytics_events;$sql$, 60000, 'vacuum-analyze-weekly-16');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.user_search_history;$sql$, 60000, 'vacuum-analyze-weekly-17');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.pipeline_run_log;$sql$, 60000, 'vacuum-analyze-weekly-18');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.video_validation_log;$sql$, 60000, 'vacuum-analyze-weekly-19');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.product_ai_history;$sql$, 60000, 'vacuum-analyze-weekly-20');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.audit_log_gravacao;$sql$, 60000, 'vacuum-analyze-weekly-21');
  SELECT public.fn_cron_safe_run(301::bigint, $sql$ANALYZE public.ingestion_run_log;$sql$, 60000, 'vacuum-analyze-weekly-22');
$cmd$);

-- 244 — refresh-category-ancestors: TRUNCATE+INSERT mantidos JUNTOS (acoplados),
-- embrulhados em 1 chamada para ganhar atomicidade via savepoint implícito
-- do bloco EXCEPTION de fn_cron_safe_run. Texto interno copiado verbatim do
-- command original (nenhuma statement foi alterada).
SELECT cron.alter_job(244, command := $cmd$
  SELECT public.fn_cron_safe_run(302::bigint, $sql$TRUNCATE public.category_ancestors; INSERT INTO public.category_ancestors (descendant_id, ancestor_id, depth) WITH RECURSIVE closure(descendant_id, ancestor_id, depth) AS (SELECT c.id, c.parent_id, 1::smallint FROM categories c WHERE c.parent_id IS NOT NULL UNION ALL SELECT cl.descendant_id, c.parent_id, (cl.depth + 1)::smallint FROM closure cl JOIN categories c ON c.id = cl.ancestor_id WHERE c.parent_id IS NOT NULL AND cl.depth < 10) SELECT descendant_id, ancestor_id, depth FROM closure;$sql$, 120000, 'refresh-category-ancestors-atomic');
$cmd$);

DO $postcondition$
DECLARE
  v_cmd text;
  v_calls int;
BEGIN
  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 233;
  v_calls := (length(v_cmd) - length(replace(v_cmd, 'fn_cron_safe_run(154::bigint', ''))) / length('fn_cron_safe_run(154::bigint');
  IF v_calls <> 4 THEN
    RAISE EXCEPTION 'Pós-condição falhou: jobid=233 esperava 4 chamadas fn_cron_safe_run(154, achou %', v_calls;
  END IF;

  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 208;
  v_calls := (length(v_cmd) - length(replace(v_cmd, 'fn_cron_safe_run(166::bigint', ''))) / length('fn_cron_safe_run(166::bigint');
  IF v_calls <> 3 THEN
    RAISE EXCEPTION 'Pós-condição falhou: jobid=208 esperava 3 chamadas fn_cron_safe_run(166, achou %', v_calls;
  END IF;

  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 195;
  v_calls := (length(v_cmd) - length(replace(v_cmd, 'fn_cron_safe_run(300::bigint', ''))) / length('fn_cron_safe_run(300::bigint');
  IF v_calls <> 10 THEN
    RAISE EXCEPTION 'Pós-condição falhou: jobid=195 esperava 10 chamadas fn_cron_safe_run(300, achou %', v_calls;
  END IF;

  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 53;
  v_calls := (length(v_cmd) - length(replace(v_cmd, 'fn_cron_safe_run(301::bigint', ''))) / length('fn_cron_safe_run(301::bigint');
  IF v_calls <> 22 THEN
    RAISE EXCEPTION 'Pós-condição falhou: jobid=53 esperava 22 chamadas fn_cron_safe_run(301, achou %', v_calls;
  END IF;

  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 244;
  IF v_cmd NOT LIKE '%fn_cron_safe_run(302::bigint%'
     OR v_cmd NOT LIKE '%TRUNCATE public.category_ancestors;%'
     OR v_cmd NOT LIKE '%WITH RECURSIVE closure%' THEN
    RAISE EXCEPTION 'Pós-condição falhou: jobid=244 não bate com o padrão esperado (1 chamada fn_cron_safe_run(302) contendo TRUNCATE+INSERT)';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobid IN (233, 208, 195, 53, 244) AND NOT active) THEN
    RAISE EXCEPTION 'Pós-condição falhou: algum dos 5 jobs ficou inativo';
  END IF;
END;
$postcondition$;

-- Reversão: restaura os 5 commands originais (bare/wrapped multi-statement,
-- reintroduz o risco descrito acima — só use se a divisão causar algum
-- problema inesperado):
--
-- SELECT cron.alter_job(233, command := $cmd$SELECT public.fn_cron_safe_run(154::bigint, $sql$
--     UPDATE ai_enrichment_queue SET status='pending', locked_by=NULL, locked_at=NULL,
--         last_error='cron-reset:stuck>'||ROUND(EXTRACT(EPOCH FROM (now()-locked_at))/3600,1)||'h', updated_at=now()
--     WHERE status='processing' AND locked_at < now() - interval '2 hours' AND attempts < max_attempts;
--     UPDATE ai_enrichment_queue SET status='error', locked_by=NULL, locked_at=NULL,
--         last_error=COALESCE(last_error,'')||' | exhausted-max='||attempts::text, updated_at=now()
--     WHERE status='processing' AND locked_at < now() - interval '1 hour' AND attempts >= max_attempts;
--     UPDATE ai_enrichment_queue SET status='error',
--         last_error=COALESCE(last_error,'')||' | pending-exhausted-max='||attempts::text, updated_at=now()
--     WHERE status='pending' AND attempts >= max_attempts;
--     UPDATE ai_enrichment_queue SET locked_by=NULL, locked_at=NULL, updated_at=now()
--     WHERE status NOT IN ('processing','pending') AND locked_by IS NOT NULL;
--   $sql$, 30000, 'ai-queue-stuck');$cmd$);
--
-- SELECT cron.alter_job(208, command := $cmd$
--   SELECT public.fn_cron_safe_run(166::bigint, $sql$
--     UPDATE products SET is_active = false, updated_at = now()
--     WHERE is_active = true AND supplier_reference IS NULL AND sku IS NULL AND supplier_id IS NOT NULL;
--     UPDATE products SET is_active = false, updated_at = now()
--     WHERE 'active' = ANY(COALESCE(locked_fields, '{}')) AND is_active = true;
--     UPDATE products SET is_active = true, updated_at = now()
--     WHERE sku LIKE 'XBZ-MANUAL-%' AND is_active = false AND is_deleted = false;
--   $sql$, 44000, 'fantasmas-guard');
--   $cmd$);
--
-- SELECT cron.alter_job(195, command := $cmd$
--     ANALYZE public.stock_daily_summary;
--     ANALYZE public.mv_product_images_audit;
--     ANALYZE public.image_backfill_queue;
--     ANALYZE public.variant_supplier_sources;
--     ANALYZE public.produtos_padronizacao;
--     ANALYZE public.product_properties;
--     ANALYZE public.xbz_gallery_staging;
--     ANALYZE public.xbz_upload_mapping;
--     ANALYZE public.supplier_customization_options_raw;
--     ANALYZE public.product_tags;
--   $cmd$);
--
-- SELECT cron.alter_job(53, command := $cmd$
--     ANALYZE public.product_images;
--     ANALYZE public.product_relationships;
--     ANALYZE public.products;
--     ANALYZE public.product_variants;
--     ANALYZE public.supplier_import_batches;
--     ANALYZE public.product_category_assignments;
--     ANALYZE public.admin_audit_log;
--     ANALYZE public.frontend_telemetry;
--     ANALYZE public.supplier_products_raw;
--     ANALYZE public.supplier_products_raw_history;
--     ANALYZE public.search_analytics;
--     ANALYZE public.product_views;
--     ANALYZE public.catalog_analytics;
--     ANALYZE public.navigation_analytics;
--     ANALYZE public.dashboard_insights_cache;
--     ANALYZE public.analytics_events;
--     ANALYZE public.user_search_history;
--     ANALYZE public.pipeline_run_log;
--     ANALYZE public.video_validation_log;
--     ANALYZE public.product_ai_history;
--     ANALYZE public.audit_log_gravacao;
--     ANALYZE public.ingestion_run_log;
--   $cmd$);
--
-- SELECT cron.alter_job(244, command := $cmd$TRUNCATE public.category_ancestors; INSERT INTO public.category_ancestors (descendant_id, ancestor_id, depth) WITH RECURSIVE closure(descendant_id, ancestor_id, depth) AS (SELECT c.id, c.parent_id, 1::smallint FROM categories c WHERE c.parent_id IS NOT NULL UNION ALL SELECT cl.descendant_id, c.parent_id, (cl.depth + 1)::smallint FROM closure cl JOIN categories c ON c.id = cl.ancestor_id WHERE c.parent_id IS NOT NULL AND cl.depth < 10) SELECT descendant_id, ancestor_id, depth FROM closure;$cmd$);
