# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-14 02:56 UTC

- **indexes** adicionado (1): `public.idx_products_active_created_at_desc`
- **migrations** adicionado (1): `20261113235000_perf_idx_products_active_created_at_desc`

## 2026-11-14 02:34 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_10`

## 2026-11-14 00:50 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_17`

## 2026-11-13 18:37 UTC

- **functions** alterado (1): `public.is_admin_or_above(_user_id uuid)`
- **migrations** adicionado (1): `20261112140000_fix_rls_supplier_products_raw_history_p2027`
- **policies (RLS)** adicionado (20): `public.supplier_products_raw_history_p2027_03.hist_all_service`, `public.supplier_products_raw_history_p2027_03.hist_select_admin`, `public.supplier_products_raw_history_p2027_04.hist_all_service`, `public.supplier_products_raw_history_p2027_04.hist_select_admin`, `public.supplier_products_raw_history_p2027_05.hist_all_service`, `public.supplier_products_raw_history_p2027_05.hist_select_admin`, `public.supplier_products_raw_history_p2027_06.hist_all_service`, `public.supplier_products_raw_history_p2027_06.hist_select_admin`, `public.supplier_products_raw_history_p2027_07.hist_all_service`, `public.supplier_products_raw_history_p2027_07.hist_select_admin`, `public.supplier_products_raw_history_p2027_08.hist_all_service`, `public.supplier_products_raw_history_p2027_08.hist_select_admin`, `public.supplier_products_raw_history_p2027_09.hist_all_service`, `public.supplier_products_raw_history_p2027_09.hist_select_admin`, `public.supplier_products_raw_history_p2027_10.hist_all_service`, `public.supplier_products_raw_history_p2027_10.hist_select_admin`, `public.supplier_products_raw_history_p2027_11.hist_all_service`, `public.supplier_products_raw_history_p2027_11.hist_select_admin`, `public.supplier_products_raw_history_p2027_12.hist_all_service`, `public.supplier_products_raw_history_p2027_12.hist_select_admin`
- **tabelas** alterado (10): `public.supplier_products_raw_history_p2027_03`, `public.supplier_products_raw_history_p2027_04`, `public.supplier_products_raw_history_p2027_05`, `public.supplier_products_raw_history_p2027_06`, `public.supplier_products_raw_history_p2027_07`, `public.supplier_products_raw_history_p2027_08`, `public.supplier_products_raw_history_p2027_09`, `public.supplier_products_raw_history_p2027_10`, `public.supplier_products_raw_history_p2027_11`, `public.supplier_products_raw_history_p2027_12`

## 2026-11-13 12:46 UTC

- **functions** alterado (1): `public.get_sitemap_public(p_limit integer, p_offset integer)`
- **migrations** adicionado (1): `20261111191000_restore_get_sitemap_public_anon_execute`

## 2026-11-13 08:50 UTC

- **functions** removido (1): `public.perf002_drop_unused_snapshot_indexes()`
- **functions** alterado (3): `public.get_edge_function_secret(_name text)`, `public.get_sitemap_public(p_limit integer, p_offset integer)`, `public.has_role(_user_id uuid, _role app_role)`
- **migrations** adicionado (2): `20260511235950_add_categories_level_drift`, `20261108223100_drop_perf002_incident_ddl_survivor`

## 2026-11-13 05:01 UTC

- **functions** alterado (1): `public.get_sitemap_public(p_limit integer, p_offset integer)`
- **lints** adicionado (1): `rpc_anon_executable:public.get_sitemap_public(p_limit integer, p_offset integer)`
- **migrations** adicionado (1): `20261112130000_fix_get_sitemap_public_anon_grant`

## 2026-11-13 04:15 UTC

- **colunas** adicionado (18): `public.e2e_cleanup_audit.created_at`, `public.e2e_cleanup_audit.deleted_by_table`, `public.e2e_cleanup_audit.dry_run`, `public.e2e_cleanup_audit.duration_ms`, `public.e2e_cleanup_audit.email`, `public.e2e_cleanup_audit.errors`, `public.e2e_cleanup_audit.id`, `public.e2e_cleanup_audit.ip`, `public.e2e_cleanup_audit.name_filter_prefix`, `public.e2e_cleanup_audit.reason`, `public.e2e_cleanup_audit.seller_id`, `public.e2e_cleanup_audit.seller_scope`, `public.e2e_cleanup_audit.status`, `public.e2e_cleanup_audit.total_deleted`, `public.e2e_cleanup_audit.total_ms`, `public.e2e_cleanup_audit.totals`, `public.e2e_cleanup_audit.user_agent`, `public.e2e_cleanup_audit.user_id`
- **constraints** adicionado (2): `public.e2e_cleanup_audit.e2e_cleanup_audit_pkey`, `public.e2e_cleanup_audit.e2e_cleanup_audit_status_check`
- **grants** adicionado (2): `public.e2e_cleanup_audit:authenticated`, `public.e2e_cleanup_audit:service_role`
- **indexes** adicionado (6): `public.e2e_cleanup_audit_pkey`, `public.idx_e2e_cleanup_audit_created_at`, `public.idx_e2e_cleanup_audit_email`, `public.idx_e2e_cleanup_audit_seller_id`, `public.idx_e2e_cleanup_audit_status`, `public.idx_e2e_cleanup_audit_user_id`
- **migrations** adicionado (1): `20261108001500_reconcile_e2e_cleanup_audit`
- **policies (RLS)** adicionado (1): `public.e2e_cleanup_audit.admins_select_e2e_cleanup_audit`
- **tabelas** adicionado (1): `public.e2e_cleanup_audit`

## 2026-11-13 00:50 UTC

- **functions** adicionado (1): `public.fn_get_rupture_alerts()`
- **functions** alterado (1): `public.is_supervisor_or_above(_user_id uuid)`
- **migrations** adicionado (1): `20261112011000_fix_sb0003_fn_get_rupture_alerts`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_16`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_09`

## 2026-11-12 23:03 UTC

- **functions** alterado (1): `public.get_sitemap_public(p_limit integer, p_offset integer)`

## 2026-11-12 11:44 UTC

- **functions** alterado (2): `public.admin_revoke_user_sessions(_user_id uuid)`, `public.has_role(_user_id uuid, _role app_role)`

## 2026-11-12 03:44 UTC

- **colunas** adicionado (70): `public.supplier_products_raw_history_p2027_03.captured_at`, `public.supplier_products_raw_history_p2027_03.content_hash`, `public.supplier_products_raw_history_p2027_03.id`, `public.supplier_products_raw_history_p2027_03.raw_data`, `public.supplier_products_raw_history_p2027_03.raw_id`, `public.supplier_products_raw_history_p2027_03.supplier_id`, `public.supplier_products_raw_history_p2027_03.supplier_reference`, `public.supplier_products_raw_history_p2027_04.captured_at`, `public.supplier_products_raw_history_p2027_04.content_hash`, `public.supplier_products_raw_history_p2027_04.id`, `public.supplier_products_raw_history_p2027_04.raw_data`, `public.supplier_products_raw_history_p2027_04.raw_id`, `public.supplier_products_raw_history_p2027_04.supplier_id`, `public.supplier_products_raw_history_p2027_04.supplier_reference`, `public.supplier_products_raw_history_p2027_05.captured_at`, `public.supplier_products_raw_history_p2027_05.content_hash`, `public.supplier_products_raw_history_p2027_05.id`, `public.supplier_products_raw_history_p2027_05.raw_data`, `public.supplier_products_raw_history_p2027_05.raw_id`, `public.supplier_products_raw_history_p2027_05.supplier_id`, `public.supplier_products_raw_history_p2027_05.supplier_reference`, `public.supplier_products_raw_history_p2027_06.captured_at`, `public.supplier_products_raw_history_p2027_06.content_hash`, `public.supplier_products_raw_history_p2027_06.id`, `public.supplier_products_raw_history_p2027_06.raw_data`, `public.supplier_products_raw_history_p2027_06.raw_id`, `public.supplier_products_raw_history_p2027_06.supplier_id`, `public.supplier_products_raw_history_p2027_06.supplier_reference`, `public.supplier_products_raw_history_p2027_07.captured_at`, `public.supplier_products_raw_history_p2027_07.content_hash`, `public.supplier_products_raw_history_p2027_07.id`, `public.supplier_products_raw_history_p2027_07.raw_data`, `public.supplier_products_raw_history_p2027_07.raw_id`, `public.supplier_products_raw_history_p2027_07.supplier_id`, `public.supplier_products_raw_history_p2027_07.supplier_reference`, `public.supplier_products_raw_history_p2027_08.captured_at`, `public.supplier_products_raw_history_p2027_08.content_hash`, `public.supplier_products_raw_history_p2027_08.id`, `public.supplier_products_raw_history_p2027_08.raw_data`, `public.supplier_products_raw_history_p2027_08.raw_id` … (+30)
- **constraints** adicionado (10): `public.supplier_products_raw_history_p2027_03.supplier_products_raw_history_p2027_03_pkey`, `public.supplier_products_raw_history_p2027_04.supplier_products_raw_history_p2027_04_pkey`, `public.supplier_products_raw_history_p2027_05.supplier_products_raw_history_p2027_05_pkey`, `public.supplier_products_raw_history_p2027_06.supplier_products_raw_history_p2027_06_pkey`, `public.supplier_products_raw_history_p2027_07.supplier_products_raw_history_p2027_07_pkey`, `public.supplier_products_raw_history_p2027_08.supplier_products_raw_history_p2027_08_pkey`, `public.supplier_products_raw_history_p2027_09.supplier_products_raw_history_p2027_09_pkey`, `public.supplier_products_raw_history_p2027_10.supplier_products_raw_history_p2027_10_pkey`, `public.supplier_products_raw_history_p2027_11.supplier_products_raw_history_p2027_11_pkey`, `public.supplier_products_raw_history_p2027_12.supplier_products_raw_history_p2027_12_pkey`
- **grants** adicionado (30): `public.supplier_products_raw_history_p2027_03:anon`, `public.supplier_products_raw_history_p2027_03:authenticated`, `public.supplier_products_raw_history_p2027_03:service_role`, `public.supplier_products_raw_history_p2027_04:anon`, `public.supplier_products_raw_history_p2027_04:authenticated`, `public.supplier_products_raw_history_p2027_04:service_role`, `public.supplier_products_raw_history_p2027_05:anon`, `public.supplier_products_raw_history_p2027_05:authenticated`, `public.supplier_products_raw_history_p2027_05:service_role`, `public.supplier_products_raw_history_p2027_06:anon`, `public.supplier_products_raw_history_p2027_06:authenticated`, `public.supplier_products_raw_history_p2027_06:service_role`, `public.supplier_products_raw_history_p2027_07:anon`, `public.supplier_products_raw_history_p2027_07:authenticated`, `public.supplier_products_raw_history_p2027_07:service_role`, `public.supplier_products_raw_history_p2027_08:anon`, `public.supplier_products_raw_history_p2027_08:authenticated`, `public.supplier_products_raw_history_p2027_08:service_role`, `public.supplier_products_raw_history_p2027_09:anon`, `public.supplier_products_raw_history_p2027_09:authenticated`, `public.supplier_products_raw_history_p2027_09:service_role`, `public.supplier_products_raw_history_p2027_10:anon`, `public.supplier_products_raw_history_p2027_10:authenticated`, `public.supplier_products_raw_history_p2027_10:service_role`, `public.supplier_products_raw_history_p2027_11:anon`, `public.supplier_products_raw_history_p2027_11:authenticated`, `public.supplier_products_raw_history_p2027_11:service_role`, `public.supplier_products_raw_history_p2027_12:anon`, `public.supplier_products_raw_history_p2027_12:authenticated`, `public.supplier_products_raw_history_p2027_12:service_role`
- **indexes** adicionado (10): `public.supplier_products_raw_history_p2027_03_pkey`, `public.supplier_products_raw_history_p2027_04_pkey`, `public.supplier_products_raw_history_p2027_05_pkey`, `public.supplier_products_raw_history_p2027_06_pkey`, `public.supplier_products_raw_history_p2027_07_pkey`, `public.supplier_products_raw_history_p2027_08_pkey`, `public.supplier_products_raw_history_p2027_09_pkey`, `public.supplier_products_raw_history_p2027_10_pkey`, `public.supplier_products_raw_history_p2027_11_pkey`, `public.supplier_products_raw_history_p2027_12_pkey`
- **migrations** adicionado (1): `20261104100000_partitions_supplier_products_raw_history_2027`
- **tabelas** adicionado (10): `public.supplier_products_raw_history_p2027_03`, `public.supplier_products_raw_history_p2027_04`, `public.supplier_products_raw_history_p2027_05`, `public.supplier_products_raw_history_p2027_06`, `public.supplier_products_raw_history_p2027_07`, `public.supplier_products_raw_history_p2027_08`, `public.supplier_products_raw_history_p2027_09`, `public.supplier_products_raw_history_p2027_10`, `public.supplier_products_raw_history_p2027_11`, `public.supplier_products_raw_history_p2027_12`

## 2026-11-12 02:07 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_15`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_08`

## 2026-11-11 18:58 UTC

- **functions** alterado (7): `public.audit_rls_coverage()`, `public.check_ai_quota(_user_id uuid)`, `public.ensure_default_favorite_list(_user_id uuid)`, `public.execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean)`, `public.has_role(_user_id uuid, _role app_role)`, `public.increment_kit_template_usage(_template_id uuid)`, `public.record_platform_failure(p_operation text, p_table text, p_rpc_name text, p_duration_ms integer, p_error_message text, p_is_503 boolean, p_is_cold_start boolean, p_retry_count integer)`

## 2026-11-11 01:14 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_14`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_07`

## 2026-11-10 03:16 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_13`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_06`

## 2026-11-09 19:15 UTC

- **functions** alterado (7): `public.audit_rls_coverage()`, `public.check_ai_quota(_user_id uuid)`, `public.ensure_default_favorite_list(_user_id uuid)`, `public.execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean)`, `public.has_role(_user_id uuid, _role app_role)`, `public.increment_kit_template_usage(_template_id uuid)`, `public.record_platform_failure(p_operation text, p_table text, p_rpc_name text, p_duration_ms integer, p_error_message text, p_is_503 boolean, p_is_cold_start boolean, p_retry_count integer)`

## 2026-11-09 05:11 UTC

- **functions** alterado (1): `public.fn_check_item_fits(p_packaging_id uuid, p_product_id uuid, p_current_used_liters numeric)`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_12`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_05`

## 2026-11-08 21:01 UTC

- **functions** alterado (2): `public.fn_standardize_supplier(p_supplier_id uuid, p_limit integer)`, `public.is_admin_or_above(_user_id uuid)`

## 2026-11-08 05:24 UTC

- **grants** alterado (1): `public.suppliers:authenticated`
- **migrations** adicionado (1): `20261107180000_security_fix_suppliers_authenticated_credential_leak_v2`

## 2026-11-08 04:17 UTC

- **functions** alterado (1): `public.has_role(_user_id uuid, _role app_role)`

## 2026-11-08 00:40 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_11`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_04`

## 2026-11-07 02:05 UTC

- **functions** alterado (1): `public.handle_updated_at()`
- **migrations** adicionado (1): `20261106232045_fix_handle_updated_at_search_path`

## 2026-11-07 01:53 UTC

- **lints** adicionado (1): `view_security_definer:public.vw_system_health_quick`
- **migrations** adicionado (1): `20261101201000_fix_health_view_backup_check`
- **views** alterado (1): `public.vw_system_health_quick`

## 2026-11-07 00:48 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_10`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_03`

## 2026-11-06 16:13 UTC

- **colunas** adicionado (9): `public.stock_notes.created_at`, `public.stock_notes.created_by`, `public.stock_notes.deleted_at`, `public.stock_notes.id`, `public.stock_notes.is_pinned`, `public.stock_notes.note`, `public.stock_notes.supplier_id`, `public.stock_notes.updated_at`, `public.stock_notes.variant_id`
- **constraints** adicionado (4): `public.stock_notes.stock_notes_created_by_fkey`, `public.stock_notes.stock_notes_pkey`, `public.stock_notes.stock_notes_supplier_id_fkey`, `public.stock_notes.stock_notes_variant_id_fkey`
- **functions** adicionado (1): `public.handle_updated_at()`
- **grants** adicionado (3): `public.stock_notes:anon`, `public.stock_notes:authenticated`, `public.stock_notes:service_role`
- **indexes** adicionado (3): `public.stock_notes_active_idx`, `public.stock_notes_pkey`, `public.stock_notes_variant_idx`
- **lints** adicionado (5): `fk_without_index:public.stock_notes.stock_notes_created_by_fkey`, `fk_without_index:public.stock_notes.stock_notes_supplier_id_fkey`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_delete_own`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_insert_own`, `policy_auth_fn_not_wrapped:public.stock_notes.stock_notes_update_own`
- **migrations** adicionado (1): `20261031000000_create_stock_notes`
- **policies (RLS)** adicionado (4): `public.stock_notes.stock_notes_delete_own`, `public.stock_notes.stock_notes_insert_own`, `public.stock_notes.stock_notes_select_authenticated`, `public.stock_notes.stock_notes_update_own`
- **tabelas** adicionado (1): `public.stock_notes`
- **triggers** adicionado (1): `public.stock_notes.set_stock_notes_updated_at`

## 2026-11-06 01:55 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_09`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_02`

## 2026-11-05 07:19 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_08`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_01`

## 2026-11-04 12:22 UTC

- Snapshot inicial.

