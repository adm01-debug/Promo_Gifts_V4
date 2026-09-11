-- Reconcile: un-archive 7 LIVE tables wrongly moved to schema `archive` by the
-- FAXINA DB Tier-3 stats-gated cleanup (2026-06-20). Companion to
-- 20260621120000_reconcile_unarchive_live_rpcs.sql, which restored the 7 RPCs
-- from the same faxina but OMITTED the tables those same features read/write.
--
-- ROOT CAUSE
--   The faxina classified objects as "dead" via pg_stat_statements. These tables
--   belong to features merged shortly before and had ~zero exec stats, so they
--   were misclassified and archived despite being referenced in src/** via
--   supabase.from()/untypedFrom(). PostgREST resolves .from('x') against `public`,
--   so while these sat in `archive` every call failed at runtime with PGRST205,
--   breaking:
--     product_components / product_component_locations /
--     product_component_location_techniques  -> Personalização (admin + busca global)
--     product_sync_logs                       -> CatalogQualityDashboard
--     role_migration_batches / role_migration_items -> Admin: migração de roles
--       (the execute_role_migration_batch RPC was already restored on 2026-06-21,
--        but its backing tables were not — this fixes that partial reconciliation)
--     visual_search_feedback                  -> VisualSearchPage
--
-- SAFETY
--   * ALTER TABLE ... SET SCHEMA carries indexes, triggers, constraints, RLS
--     policies and ACL. All 7 keep RLS enabled with policies (4/4/4/2/4/4/2);
--     no re-grant needed.
--   * FK chain techniques->locations->components, plus
--     visual_search_feedback->auth.users and techniques->public.personalization_techniques
--     are preserved (verified via dry-run BEGIN...ROLLBACK + dependency scan:
--     no name collision in public, no dependent view, no owned sequence — UUID PKs).
--   * Idempotent + reset-safe: only moves a table currently in `archive` and
--     absent from `public`. On a fresh `supabase db reset` the tables already
--     exist in `public` via their original migrations and nothing is in
--     `archive`, so every iteration is a no-op.
--   * Reversible: ALTER TABLE public.<t> SET SCHEMA archive.
--
-- fix_version: reconcile-unarchive-tables-v1 (2026-06-27)

do $$
declare
  targets text[] := array[
    'product_components',
    'product_component_locations',
    'product_component_location_techniques',
    'product_sync_logs',
    'role_migration_batches',
    'role_migration_items',
    'visual_search_feedback'
  ];
  t text;
  moved int := 0;
begin
  foreach t in array targets loop
    if exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'archive' and c.relname = t and c.relkind = 'r'
    ) and not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t
    ) then
      execute format('alter table archive.%I set schema public', t);
      moved := moved + 1;
      raise notice 'moved archive.% -> public', t;
    else
      raise notice 'skip % (already in public or not in archive)', t;
    end if;
  end loop;
  raise notice 'reconcile complete: % table(s) moved', moved;
end $$;

-- Reload PostgREST schema cache so .from('<table>')/untypedFrom('<table>') resolve immediately.
notify pgrst, 'reload schema';;
