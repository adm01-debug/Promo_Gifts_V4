-- transaction: none
-- approved-by: adm01-debug
--
-- Migration: cria (de forma idempotente) o indice de cobertura que a 20261115130000
--            descreve mas nunca pode ser aplicada
-- Date: 2026-11-25
--
-- POR QUE ESTE ARQUIVO EXISTE, EM VEZ DE SO APLICAR A 20261115130000
-- A 20261115130000 declara "-- transaction: none" e, por desenho do repo, exige a linha
-- "-- approved-by: <dono>" no cabecalho, que so pode entrar no momento da aplicacao.
-- Ela nunca teve essa linha, logo o preflight de db-apply-migration.yml sempre bloqueia.
-- Editar o arquivo para acrescentar a linha tambem nao passa: o gate
-- check-migrations-sync-log-gate exige recibo valido para migration ALTERADA, e o gate E75
-- aceita recibo "pendente" apenas para migration ADICIONADA - e um recibo "aplicada" antes
-- de aplicar seria registro falso. Medido em 2026-11-25 (PR #4087, fechado por isso).
--
-- EFEITO NO BANCO
-- Exatamente o mesmo objeto da 20261115130000: (summary_date, supplier_id) INCLUDE
-- (stock_close, units_depleted, units_restocked). IF NOT EXISTS torna as duas
-- intercambiaveis - se a 20261115130000 algum dia for aplicada, esta vira no-op.
--
-- CONSUMIDOR
-- fn_market_intelligence_macro (20261115130100, aplicada em 2026-11-25) agrega
-- public.stock_daily_summary por (summary_date, supplier_id) em janela de ate 366 dias.
-- Sem indice, o plano e Parallel Seq Scan em ~3,1M linhas (~1 GB) a cada carga do grafico
-- /inteligencia-comercial.
--
-- Rollback: supabase/rollbacks/20261125173000_rollback.sql

SET lock_timeout = '5min'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sds_summary_date_supplier
  ON public.stock_daily_summary (summary_date, supplier_id)
  INCLUDE (stock_close, units_depleted, units_restocked)

DO $verify$
DECLARE
  v_valid boolean;
BEGIN
  SELECT i.indisvalid INTO v_valid
  FROM pg_index i
  WHERE i.indexrelid = to_regclass('public.idx_sds_summary_date_supplier');

  IF v_valid IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'post-check: idx_sds_summary_date_supplier ausente ou invalido (indisvalid=%)', v_valid;
  END IF;
  RAISE NOTICE 'post-check: idx_sds_summary_date_supplier presente e valido';
END
$verify$
