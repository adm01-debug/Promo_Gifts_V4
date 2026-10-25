-- Migration: 20261025002500_analyze_tables_p03.sql
-- FASE B -- P03: ANALYZE em tabelas com estatísticas obsoletas (ID-INT-002, ID-PERF-001)
-- Aprovado pelo PO em 2026-10-24 (FASE B -- JA LIBERADOS)
-- Rollback: ANALYZE atualiza somente pg_statistic -- sem DDL a reverter.
-- Aguardar autovacuum natural (24-48h) se planos de execucao piorarem.

ANALYZE public.user_organizations;
ANALYZE public.system_settings;
ANALYZE public.integration_credentials;
ANALYZE public.user_roles;
ANALYZE public.categories;
