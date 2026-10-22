-- ============================================================
-- PROPOSTA P11 — PERF-010: Materializar v_super_filtro_options
-- Severidade: ALTO
-- Achado: PERF-010
-- Status: NÃO APLICADA — somente para revisão e aprovação do PO
-- ============================================================
-- PROBLEMA:
--   v_super_filtro_options executa 7 Seq Scans com UNION ALL e
--   custo estimado de 31.002 por query. Com 142 chamadas/24h e
--   mean de 5.046ms, contribui com ~720 segundos de CPU/dia.
--
-- EVIDÊNCIA (somente leitura, confirmada 2026-10-22):
--   EXPLAIN SELECT * FROM public.v_super_filtro_options WHERE ...
--   → cost=0.00..31002.xx, Seq Scan on product_variants, product_materials,
--     product_tags, product_color_groups, product_certifications
--
-- SOLUÇÃO:
--   Transformar em MATERIALIZED VIEW com refresh periódico a cada 5min.
--   Criar índices nas tabelas-fonte para os scans mais frequentes.
-- ============================================================

-- === VERIFICAÇÃO PRÉ-APLICAÇÃO ===
/*
SELECT definition FROM pg_views WHERE schemaname='public' AND viewname='v_super_filtro_options';
-- Ler a definição atual antes de criar a materialized view
*/

-- === APLICAÇÃO ===
-- NÃO EXECUTAR DIRETAMENTE — usar db-apply-migration.yml
/*
-- 1) Criar índices nas tabelas-fonte (CONCURRENTLY = sem lock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_org
  ON public.product_variants(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_materials_org
  ON public.product_materials(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_tags_org
  ON public.product_tags(organization_id);

-- 2) Drop view e criar materialized view com mesma definição
-- (substituir <DEFINICAO_ATUAL> pelo resultado da query acima)
DROP VIEW IF EXISTS public.v_super_filtro_options;
CREATE MATERIALIZED VIEW public.v_super_filtro_options AS
  <DEFINICAO_ATUAL>
WITH DATA;

-- 3) Criar índice na materialized view para filtragem rápida
CREATE INDEX ON public.v_super_filtro_options(organization_id);
CREATE INDEX ON public.v_super_filtro_options(type);

-- 4) Criar job de refresh (5 em 5 minutos)
SELECT cron.schedule(
  'refresh-super-filtro-options',
  '*/5 * * * *',
  $$SELECT public.fn_cron_safe_run(NULL, 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_super_filtro_options', 30000, 'refresh-super-filtro')$$
);
*/

-- === ROLLBACK ===
/*
SELECT cron.unschedule('refresh-super-filtro-options');
DROP MATERIALIZED VIEW IF EXISTS public.v_super_filtro_options;
-- Recriar a view original com a definição salva acima
*/

-- === RISCO DE REGRESSÃO ===
-- MÉDIO: A materialized view pode mostrar dados levemente desatualizados
-- (até 5min). Callers que dependem de dados em tempo real precisam de
-- verificação. Testar em staging primeiro.

-- === ESFORÇO ===
-- Médio (ler definição atual, criar índices, adaptar MATVIEW, criar cron)
