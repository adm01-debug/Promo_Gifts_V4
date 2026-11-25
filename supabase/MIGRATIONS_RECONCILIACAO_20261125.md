# Reconciliacao do ledger — varredura de 2026-11-25 (DRIFT-004)

> Escopo: as **125 versoes** de `supabase/migrations/` que nao constam no ledger de
> producao segundo `MIGRATIONS_DRIFT_REPORT.md` (auditoria de 2026-10-22, 448 ausentes na epoca).
> Fonte de verdade dos efeitos: dump `supabase/migrations-snapshot/SCHEMA_LIVE.sql` gerado em
> **2026-11-25T20:55:49Z** (`SNAPSHOT_META.json`: `migrations_count 3137`).

## Como ler

| classe | significado | acao |
| --- | --- | --- |
| completa | todos os objetos-alvo existem no dump | reparo de ledger (E15 repair), sem DDL |
| parcial | parte dos objetos-alvo existe no dump | completar o que falta + reparo de ledger |
| ausente | nenhum objeto-alvo existe no dump | decidir: aplicar ou declarar obsoleto |
| sem alvo | o SQL nao declara objeto extraivel (DO block, DML, COMMENT) | conferir a mao no dump |

| classe | total |
| --- | --- |
| completa | 21 |
| parcial | 17 |
| ausente | 30 |
| semAlvo | 57 |

## Ressalvas medidas nesta varredura

1. O snapshot de ledger `supabase/baseline/20261125180000_ledger_versions.json` lista **3021** versoes, enquanto o
   `SNAPSHOT_META.json` conta **3137** no banco: a exportacao do ledger (E072) esta incompleta, entao
   **nao** se pode afirmar "fora do ledger" a partir dela. A classificacao abaixo usa apenas o dump
   de schema, que e confiavel.
2. O schema `ops` nao esta em `supabase/baseline/schemas.txt` (8 schemas: public, analytics, api,
   cf_recon, classification_audit, internal, prod_audit, supplier_stricker). Tudo que existe so em
   `ops` aparece como "ausente" — as tres migrations `ops` desta lista sao falso-negativo.
3. `20261125180000_ledger_versions.json` e `*_cron_jobs.json` do baseline sao mantidos por workflow
   que falha por IPv6 (`db.<ref>.supabase.co`), ja documentado em `SNAPSHOT_META`/status.

## Ausentes em producao (30)

Nenhum objeto declarado existe no dump. Prioridade de analise, nao de aplicacao.

| versao | arquivo | alvos declarados |
| --- | --- | --- |
| `20260527121746` | `20260527121746_4e6187e6-a340-4b6a-8caa-71fd82f4044c.sql` | 4 |
| `20260527143139` | `20260527143139_482b086d-660c-4025-91c5-619a87933d31.sql` | 1 |
| `20260529141006` | `20260529141006_febe8752-03ab-4749-be30-40f709fe93fa.sql` | 1 |
| `20260604000001` | `20260604000001_fix_security_definer_search_path.sql` | 3 |
| `20260604000002` | `20260604000002_webhook_idempotency.sql` | 6 |
| `20260610120100` | `20260610120100_silver_depara_02_helper_sm_hex.sql` | 1 |
| `20260610120500` | `20260610120500_silver_depara_06_parity_check.sql` | 1 |
| `20260611165827` | `20260611165827_80349d44-21b7-4867-9b98-4af61abab2bd.sql` | 1 |
| `20260619000003` | `20260619000003_add_keyset_pagination_indexes.sql` | 3 |
| `20260619200000` | `20260619200000_add_keyset_pagination_indexes.sql` | 3 |
| `20260620150000` | `20260620150000_faxina_tier1_archive_orphan_tables.sql` | 2 |
| `20260620170001` | `20260620170001_fix_favorites_gaps_11_12.sql` | 2 |
| `20260620190001` | `20260620190001_populate_quotes_sent_at.sql` | 1 |
| `20260620200002` | `20260620200002_fix_super_filtro_pcd_index.sql` | 1 |
| `20260620200003` | `20260620200003_fix_super_filtro_variant_color_index.sql` | 1 |
| `20260621000000` | `20260621000000_fix_favorite_position_race.sql` | 1 |
| `20260621212000` | `20260621212000_fn_qa_orcamento_regression.sql` | 1 |
| `20260629142224` | `20260629142224_7e644177-527b-4b92-93a3-79ffee40ca4a.sql` | 1 |
| `20260706222627` | `20260706222627_edd1be33-0a88-43d8-acad-16805773d48f.sql` | 1 |
| `20260707113531` | `20260707113531_205c38da-b21e-455b-bf0a-fe762e894e57.sql` | 1 |
| `20260710203410` | `20260710203410_a9a3ddf5-a44e-4b3c-baa4-356225bfbe85.sql` | 1 |
| `20260916193000` | `20260916193000_e25_supplier_history_partition_automation.sql` | 3 |
| `20260916211500` | `20260916211500_e30_ops_table_size_history.sql` | 3 |
| `20260917150000` | `20260917150000_e40_ops_pgss_history.sql` | 2 |
| `20260917160000` | `20260917160000_e33_ops_wraparound_monitor.sql` | 2 |
| `20261022195616` | `20261022195616_fix_update_company_fields_security_definer_search_path.sql` | 1 |
| `20261022203935` | `20261022203935_update_company_fields_security_fix.sql` | 1 |
| `20261101205400` | `20261101205400_perf005_drop_unused_indexes.sql` | 1 |
| `20261108223000` | `20261108223000_add_stock_daily_summary_date_index.sql` | 3 |
| `20261114160000` | `20261114160000_perf_idx_sds_restock_counts.sql` | 3 |

## Parciais (17)

| versao | arquivo | presentes | faltando |
| --- | --- | --- | --- |
| `20260525200106` | `20260525200106_corrections_token_revocation_index.sql` | `idx_token_revocations_expires` | `idx_token_revocations_token` |
| `20260526120000` | `20260526120000_fix_schema_divergences_4_tables.sql` | `idx_token_revocations_expires`, `idx_token_revocations_jti`, `idx_token_revocations_user_id`, `public.user_token_revocations.token_jti` | `idx_color_variations_active_group`, `idx_color_variations_color_group`, `idx_integration_creds_provider`, `idx_integration_creds_secret_name` |
| `20260531110300` | `20260531110300_create_user_ip_allowlist_table.sql` | `public.user_ip_allowlist` | `idx_user_ip_allowlist_ip`, `idx_user_ip_allowlist_user_id` |
| `20260601152818` | `20260601152818_92f1b6c8-885c-48aa-a3c7-3e696a0530f5.sql` | `idx_workspace_notifications_category`, `public.user_notification_preferences` | `idx_workspace_notifications_search` |
| `20260602040000` | `20260602040000_fix_product_triggers_cascade_guard.sql` | `public.fn_is_bulk_import_mode` | `public.process_spot_products` |
| `20260604000003` | `20260604000003_add_compound_indexes_performance.sql` | `idx_order_items_order_id`, `idx_stock_snapshots_variant_supplier` | `idx_products_active_category`, `idx_products_active_created_desc`, `idx_products_active_price`, `idx_products_active_supplier`, `idx_products_not_deleted_active`, `idx_quotes_org_status`, `idx_quotes_user_status` |
| `20260604000006` | `20260604000006_notification_queue_dispatch_state.sql` | `public.process_notifications_queue` | `idx_workspace_notifications_undispatched`, `public.workspace_notifications.dispatched_at` |
| `20260604000008` | `20260604000008_notification_queue_lease.sql` | `public.confirm_notifications_dispatched`, `public.process_notifications_queue` | `public.workspace_notifications.dispatch_claim_expires_at` |
| `20260610181110` | `20260610181110_54298897-c111-42b7-97c6-15e992e56c4b.sql` | `idx_user_roles_user_id` | `idx_profiles_user_id`, `public.check_auth_config_status` |
| `20260620150001` | `20260620150001_fix_catalog_critical_bugs.sql` | `idx_product_faqs_category_id`, `idx_product_faqs_product_id`, `idx_product_images_organization_id`, `idx_product_kit_components_padronizacao_id`, `idx_product_target_audiences_category_id`, `public.fn_autolink_canonical_on_content_hash`, `public.get_edge_function_secret` | `idx_product_group_members_group_id`, `idx_supplier_products_raw_import_batch_id` |
| `20260620160002` | `20260620160002_fix_favorites_bugs_all.sql` | `idx_fit_expires_at`, `public.get_favorite_list_counts`, `public.move_favorites_to_trash`, `public.purge_favorite_trash_old`, `public.restore_favorite_from_trash` | `idx_fit_user_original` |
| `20260621000002` | `20260621000002_fix_favorites_security_position.sql` | `public.get_favorite_list_counts` | `public.fn_favorite_lists_assign_position` |
| `20260621150000` | `20260621150000_security_perf_fixes.sql` | `idx_b2b_collections_created_by`, `idx_b2b_collections_organization_id`, `idx_kit_comments_kit_id`, `idx_kit_comments_parent_id`, `idx_quotes_assigned_to`, `idx_quotes_parent_quote_id` | `idx_markup_cfg_created_by`, `idx_markup_cfg_organization_id`, `idx_markup_cfg_product_id`, `idx_markup_cfg_supplier_id`, `idx_mct_credit_account_id`, `idx_mct_job_id`, `idx_mct_mockup_id`, `idx_media_sync_queue_organization_id`, `idx_media_sync_queue_supplier_id`, `idx_mockup_gen_jobs_product_id`, `idx_mockup_gen_jobs_technique_id`, `idx_pdr_approved_by`, `idx_pdr_rejected_by`, `idx_pdr_requested_by`, `idx_pdr_supplier_id` |
| `20260622111500` | `20260622111500_supplier_reliability_pipeline_v1.sql` | `idx_sre_arrival_snapshot`, `idx_sre_fulfilled_at`, `idx_sre_pending`, `idx_sre_source_pending`, `idx_sre_supplier_date`, `idx_sre_variant_date`, `public.fn_capture_supplier_promise`, `public.fn_expire_pending_promises`, `public.fn_resolve_supplier_arrivals`, `public.fn_sre_set_updated_at`, `public.get_supplier_reliability_history`, `public.mv_supplier_reliability`, `public.supplier_replenishment_events` | `uq_mv_supplier_reliability_supplier` |
| `20260706223316` | `20260706223316_3cc4c8a9-76b3-4c02-922a-bbcde6031622.sql` | `idx_crm_callback_events_type`, `public.crm_callback_events` | `idx_crm_callback_events_error`, `idx_crm_callback_events_quote_id`, `public.set_crm_callback_events_updated_at`, `ux_crm_callback_events_idempotency` |
| `20260916210000` | `20260916210000_backfill_catalog_stats_price_range_top_colors_materials_20260916155725.sql` | `public.zapp_catalog_stats` | `preserva` |
| `20261115130000` | `20261115130000_idx_sds_summary_date_supplier_include.sql` | `idx_sds_summary_date_supplier` | `CONCURRENTLY`, `não` |

## Completas — reparo de ledger (21)

Objetos conferidos no dump. Falta apenas o registro no ledger.

| versao | arquivo | objetos conferidos |
| --- | --- | --- |
| `20260511235959` | `20260511235959_add_categories_full_path_readable_drift.sql` | `public.categories.full_path_readable` |
| `20260511235960` | `20260511235960_add_categories_full_path_readable_drift.sql` | `public.categories.full_path_readable` |
| `20260529164602` | `20260529164602_d3a5916b-dbbd-4061-ac81-0fae3d436db7.sql` | `public.fn_should_apply_kill_switch`, `public.system_kill_switches`, `public.update_updated_at_column` |
| `20260604000009` | `20260604000009_webhook_delivery_claim.sql` | `idx_webhook_delivery_locks_claimed_at`, `public.claim_webhook_delivery`, `public.release_webhook_delivery_lock`, `public.webhook_delivery_locks` |
| `20260613180000` | `20260613180000_reconcile_ai_enrichment_queue_drift.sql` | `idx_ai_queue_pending`, `idx_ai_queue_product_id`, `idx_ai_queue_status`, `public.ai_enrichment_queue`, `public.vw_ai_enrichment_status` |
| `20260621210001` | `20260621210001_onboarding_auto_assign_org_canonica.sql` | `public.fn_auto_assign_org_on_profile` |
| `20260917080000` | `20260917080000_e35_fix_reposicao_backfill_perf.sql` | `public.fn_aggregate_stock_daily` |
| `20260920120000` | `20260920120000_fix_handle_new_user_missing_profiles_user_id.sql` | `public.handle_new_user` |
| `20260928212000` | `20260928212000_fix_products_padronizacao_backlink.sql` | `public.fn_promote_padronizacao` |
| `20261008230000` | `20261008230000_restringir_anon_mockup_approval_links.sql` | `public.fn_verify_anon_catalog_grants` |
| `20261027230000` | `20261027230000_cleanup_get_edge_function_secret_allowlist.sql` | `public.get_edge_function_secret` |
| `20261027233000` | `20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql` | `public.get_edge_function_secret` |
| `20261101190101` | `20261101190101_fn_global_search_clamp_limit.sql` | `public.fn_global_search` |
| `20261108030100` | `20261108030100_ft079_view_products_min_quantity.sql` | `public.vw_products_min_quantity` |
| `20261108030200` | `20261108030200_ft088_fn_check_item_fits.sql` | `public.fn_check_item_fits` |
| `20261108120000` | `20261108120000_p10_categories_indexes_espelho.sql` | `idx_cat_parent_nav`, `idx_categories_level`, `idx_categories_level_display_order` |
| `20261111222500` | `20261111222500_fix_touch_seller_cart_secdef.sql` | `public.touch_seller_cart_on_item_change` |
| `20261115013000` | `20261115013000_fix_get_quote_token_public_respeita_expiracao.sql` | `public.get_quote_token_public` |
| `20261120040000` | `20261120040000_add_quotes_freight_plan.sql` | `public.quotes.freight_plan` |
| `20261121163000` | `20261121163000_v_compras_catalogo.sql` | `public.v_compras_catalogo` |
| `20261121183000` | `20261121183000_v_compras_precos_faixa.sql` | `public.v_compras_precos_faixa` |

## Sem alvo extraivel (57)

Nao declaram objeto (DO `$verify$`, DML, `COMMENT`). Cada uma exige leitura manual: o dump
guarda `COMMENT` e policies, mas nao guarda o resultado de um DO block.

| versao | arquivo |
| --- | --- |
| `20260526133316` | `20260526133316_d73e8e4c-a15c-494a-96e7-2b4463de5660.sql` |
| `20260526134911` | `20260526134911_d7e74dc0-6154-4b53-811e-0431959d53e1.sql` |
| `20260526135538` | `20260526135538_98821269-251f-4798-9ca0-a05da7100e29.sql` |
| `20260526140224` | `20260526140224_4c26238d-957e-4392-84e1-832efa52375e.sql` |
| `20260526140530` | `20260526140530_b83514b8-227e-4db7-9a57-3cd289aaf58a.sql` |
| `20260526140856` | `20260526140856_740ac9ec-3238-4350-90d5-a1967cd027b4.sql` |
| `20260526220004` | `20260526220004_fix_004_current_org_id_forgeable.sql` |
| `20260527193640` | `20260527193640_e19dbe0d-694e-495e-a071-412c76e1e295.sql` |
| `20260527193804` | `20260527193804_47a1cec9-2c6a-4a6b-9e66-1dab63e4f2f0.sql` |
| `20260527193835` | `20260527193835_c9cce192-7e99-4b28-9c5f-b2d1c6ab7836.sql` |
| `20260527195603` | `20260527195603_34cb71b1-85c2-4778-bb08-7f834ce57eef.sql` |
| `20260529192405` | `20260529192405_cf6a5a40-e160-40f1-b1de-06bd46f11999.sql` |
| `20260531130000` | `20260531130000_rest_native_read_rls_kit_tags.sql` |
| `20260531140000` | `20260531140000_rest_native_read_rls_stock_similar.sql` |
| `20260531211237` | `20260531211237_c37151f5-00cf-4054-8afc-4fd1d1e6ca4c.sql` |
| `20260601161255` | `20260601161255_2d6b33ef-fb12-473e-bc9e-60281da0526d.sql` |
| `20260602130000` | `20260602130000_fix_ai_description_queue_rls_policy.sql` |
| `20260604000005` | `20260604000005_admin_rls_kit_write_policies.sql` |
| `20260612113723` | `20260612113723_2e0aa953-c30f-4659-85f5-7c484bac804a.sql` |
| `20260616172002` | `20260616172002_product_images_cf_reconciliation_cron.sql` |
| `20260618000000` | `20260618000000_cart_items_quantity_positive_check.sql` |
| `20260619151002` | `20260619151002_f20a3c8a-0f5e-4693-9869-5e80440f56b2.sql` |
| `20260619153422` | `20260619153422_773d4538-2a35-47d5-b5a1-49067d2898b6.sql` |
| `20260619160500` | `20260619160500_062cd222-4cdd-4fe5-a2f4-2a24d0bdc023.sql` |
| `20260620110923` | `20260620110923_security_advisors_remediation_rls_initplan.sql` |
| `20260622111500` | `20260622111500_repair_only_marker.sql` |
| `20260622185000` | `20260622185000_fix_workspace_notifications_insert_policy.sql` |
| `20260624102939` | `20260624102939_0c9b9295-f36f-435e-83bb-7580204b0321.sql` |
| `20260707102816` | `20260707102816_326aa855-c8c5-4697-970a-9288e6f4d360.sql` |
| `20260707112607` | `20260707112607_0d3fb272-970c-4199-8138-837da900bc2a.sql` |
| `20260708123339` | `20260708123339_2b83e1a9-4b54-473f-bbc0-1e6b0170bf0c.sql` |
| `20260715164347` | `20260715164347_b0eabb91-413b-40e9-83c6-9c1c5cce2ded.sql` |
| `20260916181609` | `20260916181609_backfill_fix_google_provider_secret_name_20260623.sql` |
| `20260916200000` | `20260916200000_e17_revoke_public_fn_super_filtro.sql` |
| `20260916201000` | `20260916201000_e19_comment_rls_deny_intentional.sql` |
| `20260917060000` | `20260917060000_e18_revoke_authenticated_mcp_kv_get.sql` |
| `20260917070000` | `20260917070000_e38_unschedule_dead_cron_jobs.sql` |
| `20260917090000` | `20260917090000_e47_fix_schema_drift_cron_split.sql` |
| `20260917100000` | `20260917100000_e37_split_genuine_multistatement_cron.sql` |
| `20260917110000` | `20260917110000_e45_fix_products_comment.sql` |
| `20260928213000` | `20260928213000_backfill_products_main_category_id.sql` |
| `20261013180500` | `20261013180500_incidente_2026_10_13_drop_tabelas_backup_vencidas.sql` |
| `20261022100010` | `20261022100010_perf_rls_auth_uid_wrapper.sql` |
| `20261022100011` | `20261022100011_perf_drop_unused_indexes.sql` |
| `20261027195959` | `20261027195959_supplier_stricker_rls_deny_all.sql` |
| `20261027220000` | `20261027220000_deactivate_xbz_image_uploader_cron.sql` |
| `20261027234500` | `20261027234500_reactivate_xbz_image_uploader_cron.sql` |
| `20261101194200` | `20261101194200_perf002_drop_unused_indexes_stock_snapshots.sql` |
| `20261101202000` | `20261101202000_drop_revoke_agent_created_functions.sql` |
| `20261101210000` | `20261101210000_sb0007_drop_noop_restrictive_policies.sql` |
| `20261102063000` | `20261102063000_repair_kill_switch_hits_anon_rate_guard.sql` |
| `20261108030000` | `20261108030000_ft005_cron_scheduled_reports.sql` |
| `20261108230000` | `20261108230000_remove_broken_cron_image_dimensions_backfill.sql` |
| `20261108230100` | `20261108230100_cron002_fix_residual_collisions.sql` |
| `20261117172500` | `20261117172500_elevenlabs_credential.sql` |
| `20261125074200` | `20261125074200_revoke_anon_apply_classification_suggestions.sql` |
| `20261125180000` | `20261125180000_fix_comment_v_tabela_gravacao_publica.sql` |

---

## Adendo 2026-11-25T23:50Z — um dos "ausentes" era falso-positivo

A tabela de *ausentes* acima foi montada contra
`supabase/baseline/20261125173000_ledger_versions.json`. Esse arquivo tem 3021
versões; o ledger de produção tem 3137. **A lacuna produz falsos-positivos.**

Caso comprovado nesta sessão: `20260916193000_e25_supplier_history_partition_automation.sql`
foi classificada como ausente, o outro agente abriu o #4121 para "remover os cron
jobs órfãos" dessa etapa, e a produção respondeu:

- preflight E15 (`run 45720922945`, job 1):
  `version 20260916193000 já está em supabase_migrations.schema_migrations — reaplicação bloqueada` com `isInLedger: true`;
- apply da `20261125213000` (`run 45716964171`, job 2):
  `ERROR: Pre-condicao falhou: fn_ensure_history_partitions existe, os jobs nao sao orfaos`.

Ou seja: função existe, automação de partições ativa, nenhum job órfão. O #4121 e
o seu complemento #4132 foram revertidos (#4134) para não deixar em `main` uma
migration cuja pré-condição nunca passa.

**Regra para quem continuar este backlog:** nenhuma linha desta tabela autoriza
DDL. Antes de agir, prove o estado com o preflight do E15
(`--version=<v> --require-live`, que lê o ledger real) ou com um `repair-only`
(`mode=repair-only`), nunca com o JSON do baseline nem com o `SCHEMA_LIVE.sql`
antigo.
