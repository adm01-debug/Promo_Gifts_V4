# E059 — Triagem das Migrations Local-Only

Data: 2026-10-18  
Snapshot (2026-10-15): migrations_count=3034, ledger_versions=2524 → estimativa local_only=510  
Total atual em supabase/migrations/: 2973

## Metodologia

Triagem estática por padrão de nome de arquivo.  
Classificação definitiva do grupo G1 exige: `SELECT version FROM supabase_migrations.schema_migrations`.

| Grupo | Critério | Count |
|---|---|---|
| G1 | Antigas sem marcador — provavelmente aplicadas antes do ledger | 2721 |
| G2 | Recentes (Sep/Oct 2026) ou com prefixo E-plano — provavelmente necessárias | 102 |
| G3 | Obsoletas: \_APLICADO, test/debug/temp, faxina/archive/backup, drop\_old/dead | 150 |

## G3 — Obsoletas para arquivar (150 arquivos)

- `20250103160000_test_queries.sql`
- `20260322130947_drop_old_trigger_products_count.sql`
- `20260322143406_drop_duplicate_unique_constraint_pca.sql`
- `20260323104757_drop_dead_columns_wave1_product_variants.sql`
- `20260326183706_drop_dead_functions_link_and_find.sql`
- `20260408163551_zapp_test_setup_isolated_schema.sql`
- `20260408163609_zapp_test_create_call_transfers_table.sql`
- `20260408163655_zapp_test_create_rpcs.sql`
- `20260425152341_backup_e_matriz_mochila_pre_faxina.sql`
- `20260425153052_faxina_fase5_matriz_v2_e_debito_tecnico.sql`
- `20260425164834_backup_snapshot_gravacao_20260425.sql`
- `20260429163414_schedule_connections_auto_test_cron.sql`
- `20260512000008_t32_backup_schema_primary_keys.sql`
- `20260512201600_t16_move_backup_tables_to_schema_backup.sql`
- `20260512220756_t30b_test_profiles_policy.sql`
- `20260512220821_t30c_test_index_creation.sql`
- `20260512221227_t30d_test_current_setting_policy.sql`
- `20260512222316_t32_backup_schema_primary_keys.sql`
- `20260513060035_restrict_legacy_audit_log_policies.sql`
- `20260514230000_onda16_drop_legacy_email_like_admin_policies.sql`
- `20260519225100_backfill_legacy_fob_with_cost.sql`
- `20260522161900_fase_1_1_drop_legacy_lovable.sql`
- `20260524120000_preview_marker_preserve_legacy_20260524120000.sql`
- `20260524120100_preview_marker_preserve_legacy_20260524120100.sql`
- `20260524120200_preview_marker_preserve_legacy_20260524120200.sql`
- `20260524120300_preview_marker_preserve_legacy_20260524120300.sql`
- `20260524120400_preview_marker_preserve_legacy_20260524120400.sql`
- `20260524130000_preview_marker_preserve_legacy_20260524130000.sql`
- `20260524210200_drop_unused_indexes_logs_safe_batch.sql`
- `20260524212352_drop_unused_indexes_logs_safe_batch.sql`
- `20260524212418_colapso_fase3_drop_unused_indexes.sql`
- `20260524212633_colapso_fase3_drop_unused_indexes_round2.sql`
- `20260524212707_colapso_fase3_drop_unused_indexes_round3.sql`
- `20260524213114_colapso_fase3_drop_unused_indexes_round4.sql`
- `20260524213135_colapso_fase3_drop_unused_indexes_round5_warm.sql`
- `20260525063000_restore_smoke_test_observability_contract.sql`
- `20260526021742_restore_smoke_test_observability_contract.sql`
- `20260529150000_perf_drop_duplicate_indexes.sql`
- `20260529181035_perf_drop_duplicate_indexes.sql`
- `20260530160000_connections_auto_test_use_dynamic_base_url.sql`
- `20260601140100_fix_cron_connections_auto_test_hardcode_url.sql`
- `20260604120255_spr_p2p3_backup_normalize_docs.sql`
- `20260604174444_motor_v2_drop_old_2arg_overload.sql`
- `20260604231629_spr_drop_bkp_table.sql`
- `20260604233002_spr_drop_bkp_table.sql`
- `20260604235853_spr_drop_unused_partial_indexes.sql`
- `20260605110327_drop_dead_code_variant_functions.sql`
- `20260605142000_drop_dead_code_variant_functions.sql`
- `20260605160300_silver_unify_04_deprecate_legacy_silver.sql`
- `20260605164346_silver_unify_04_deprecate_legacy_silver.sql`
- `20260605170000_fix_rls_silver_and_bkp_tables.sql`
- `20260605171935_fix_rls_silver_and_bkp_tables.sql`
- `20260607131910_fix_sm_url_map_from_site_urls_temp_table.sql`
- `20260610103932_create_asia_legacy_image_upload_pipeline_v2.sql`
- `20260610104018_create_asia_legacy_dispatch_harvest_functions.sql`
- `20260611131022_seo_drop_old_fn_update_seo_scores.sql`
- `20260612144820_fix_p1b_drop_duplicate_constraint_ai_insights_cache.sql`
- `20260615142040_remove_history_legacy_metric_from_pipeline_health.sql`
- `20260615142100_fix_pipeline_health_remove_legacy_count.sql`
- `20260615144437_archive_unif_pending_log_comment_and_move.sql`
- `20260615151106_archive_fn_simular_combo_gravacao_legacy_wrappers.sql`
- `20260615172748_fix_ai_insights_cache_drop_dead_tokens_columns.sql`
- `20260615190630_move_staging_tables_to_archive_schema.sql`
- `20260615191757_drop_dead_staging_forwarding_views_public.sql`
- `20260615204853_archive_schema_setup_and_function_fixes.sql`
- `20260615205043_move_tables_to_archive_schema.sql`
- `20260616004305_product_images_drop_unused_indexes_e8.sql`
- `20260617131816_link_synthetic_legacy_dupes_20260617.sql`
- `20260618103958_drop_old_update_quote_transactional_3args.sql`
- `20260618160200_revoke_anon_backup_sensitive.sql`
- `20260618173829_revoke_anon_backup_tables_sensitive_data.sql`
- `20260619114747_drop_dead_columns_product_images_import_batch_source_fetched.sql`
- `20260619123214_drop_views_dependent_on_etapa1_archive_tables.sql`
- `20260619123243_archive_etapa1_five_image_tables_to_archive_schema.sql`
- `20260619123335_archive_etapa2_image_validation_log_and_requirements.sql`
- `20260619123423_archive_etapa3_sm_images_staging_drop_views_functions.sql`
- `20260619210000_fix_cron_connections_auto_test_canonical_url.sql`
- `20260620150000_faxina_tier1_archive_orphan_tables.sql`
- `20260620150500_faxina_tier1b_revoke_archived_grants.sql`
- `20260620160001_faxina_tier3_archive_dead_views.sql`
- `20260620160500_faxina_tier3_archive_dead_functions.sql`
- `20260620170000_faxina_tier3c_archive_safe_utility_functions.sql`
- `20260620170500_faxina_harden_function_search_path.sql`
- `20260620190000_faxina_tier1c_archive_orphan_tables.sql`
- `20260620190002_faxina_tier3b_b1_archive_dead_fns_views.sql`
- `20260620190003_heal_faxina_live_tables.sql`
- `20260620190500_faxina_tier3b_archive_dead_functions_bulk.sql`
- `20260620191000_faxina_tier1d_archive_orphan_tables.sql`
- `20260620191500_faxina_tier3b_b2_archive_legacy_supplier_fns.sql`
- `20260620200001_fix_super_filtro_drop_old_5param_overload.sql`
- `20260621100000_faxina_restore_ai_function_routing_and_view.sql`
- `20260621100100_faxina_restore_active_tables_from_archive.sql`
- `20260621100300_faxina_rearchive_empty_legacy_tables.sql`
- `20260621130000_archive_empty_unused_tables.sql`
- `20260621210000_faxina_complete_archive_restore_11_tables_APLICADO.sql`
- `20260621220000_faxina_restore_kit_builder_family_APLICADO.sql`
- `20260621221500_fix_quotes_validate_discount_xuser_role_check_APLICADO.sql`
- `20260621230000_faxina_restore_security_notifications_APLICADO.sql`
- `20260621233000_harden_grants_login_attempts_APLICADO.sql`
- `20260621235500_faxina_restore_18_frontend_referenced_tables_APLICADO.sql`
- `20260621235900_widen_search_analytics_results_count_check_APLICADO.sql`
- `20260622101227_revoke_public_grants_backup_tables_and_fix_health_view.sql`
- `20260622160908_drop_dead_cols_step1_fix_sync_flags_fn.sql`
- `20260622160917_drop_dead_cols_step2_drop_orphaned_fns_trigger.sql`
- `20260622161015_drop_dead_cols_step3_drop_views_cascade.sql`
- `20260622161027_drop_dead_cols_step4_drop_22_columns.sql`
- `20260622161114_drop_dead_cols_step5a_recreate_v_products_public.sql`
- `20260622161205_drop_dead_cols_step5b_recreate_fn_bestseller_and_views.sql`
- `20260623101839_drop_unused_indexes_products_never_scanned.sql`
- `20260623111856_products_indexes_8_drop_dead_indexes_registered_20260623.sql`
- `20260623114736_fix_archive_access_security_definer_batch_20260623.sql`
- `20260623115523_archive_category_icons_remove_sync_trigger.sql`
- `20260623121000_fix_archive_access_security_definer_batch.sql`
- `20260623131125_test_connection_20260623.sql`
- `20260623131241_ping_test_2_20260623.sql`
- `20260623202703_drop_dead_calculate_personalization_price.sql`
- `20260624141116_kit_packing_type_backup_precomputed.sql`
- `20260624204942_decompose_fn_support_legacy_colorcode.sql`
- `20260626130134_deprecate_legacy_staging_functions.sql`
- `20260626140336_20260626_drop_dead_satellites_seo_ai_and_broken_refresh.sql`
- `20260626143854_formalize_drop_dead_satellites_seo_ai_audit_trail.sql`
- `20260626201424_drop_deprecated_silver_to_gold_functions_20260626.sql`
- `20260626203405_m15_enable_rls_archive_supplier_price_tiers_20260626.sql`
- `20260626203929_drop_duplicate_indexes_20260626.sql`
- `20260627130450_reconcile_unarchive_7_live_tables_faxina20260620.sql`
- `20260627191600_schema_drift_allowlist_v_products_test_20260627.sql`
- `20260716000004_sec_revoke_archive_backup_schemas.sql`
- `20260716000008_drop_archive_backup_schemas.sql`
- `20260716000014_perf_drop_unused_indexes.sql`
- `20260716000015_db_public_backup_tables_primary_keys.sql`
- `20260716000025_revoke_anon_backup_tables_analytics_schema.sql`
- `20260716000033_fix_auth_rls_initplan_smoke_test_runs.sql`
- `20260716000036_drop_unused_indexes.sql`
- `20260716000053_dynamic_drop_duplicate_indexes.sql`
- `20260716130445_sec_revoke_archive_backup_schemas.sql`
- `20260716132718_drop_archive_backup_schemas.sql`
- `20260716141038_20260716000014_perf_drop_unused_indexes.sql`
- `20260716154200_db_public_backup_tables_primary_keys.sql`
- `20260716174337_revoke_anon_backup_tables_analytics_schema.sql`
- `20260716194902_fix_auth_rls_initplan_smoke_test_runs.sql`
- `20260716200244_drop_unused_indexes.sql`
- `20260717000065_drop_unused_indexes.sql`
- `20260717120634_dynamic_drop_duplicate_indexes.sql`
- `20260717132619_drop_unused_indexes.sql`
- `20260903095500_smoke_persist_secdef_chain_and_auth_test_relcheck.sql`
- `20260903095502_smoke_persist_secdef_chain_and_auth_test_relcheck.sql`
- `20260904140000_audit_r4_fixup_search_path_pg_temp_and_default3.sql`
- `20261013171541_agente2_test_ping.sql`
- `20261013180500_incidente_2026_10_13_drop_tabelas_backup_vencidas.sql`
- `20261015130000_remove_test_agente2_probe.sql`

## G2 — Necessárias / E-plano (102 arquivos, sample)

- `20260902220800_rls_enable_spr_history_partitions_and_fix_creator.sql`
- `20260902220900_fix_smoke_persist_signature_drift.sql`
- `20260902221000_fix_vacuum_cron_single_statement.sql`
- `20260902221020_rls_enable_spr_history_partitions_and_fix_creator.sql`
- `20260902221030_fix_smoke_persist_signature_drift.sql`
- `20260902221455_align_smoke_tests_with_hardening_expectations.sql`
- `20260902221900_align_smoke_tests_with_hardening_expectations.sql`
- `20260903091723_harden_smoke_persist_guard_and_revive_auth_test.sql`
- `20260903092000_harden_smoke_persist_guard_and_revive_auth_test.sql`
- `20260903093431_spr_partition_policies_parity_and_smoke_relkind.sql`
- `20260903093500_spr_partition_policies_parity_and_smoke_relkind.sql`
- `20260903100000_fix_jwt_dual_read_guard_in_smoke_persist.sql`
- `20260903110000_p2_fixes_acl_secdef_schema_migrations_registration.sql`
- `20260903130000_fix_regex_relkind_in_purge_and_smoke.sql`
- `20260903181803_fix_regex_relkind_in_purge_and_smoke.sql`
- `20260904100000_audit_r4_magazine_partitions_and_audit_log_acl.sql`
- `20260904101500_audit_r4_sec007_sec008_login_security_functions.sql`
- `20260904102000_audit_r4_sec009_sec010_quote_token_pii_and_password_reset_path.sql`
- `20260904103000_audit_r4_sec011_fn_purge_spr_history_search_path.sql`
- `20260904105000_audit_r4_sec007_fix_sqlerrm_no_leak.sql`
- `20260904110000_audit_r4_sec008_fn_check_login_allowed_canonical.sql`
- `20260904111000_audit_r4_sec009_revoke_quote_token_legacy.sql`
- `20260904120000_audit_r4_sec008_city_bypass_fix.sql`
- `20260904130000_audit_r4_sec008_ip_bypass_fix.sql`
- `20260904150000_audit_r4_sec008_v4_revoke_anon_execute.sql`
- `20260905033000_audit_r3_seller_carts_optimistic_version.sql`
- `20260905033100_audit_r3_anon_insert_rate_guard.sql`
- `20260905033200_audit_r3_revoke_anon_mv_product_compositions.sql`
- `20260905033652_audit_r3_seller_carts_optimistic_version.sql`
- `20260905033718_audit_r3_anon_insert_rate_guard.sql`
- _... e mais 72 arquivos_

## Próximos passos

1. **G3 (fechar nesta onda)**: Mover para `supabase/sql-legacy/archived/` — não precisam de ledger repair
2. **G1 (com live DB)**: Cruzar com `schema_migrations` — G1a (já aplicadas = OK), G1b (nunca aplicadas = reparar via E15)
3. **G2 (validar com PO)**: Cada arquivo em G2 deve ser confirmado antes de repair ou nova aplicação

> Classificação G1 é best-effort sem acesso ao banco. E054 (10 migrations do incidente 2026-10-13) já tratado separadamente.
