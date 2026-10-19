# E08 · Lote 2 — candidatos a `migration repair --status applied` (proposta para aprovação do PO)

> Gerado em 2026-09-16. Depende de E07 100% concluído (ver `docs/CLASSIFICACAO_MIGRATIONS_SEM_LEDGER_2026-09-16.json`).
> Nenhuma migration foi executada ou reparada por este documento — é levantamento para aprovação (REGRA #8, `[REQUER-PO]`).

## Resumo

- **179** versões confirmadas `aplicada`/`aplicada-sem-ledger` no `pg_catalog` ao vivo, ausentes do ledger (`supabase_migrations.schema_migrations`), **sem colisão de `version`** entre si nem com as 90 já reparadas no lote 1.
- Verificado por SQL direto: as 179 versões têm `already_in_ledger = 0` — nenhum risco de repair duplicado.
- **30** arquivos adicionais (**10 grupos de `version` duplicado**) ficam de fora desta proposta — mesmo problema estrutural do E10 (prefixos de data sem componente de hora colidem entre arquivos distintos). Ver seção final.

## Candidatos por tipo de objeto

| Tipo | Qtd | Estado E07 |
|---|---|---|
| `function` | 58 | aplicada-sem-ledger |
| `revoke` | 22 | aplicada |
| `view` | 19 | aplicada-sem-ledger |
| `grant` | 18 | aplicada |
| `add_column` | 14 | aplicada |
| `drop` | 12 | aplicada |
| `policy` | 12 | aplicada-sem-ledger |
| `comment` | 7 | aplicada |
| `index` | 7 | aplicada-sem-ledger |
| `materialized_view` | 4 | aplicada-sem-ledger |
| `trigger` | 4 | aplicada-sem-ledger |
| `enum_value` | 1 | aplicada |
| `alter_function_search_path` | 1 | aplicada-sem-ledger |

## Lista completa (versão · arquivo · tipo)

| Versão | Arquivo | Tipo |
|---|---|---|
| `20260512000000` | `20260512000000_bootstrap_missing_application_schemas.sql` | materialized_view |
| `20260525232003` | `20260525232003_fix_339_personalization_missing_columns.sql` | add_column |
| `20260526103000` | `20260526103000_quote_update_transactional_rpc.sql` | function |
| `20260526200904` | `20260526200904_89323492-0a32-4caf-abcc-b3bc16bcad59.sql` | add_column |
| `20260526201213` | `20260526201213_6f3a12ba-7311-4329-8b7a-816cf3be15c5.sql` | add_column |
| `20260526201551` | `20260526201551_8040d7c1-9323-41b7-a6c8-313e6514f223.sql` | add_column |
| `20260526210100` | `20260526210100_ensure_app_role_enum_values.sql` | enum_value |
| `20260526220000` | `20260526220000_bugfix_audit_db_full.sql` | view |
| `20260527120000` | `20260527120000_update_quote_transactional_hardening.sql` | function |
| `20260527164916` | `20260527164916_08b3f92a-dc8e-4c6b-91f7-8e7e4cfca8ef.sql` | grant |
| `20260527193640` | `20260527193640_e19dbe0d-694e-495e-a071-412c76e1e295.sql` | drop |
| `20260527195603` | `20260527195603_34cb71b1-85c2-4778-bb08-7f834ce57eef.sql` | grant |
| `20260528102502` | `20260528102502_verify_no_anon_products_access.sql` | revoke |
| `20260529150000` | `20260529150000_perf_drop_duplicate_indexes.sql` | drop |
| `20260529192405` | `20260529192405_cf6a5a40-e160-40f1-b1de-06bd46f11999.sql` | grant |
| `20260530001500` | `20260530001500_rest_native_views_and_rls.sql` | view |
| `20260530030000` | `20260530030000_fix_views_revoke_writes.sql` | revoke |
| `20260531211237` | `20260531211237_c37151f5-00cf-4054-8afc-4fd1d1e6ca4c.sql` | grant |
| `20260601161255` | `20260601161255_2d6b33ef-fb12-473e-bc9e-60281da0526d.sql` | grant |
| `20260602` | `20260602_003_log_retention_policy.sql` | function |
| `20260602040000` | `20260602040000_fix_product_triggers_cascade_guard.sql` | trigger |
| `20260602120000` | `20260602120000_fix_v_products_public_active_set_image.sql` | view |
| `20260604000006` | `20260604000006_notification_queue_dispatch_state.sql` | function |
| `20260604000007` | `20260604000007_kit_dml_grants.sql` | grant |
| `20260604000008` | `20260604000008_notification_queue_lease.sql` | function |
| `20260604000009` | `20260604000009_webhook_delivery_claim.sql` | function |
| `20260604170220` | `20260604170220_8ee3068e-2c61-4bd9-a784-6ec018694173.sql` | add_column |
| `20260604233001` | `20260604233001_spr_drop_redundant_index.sql` | drop |
| `20260604233002` | `20260604233002_spr_drop_bkp_table.sql` | drop |
| `20260604233003` | `20260604233003_spr_harden_grants_rls.sql` | revoke |
| `20260604233005` | `20260604233005_spr_cutover_status_part1.sql` | view |
| `20260604233006` | `20260604233006_spr_cutover_status_part2.sql` | view |
| `20260605110500` | `20260605110500_sync_active_with_is_active_in_fn_promote_padronizacao.sql` | function |
| `20260605160000` | `20260605160000_silver_unify_01_fn_standardize_supplier.sql` | function |
| `20260605160200` | `20260605160200_silver_unify_03_redirect_direct_to_gold.sql` | function |
| `20260605160300` | `20260605160300_silver_unify_04_deprecate_legacy_silver.sql` | comment |
| `20260605160400` | `20260605160400_silver_unify_05_promote_marks_raw_processed.sql` | function |
| `20260605161000` | `20260605161000_fix_security_rls_and_search_paths.sql` | policy |
| `20260605162000` | `20260605162000_fix_auth_rls_initplan.sql` | policy |
| `20260605170050` | `20260605170050_grant_table_privileges_rls_hardened_tables.sql` | grant |
| `20260605170100` | `20260605170100_fix_fn_promote_padronizacao_clear_process_errors.sql` | function |
| `20260605210000` | `20260605210000_silver_unify_07_adapt_staging_chain_to_silver.sql` | function |
| `20260606110000` | `20260606110000_fase8_01_dimensions_into_promotion_retire_bronze_trigger.sql` | comment |
| `20260606110100` | `20260606110100_fase8_02_document_xbz_stock_fastpath.sql` | comment |
| `20260610120300` | `20260610120300_silver_depara_04_derive_parent_config_driven.sql` | function |
| `20260610120400` | `20260610120400_silver_depara_05_standardize_variant_depara.sql` | function |
| `20260610130100` | `20260610130100_create_visual_search_feedback.sql` | policy |
| `20260611115719` | `20260611115719_b01e905c-9c47-488d-a93b-1907890e4436.sql` | grant |
| `20260611120100` | `20260611120100_v2_02_fn_enrich_padronizacao.sql` | function |
| `20260611120200` | `20260611120200_v2_03_fn_standardize_raw_v3.sql` | function |
| `20260611120300` | `20260611120300_v2_04_promote_display_name_category_chain.sql` | function |
| `20260611120400` | `20260611120400_v2_05_monitoring_coverage.sql` | view |
| `20260611121000` | `20260611121000_fn_promote_supplier_sweep_orphan_variants.sql` | function |
| `20260611123000` | `20260611123000_pipeline_hardening_validation_clamps.sql` | function |
| `20260611124000` | `20260611124000_fn_dryrun_standardize_supplier_real_rollback.sql` | function |
| `20260611184000` | `20260611184000_add_circumference_cm_to_products.sql` | add_column |
| `20260613180000` | `20260613180000_reconcile_ai_enrichment_queue_drift.sql` | view |
| `20260613190000` | `20260613190000_medallion_front_v3_public_views_goldhygiene2.sql` | view |
| `20260614213000` | `20260614213000_drop_fn_convert_cart_to_quote.sql` | drop |
| `20260614220000` | `20260614220000_stock_notification_rpcs.sql` | function |
| `20260615120000` | `20260615120000_stock_notifications_date_filter.sql` | function |
| `20260615142100` | `20260615142100_fix_pipeline_health_remove_legacy_count.sql` | function |
| `20260615200001` | `20260615200001_doc_admin_settings_comment_on_table_and_columns.sql` | comment |
| `20260615200002` | `20260615200002_sec_admin_settings_revoke_delete_authenticated.sql` | revoke |
| `20260615230504` | `20260615230504_product_images_observability_and_resync.sql` | view |
| `20260615230505` | `20260615230505_product_images_resync_deterministic.sql` | function |
| `20260615230506` | `20260615230506_product_images_schema_documentation.sql` | comment |
| `20260615232605` | `20260615232605_product_images_quality_gap_view_lockdown.sql` | grant |
| `20260615235001` | `20260615235001_product_images_fix_sync_image_type_comment.sql` | comment |
| `20260615235502` | `20260615235502_product_images_portability_defensive_guards.sql` | add_column |
| `20260616171503` | `20260616171503_product_images_r2_origin_lineage.sql` | add_column |
| `20260616171505` | `20260616171505_product_images_ux_perf_media.sql` | add_column |
| `20260616172001` | `20260616172001_product_images_cf_reconciliation.sql` | view |
| `20260616174001` | `20260616174001_product_images_cf_recon_inflight_revoke_anon.sql` | revoke |
| `20260616181001` | `20260616181001_cf_recon_foundation.sql` | view |
| `20260617000002` | `20260617000002_hash_product_images_cron.sql` | view |
| `20260617230500` | `20260617230500_estoque_sanitize_restock_dates_trigger.sql` | trigger |
| `20260617235500` | `20260617235500_estoque_obs_views_revoke_anon_api.sql` | revoke |
| `20260618000002` | `20260618000002_enable_rls_cf_recon_tables.sql` | grant |
| `20260618000007` | `20260618000007_enhance_drift_dashboard_v2.sql` | view |
| `20260618000008` | `20260618000008_autolink_trigger_and_reconcile_fn.sql` | trigger |
| `20260618000009` | `20260618000009_health_check_function.sql` | function |
| `20260618130223` | `20260618130223_6adfce43-888a-4d28-87a4-4951f747c3f1.sql` | grant |
| `20260618140000` | `20260618140000_fix_validate_discount_valid_until_null.sql` | function |
| `20260618160100` | `20260618160100_fix_secdef_functions_search_path.sql` | function |
| `20260618160200` | `20260618160200_revoke_anon_backup_sensitive.sql` | revoke |
| `20260618200000` | `20260618200000_drift_catalog_analytics_baseline.sql` | materialized_view |
| `20260619000000` | `20260619000000_fix_favorites_module.sql` | function |
| `20260619000003` | `20260619000003_close_gaps_and_harden_triggers.sql` | trigger |
| `20260619000005` | `20260619000005_fix_gaps_j5_and_c6.sql` | function |
| `20260619000007` | `20260619000007_fix_gap_c5_embed_relink.sql` | function |
| `20260619000008` | `20260619000008_fix_gap_c5_correct_relink.sql` | function |
| `20260619000009` | `20260619000009_fix_gap_c5b_new_group.sql` | function |
| `20260619000010` | `20260619000010_fix_c07_flatten_chains.sql` | function |
| `20260619000011` | `20260619000011_fix_c02_c03_orphan_remediation.sql` | function |
| `20260619110000` | `20260619110000_fix_rpc_bugs_contact_id_clearable_fields_item_columns.sql` | function |
| `20260619140100` | `20260619140100_cf_recon_action_log_add_product_id.sql` | add_column |
| `20260619140500` | `20260619140500_cf_recon_fix_v_divergence_circular.sql` | view |
| `20260619140600` | `20260619140600_cf_recon_enrich_health_dashboard.sql` | view |
| `20260619153422` | `20260619153422_773d4538-2a35-47d5-b5a1-49067d2898b6.sql` | drop |
| `20260620000000` | `20260620000000_fix_recent_restocks_and_metrics.sql` | function |
| `20260620120000` | `20260620120000_fix_create_update_quote_transactional_contact_id_clearable.sql` | function |
| `20260620140000` | `20260620140000_fix_rpc_add_client_cnpj.sql` | function |
| `20260620150000` | `20260620150000_fix_catalog_critical_bugs.sql` | function |
| `20260620150500` | `20260620150500_faxina_tier1b_revoke_archived_grants.sql` | revoke |
| `20260620170000` | `20260620170000_fix_update_quote_contact_fields_clearable.sql` | function |
| `20260621150000` | `20260621150000_security_perf_fixes.sql` | index |
| `20260621203000` | `20260621203000_harden_create_quote_transactional_resolve_org_seller.sql` | function |
| `20260621221500` | `20260621221500_fix_quotes_validate_discount_xuser_role_check_APLICADO.sql` | function |
| `20260621230000` | `20260621230000_faxina_restore_security_notifications_APLICADO.sql` | grant |
| `20260621233000` | `20260621233000_harden_grants_login_attempts_APLICADO.sql` | grant |
| `20260622111500` | `20260622111500_supplier_reliability_pipeline_v1.sql` | materialized_view |
| `20260622120000` | `20260622120000_add_color_swatches_to_v_products_public.sql` | view |
| `20260622130000` | `20260622130000_fix_color_swatches_column_and_view_plus_favorites_grant.sql` | view |
| `20260622185000` | `20260622185000_fix_workspace_notifications_insert_policy.sql` | drop |
| `20260622195000` | `20260622195000_revoke_anon_write_grants_workspace_notifications.sql` | revoke |
| `20260622220000` | `20260622220000_fix_qbp_audit_novo_orcamento.sql` | policy |
| `20260623000000` | `20260623000000_fix_audit_novo_orcamento_batch2.sql` | function |
| `20260623000002` | `20260623000002_products_name_m2_fix_medallion_coverage.sql` | view |
| `20260623121000` | `20260623121000_fix_archive_access_security_definer_batch.sql` | function |
| `20260623122000` | `20260623122000_fix_security_definer_missing_search_path.sql` | function |
| `20260623162001` | `20260623162001_revoke_frontend_telemetry_anon_grants.sql` | grant |
| `20260623171900` | `20260623171900_fix_anon_grants_security_hardening.sql` | revoke |
| `20260623183100` | `20260623183100_revoke_anon_sensitive_views.sql` | revoke |
| `20260623190000` | `20260623190000_fix_secdef_lovable_revert_guard.sql` | function |
| `20260626120000` | `20260626120000_add_ordem_exibicao_tabela_preco_gravacao_oficial.sql` | add_column |
| `20260626130000` | `20260626130000_backfill_ordem_exibicao_curated_order_tpgo.sql` | comment |
| `20260627200000` | `20260627200000_drop_quote_comments_orphan_table.sql` | drop |
| `20260707101522` | `20260707101522_c95030b7-451d-4103-b0cb-34d9f48c64fc.sql` | grant |
| `20260708123135` | `20260708123135_723b07ad-7c94-4e76-91ce-599dace6f0ce.sql` | function |
| `20260709101218` | `20260709101218_7cd44961-194b-4e75-88dc-7ad2062faf11.sql` | add_column |
| `20260713101342` | `20260713101342_f9c0414f-6bbb-47d2-b199-c3659dc21e10.sql` | function |
| `20260714` | `20260714_fix_rename_unique_cart_item_variant_constraint.sql` | drop |
| `20260714130000` | `20260714130000_fix_auth_hydration_v4_drop_redundant_index.sql` | drop |
| `20260714140000` | `20260714140000_add_shipping_deadline_to_seller_carts.sql` | add_column |
| `20260714140001` | `20260714140001_create_restore_seller_cart_rpc.sql` | function |
| `20260716000001` | `20260716000001_p0_magazine_partition_rls_hardening.sql` | function |
| `20260716000002` | `20260716000002_perf_auth_rls_initplan_fix.sql` | policy |
| `20260716000003` | `20260716000003_perf_sec_dedup_indexes_policy_hardening.sql` | policy |
| `20260716000004` | `20260716000004_sec_revoke_archive_backup_schemas.sql` | revoke |
| `20260716000008` | `20260716000008_drop_archive_backup_schemas.sql` | drop |
| `20260716000009` | `20260716000009_sec_function_search_path.sql` | alter_function_search_path |
| `20260716000010` | `20260716000010_sec_rls_policy_always_true.sql` | drop |
| `20260716000011` | `20260716000011_sec_rls_enabled_no_policy.sql` | policy |
| `20260716000013` | `20260716000013_perf_multiple_permissive_policies.sql` | policy |
| `20260716000015` | `20260716000015_db_public_backup_tables_primary_keys.sql` | add_column |
| `20260716000016` | `20260716000016_db_unindexed_fk_indexes.sql` | index |
| `20260716000017` | `20260716000017_db_security_definer_acl_fix.sql` | function |
| `20260716000020` | `20260716000020_restore_seller_cart_fn.sql` | function |
| `20260716000022` | `20260716000022_fix_gate5_rpc_exists_helper.sql` | function |
| `20260716000024` | `20260716000024_revoke_anon_internal_mvs.sql` | grant |
| `20260716000026` | `20260716000026_revoke_supplier_stricker_schema.sql` | revoke |
| `20260716000027` | `20260716000027_revoke_anon_internal_tables_views.sql` | revoke |
| `20260716000028` | `20260716000028_revoke_anon_select_user_and_internal_tables.sql` | grant |
| `20260716000034` | `20260716000034_add_missing_fk_indexes.sql` | index |
| `20260716000035` | `20260716000035_fix_multiple_permissive_policies.sql` | policy |
| `20260716000037` | `20260716000037_restore_fk_indexes_after_036.sql` | index |
| `20260716000038` | `20260716000038_fix_remaining_initplan_and_fk_index.sql` | policy |
| `20260716000039` | `20260716000039_fix_security_anon_mcp_kv_and_bucket_listing.sql` | revoke |
| `20260716000040` | `20260716000040_fix_matview_api_and_anon_security_definer.sql` | revoke |
| `20260716000041` | `20260716000041_fix_fn_super_filtro_cost_price_exposure_and_category_breadcrumb.sql` | function |
| `20260716000042` | `20260716000042_fix_fn_global_search_quote_data_exposure.sql` | function |
| `20260716000045` | `20260716000045_revoke_anon_catalog_authenticated_only_functions.sql` | revoke |
| `20260716000047` | `20260716000047_revoke_anon_fn_global_search.sql` | revoke |
| `20260716000052` | `20260716000052_dynamic_index_unindexed_foreign_keys.sql` | index |
| `20260717000063` | `20260717000063_fix_public_grant_revoke_and_analytics_schema.sql` | view |
| `20260717000066` | `20260717000066_create_fk_indexes.sql` | index |
| `20260717000067` | `20260717000067_fix_remaining_fk_index_and_drop_truly_unused.sql` | index |
| `20260717000069` | `20260717000069_revoke_anon_remaining_41_tables.sql` | revoke |
| `20260717000070` | `20260717000070_move_mv_product_leaf_category_to_internal.sql` | materialized_view |
| `20260717000071` | `20260717000071_final_security_sweep_and_audit_close.sql` | revoke |
| `20260717000072` | `20260717000072_fix_cron_and_fn_after_mv_move_to_internal.sql` | function |
| `20260717235500` | `20260717235500_fix_stock_rupture_kpi_matview_grants.sql` | grant |
| `20260718140000` | `20260718140000_close_anon_write_default_privilege.sql` | revoke |
| `20260902220800` | `20260902220800_rls_enable_spr_history_partitions_and_fix_creator.sql` | function |
| `20260902221900` | `20260902221900_align_smoke_tests_with_hardening_expectations.sql` | function |
| `20260903093500` | `20260903093500_spr_partition_policies_parity_and_smoke_relkind.sql` | policy |
| `20260905033100` | `20260905033100_audit_r3_anon_insert_rate_guard.sql` | policy |
| `20260905033200` | `20260905033200_audit_r3_revoke_anon_mv_product_compositions.sql` | revoke |

## Comando de repair proposto (após aprovação do PO)

```
supabase migration repair --status applied \
  20260512000000 20260525232003 20260526103000 20260526200904 20260526201213 20260526201551 20260526210100 20260526220000 20260527120000 20260527164916 \
  20260527193640 20260527195603 20260528102502 20260529150000 20260529192405 20260530001500 20260530030000 20260531211237 20260601161255 20260602 \
  20260602040000 20260602120000 20260604000006 20260604000007 20260604000008 20260604000009 20260604170220 20260604233001 20260604233002 20260604233003 \
  20260604233005 20260604233006 20260605110500 20260605160000 20260605160200 20260605160300 20260605160400 20260605161000 20260605162000 20260605170050 \
  20260605170100 20260605210000 20260606110000 20260606110100 20260610120300 20260610120400 20260610130100 20260611115719 20260611120100 20260611120200 \
  20260611120300 20260611120400 20260611121000 20260611123000 20260611124000 20260611184000 20260613180000 20260613190000 20260614213000 20260614220000 \
  20260615120000 20260615142100 20260615200001 20260615200002 20260615230504 20260615230505 20260615230506 20260615232605 20260615235001 20260615235502 \
  20260616171503 20260616171505 20260616172001 20260616174001 20260616181001 20260617000002 20260617230500 20260617235500 20260618000002 20260618000007 \
  20260618000008 20260618000009 20260618130223 20260618140000 20260618160100 20260618160200 20260618200000 20260619000000 20260619000003 20260619000005 \
  20260619000007 20260619000008 20260619000009 20260619000010 20260619000011 20260619110000 20260619140100 20260619140500 20260619140600 20260619153422 \
  20260620000000 20260620120000 20260620140000 20260620150000 20260620150500 20260620170000 20260621150000 20260621203000 20260621221500 20260621230000 \
  20260621233000 20260622111500 20260622120000 20260622130000 20260622185000 20260622195000 20260622220000 20260623000000 20260623000002 20260623121000 \
  20260623122000 20260623162001 20260623171900 20260623183100 20260623190000 20260626120000 20260626130000 20260627200000 20260707101522 20260708123135 \
  20260709101218 20260713101342 20260714 20260714130000 20260714140000 20260714140001 20260716000001 20260716000002 20260716000003 20260716000004 \
  20260716000008 20260716000009 20260716000010 20260716000011 20260716000013 20260716000015 20260716000016 20260716000017 20260716000020 20260716000022 \
  20260716000024 20260716000026 20260716000027 20260716000028 20260716000034 20260716000035 20260716000037 20260716000038 20260716000039 20260716000040 \
  20260716000041 20260716000042 20260716000045 20260716000047 20260716000052 20260717000063 20260717000066 20260717000067 20260717000069 20260717000070 \
  20260717000071 20260717000072 20260717235500 20260718140000 20260902220800 20260902221900 20260903093500 20260905033100 20260905033200 \
  --linked
```

## Fora de escopo nesta rodada — colisão de `version` (aguarda E10)

**30 arquivos** em **10 grupos** compartilham a mesma `version` com outro(s) arquivo(s) — o CLI/ledger não distingue qual arquivo corresponde a qual aplicação. Precisam de resolução de identidade/ordem (E10) antes de qualquer repair:

| Versão | Arquivos | Tipos |
|---|---|---|
| `20260610120000` | `20260610120000_restore_generated_mockups_geometry_columns.sql`, `20260610120000_silver_depara_01_apply_transform_color_resolver.sql` | add_column, function |
| `20260611120000` | `20260611120000_fix_standardize_variant_fcode_fhex_swallowed_by_comment.sql`, `20260611120000_v2_01_helpers_display_name_tokenize.sql` | function |
| `20260615` | `20260615_001_drop_ai_provider_quotas_zombie.sql`, `20260615_002_fix_ai_quota_and_cache_bugs.sql` | drop, view |
| `20260619000001` | `20260619000001_fix_fn_get_product_intelligence_all_gap2.sql`, `20260619000001_fix_is_shared_on_canonical_null.sql`, `20260619000001_mv_leaf_covering_index_safe_idx.sql` | function, index, trigger |
| `20260619000002` | `20260619000002_fix_canonical_root_soft_delete.sql`, `20260619000002_mockup_composite_index_user_created.sql` | index, trigger |
| `20260620190000` | `20260620190000_heal_faxina_live_tables.sql`, `20260620190000_reposicao_revoke_anon_grants.sql` | grant, policy |
| `20260621` | `20260621_fix_console_bugs_404_403.sql`, `20260621_fix_create_rpc_get_favorite_list_counts.sql`, `20260621_fix_create_rpc_get_promo_sales_90d_by_product.sql`, `20260621_fix_product_variants_add_next_entry_alias_columns.sql`, `20260621_fix_rls_coverage_missing_tables.sql` | function, index, policy |
| `20260622` | `20260622_ai_usage_logs_hardening_observability.sql`, `20260622_categories_active_generated_compat.sql`, `20260622_drop_categories_active_legacy.sql`, `20260622_fix_categories_active_column_alias.sql`, `20260622_fix_fn_system_health_summary_security_invoker.sql`, `20260622_get_favorite_list_counts_user_id_overload.sql`, `20260622_restore_get_favorite_list_counts_noarg.sql` | add_column, comment, function, trigger |
| `20260623` | `20260623_fix_generated_always_columns_batch.sql`, `20260623_fix_search_analytics_add_seller_id.sql`, `20260623_fix_search_analytics_seller_id_not_generated.sql` | index, trigger |
| `20260716000044` | `20260716000044_move_extensions_to_extensions_schema.sql`, `20260716000044_revoke_anon_fn_log_search_analytics.sql` | revoke, schema |
