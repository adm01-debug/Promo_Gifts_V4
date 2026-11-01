-- Rollback: See supabase/rollbacks/20261013180500_rollback.sql
-- Agente 3 (Integridade de Dados/Storage) — incidente 2026-10-13
--
-- *** PENDENTE DE APLICAÇÃO ***
-- Escrita, evidenciada (contagens + DDL em
-- docs/incidente-2026-10-13/AGENTE3_INTEGRIDADE_STORAGE.md) e verificada sem
-- dependentes (nenhuma view, FK ou objeto vivo referencia estas tabelas —
-- consultado via pg_depend/pg_constraint), mas NÃO aplicada em produção: a
-- tentativa via MCP apply_migration/execute_sql nesta sessão retornou
-- {"status":"cancelled"} — mesmo gate de confirmação destrutiva da migration
-- anterior. Precisa de aplicação manual com confirmação interativa, ou via
-- .github/workflows/db-apply-migration.yml (REGRA #8/E15).
--
-- Tabelas de backup/arquivo criadas entre 2026-06-19 e 2026-06-26 pela
-- "faxina" documentada em docs/FAXINA_DB_2026-06-20*.md — hoje (2026-10-13)
-- têm quase 4 meses, bem além de qualquer janela razoável de retenção de
-- tabela de backup temporária. Nenhum código em src/, supabase/functions/ ou
-- scripts/ as referencia fora de docs/snapshots/types.ts (auto-gerado).
--
-- Evidência de contagem de linhas (capturada antes do DROP, 2026-10-13):
--   backup_produto_ramo_atividade_20260625   63.626 linhas
--   _archive_product_seo_20260626             6.610 linhas
--   _archive_supplier_price_tiers_20260626   31.157 linhas
--   _archive_product_ai_20260626              6.610 linhas
--   _bkp_kcvs_pre_normalize_20260624          4.058 linhas
--   _bkp_kit_dims_20260619                      962 linhas
--   _bkp_kit_color_from_name_20260624           446 linhas
--   _bkp_kit_pkg_material_20260624              292 linhas
--   _bkp_kit_packing_type_20260624              146 linhas
--   _bkp_orphan_active_variants_20260619         53 linhas
--   eco_backfill_log_20260625                    22 linhas
--   material_reconcile_log_20260626               1 linha
--   eco_date_reconcile_log_20260626               2 linhas
--   cnpj_backfill_audit                           8 linhas
-- (DDL completo de cada tabela, coluna a coluna, também em
-- docs/incidente-2026-10-13/AGENTE3_INTEGRIDADE_STORAGE.md)
--
-- IMPORTANTE: após aplicar este DROP, regenerar src/integrations/supabase/
-- types.ts (mcp generate_typescript_types ou `supabase gen types`) e rodar
-- `npm run check:types-inventory-drift` — as entradas correspondentes já
-- foram adicionadas em docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json nesta
-- mesma revisão (REGRA #4), então o gate deve passar sem necessidade de nova
-- edição.
DROP TABLE IF EXISTS public.backup_produto_ramo_atividade_20260625;
DROP TABLE IF EXISTS public._archive_product_seo_20260626;
DROP TABLE IF EXISTS public._archive_supplier_price_tiers_20260626;
DROP TABLE IF EXISTS public._archive_product_ai_20260626;
DROP TABLE IF EXISTS public._bkp_kcvs_pre_normalize_20260624;
DROP TABLE IF EXISTS public._bkp_kit_dims_20260619;
DROP TABLE IF EXISTS public._bkp_kit_color_from_name_20260624;
DROP TABLE IF EXISTS public._bkp_kit_pkg_material_20260624;
DROP TABLE IF EXISTS public._bkp_kit_packing_type_20260624;
DROP TABLE IF EXISTS public._bkp_orphan_active_variants_20260619;
DROP TABLE IF EXISTS public.eco_backfill_log_20260625;
DROP TABLE IF EXISTS public.material_reconcile_log_20260626;
DROP TABLE IF EXISTS public.eco_date_reconcile_log_20260626;
DROP TABLE IF EXISTS public.cnpj_backfill_audit;
