# A.2 Drift — Repo × Produção
_Gerado em 2026-10-27 — Seção A.2 do inventário de auditoria_

---

## Confirmação de projeto

- `client.ts` linha 24: `const CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln";` ✓
- `config.toml` linha 1: `project_id = "doufsxqlfjyuvxuezpln"` ✓
- `pqpdolkaeqlyzpdpbizo` não está em código executável ✓ <!-- [LEGACY_INFORMATIVO] -->

---

## Migrations no Repo

| Item | Valor |
|---|---|
| Total de arquivos `.sql` | **3.009** |
| Primeira migration | `20241231000000_saved_filters.sql` |
| Última migration | `20261027234500_reactivate_xbz_image_uploader_cron.sql` |
| Span temporal | 2024-12-31 → 2026-10-27 |

As últimas 5 migrations:
1. `20261027200000_supplier_stricker_rls_deny_all.sql`
2. `20261027220000_deactivate_xbz_image_uploader_cron.sql`
3. `20261027230000_cleanup_get_edge_function_secret_allowlist.sql`
4. `20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql`
5. `20261027234500_reactivate_xbz_image_uploader_cron.sql`

---

## Edge Functions

| Item | Valor |
|---|---|
| No repo (`supabase/functions/`) | **112 funções** |
| Publicadas em produção | (ver baseline_antes.json para lista completa) |

Edge functions com `verify_jwt = false` no `config.toml`:
`crm-db-bridge`, `ai-recommendations`, `external-db-inspect`, `image-proxy`, `webhook-dispatcher`, `webhook-inbound`, `mcp-server`, `connections-auto-test`, `e2e-cleanup`, `get-visitor-info`, `cleanup-notifications`, `cleanup-novelties`, `collections-watcher`, `comparison-price-watcher`, `connections-health-check`, `favorites-watcher`, `ownership-audit`, `process-queue`, `process-scheduled-reports`, `quote-followup-reminders`, `send-digest`, `send-notification`, `send-scheduled-reports`, `sync-external-db`, `log-login-attempt`, `check-login`, `asia-ingestion`, `backfill-image-dimensions`, `receive-crm-callback`

---

## Chamadas no Código Fonte

### .from() — Tabelas referenciadas (~149 únicas)

Tabelas DB: `admin_audit_log`, `admin_settings`, `ai_function_routing`, `ai_insights_cache`, `ai_models`, `ai_providers`, `ai_usage_events`, `ai_usage_logs`, `ai_usage_quotas`, `art_file_attachments`, `bot_detection_log`, `cart_templates`, `catalog_analytics`, `category_icons`, `collection_items`, `collection_items_trash`, `collections`, `companies`, `component_media`, `connection_test_history`, `crm_callback_events`, `custom_kits`, `discount_approval_audit`, `discount_approval_requests`, `expert_conversations`, `expert_messages`, `external_connections`, `external_connections_sync_log`, `favorite_items`, `favorite_items_trash`, `favorite_lists`, `file_scan_logs`, `frontend_telemetry`, `generated_mockups`, `hardening_health_snapshots`, `inbound_webhook_endpoints`, `inbound_webhook_events`, `integration_credentials`, `ip_access_control`, `kill_switch_hits`, `kit_collaborators`, `kit_comments`, `kit_quote_requests`, `kit_templates`, `kit_variants`, `login_attempts`, `magazine_items`, `magazine_reader_state`, `magazines`, `magic_up_brand_kits`, `magic_up_campaigns`, `magic_up_generations`, `mcp_api_keys`, `mcp_key_auto_revocations`, `mockup_drafts`, `mockup_prompt_configs`, `mockup_prompt_history`, `mv_stock_rupture_alert`, `mv_stock_velocity`, `mv_supplier_reliability`, `notifications`, `optimization_queue`, `order_items`, `orders`, `outbound_webhooks`, `ownership_audit_reports`, `password_reset_requests`, `permissions`, `personalization_techniques`, `price_history`, `product_component_locations`, `product_components`, `product_group_members`, `product_groups`, `product_price_freshness_overrides`, `product_variants`, `product_views`, `products`, `profiles`, `public_token_failures`, `query_telemetry`, `quote_history`, `quote_item_personalizations`, `quote_items`, `quote_templates`, `quotes`, `request_rate_limits`, `rls_denial_log`, `role_migration_batches`, `role_migration_items`, `role_permissions`, `roles`, `saved_filters`, `saved_trends_views`, `scheduled_reports`, `search_analytics`, `secret_rotation_log`, `seller_cart_items`, `seller_carts`, `seller_discount_limits`, `simulator_wizard_drafts`, `stock_notes`, `system_kill_switches`, `system_settings`, `tabela_preco_gravacao_oficial`, `tpgo`, `tpgo_faixa`, `user_comparisons`, `user_known_devices`, `user_notification_preferences`, `user_onboarding`, `user_preferences`, `user_roles`, `video_variant_links`, `visual_search_feedback`, `voice_command_logs`, `webhook_deliveries`, `workspace_notifications`

Views referenciadas: `v_products_public`

Storage buckets (`.from()`): `art-files`, `mockup-art-files`, `mockup-assets`, `personalization-images`, `product-videos`, `supplier-logos`, `avatars`

**Suspeitos** (provavelmente não são tabelas reais): `.from("...")`, `.from('some_table')`, `.from('t')`, `.from('tpgo')`, `.from('tpgo_faixa')`, `.from("quotes"` (duplicado com .from('quotes'))

### .rpc() — Funções RPC chamadas (67 únicas)

`admin_active_sessions`, `can_grant_mcp_full`, `check_ai_quota`, `check_hardening_status`, `check_telemetry_regression`, `create_kit_quote_transactional`, `ensure_default_favorite_list`, `execute_role_migration_batch`, `fn_batch_update_cart_item_sort_order`, `fn_get_color_swatches_batch`, `fn_get_reposicao_variants_summary`, `fn_get_similar_products`, `fn_global_search`, `fn_my_rpc`, `fn_run_and_persist_smoke_tests`, `fn_rupture_quick_stats`, `fn_super_filtro_product_ids`, `get_app_health_summary`, `get_auto_test_job_status`, `get_bundle_suggestions`, `get_catalog_bestseller_page`, `get_client_seasonality`, `get_client_top_products`, `get_collections_weekly_count`, `get_connection_failure_window_minutes`, `get_connections_auto_test_interval`, `get_favorite_list_counts`, `get_favorites_weekly_count`, `get_industry_benchmark_stats`, `get_industry_top_products`, `get_platform_failure_metrics`, `get_promo_sales_90d_by_product`, `get_promo_sales_ranking`, `get_supplier_reliability_history`, `get_top_collected_products`, `get_top_compared_products`, `get_top_favorited_products`, `get_user_recent_comparisons`, `increment_kit_template_usage`, `log_access_denied`, `log_rls_denial`, `log_user_logout`, `lookup_request_id`, `magazine_add_items_v2`, `magazine_archive_v2`, `magazine_create_v2`, `magazine_duplicate_v2`, `magazine_publish_v2`, `magazine_reactivate_v2`, `magazine_remove_items_v2`, `magazine_reorder_items_v2`, `magazine_restore_v2`, `magazine_soft_delete_v2`, `magazine_unpublish_v2`, `magazine_update_item_v2`, `magazine_update_metadata_v2`, `record_dev_route_telemetry`, `repair_ownership_orphans`, `request_discount_approval_transactional`, `restore_favorite_from_trash`, `restore_seller_cart`, `save_custom_kit_atomic`, `search_records_rerank`, `set_connection_failure_window_minutes`, `set_connections_auto_test_interval`, `set_custom_kit_pinned`

**Suspeito**: `.rpc('fn_my_rpc')` — nome de placeholder, provavelmente código de teste nunca removido

### functions.invoke() — Edge functions chamadas no código (12 únicas)

`mcp-keys-issue`, `mcp-keys-update`, `crm-callback-reprocess`, `crm-db-bridge`, `external-db-bridge`, `manage-users`, `secrets-manager`, `visual-search`

**Suspeitos** (provavelmente placeholders/testes): `invoke('e')`, `invoke('e1')`, `invoke('e2')`, `invoke('qualquer-edge')`

### channel() — Realtime

`workspace_notifications_realtime` (1 canal)

---

## Variáveis Deno.env nas Edge Functions (50 únicas)

`AI_ROUTER_DISABLE`, `ALLOW_HTTP_FETCH`, `ANON_KEY`, `ASIA_BASE_URL`, `BITRIX24_WEBHOOK_URL`, `CF_ORIGIN_SECRET`, `CRM_CALLBACK_API_KEY`, `CRM_SUPABASE_ANON_KEY`, `CRM_SUPABASE_SERVICE_KEY`, `CRM_SUPABASE_URL`, `CSRF_SECRET`, `E2E_CLEANUP_RATE_LIMIT_MAX`, `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS`, `ENVIRONMENT`, `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_URL`, `EXTERNAL_SUPABASE_SERVICE_KEY`, `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY`, `EXTERNAL_SUPABASE_URL`, `IMAGE_PROXY_ALLOW_LOCALHOST`, `IMAGE_PROXY_MAX_BYTES`, `LOG_CREDENTIAL_RESOLUTION`, `LOG_CRM_BRIDGE_VERBOSE`, `LOVABLE_API_KEY`, `MAGAZINE_IP_SALT`, `N8N_QUOTE_WEBHOOK_URL`, `PROMO_CHAMPIONS_WEBHOOK_SECRET`, `PRODUCT_WEBHOOK_ALLOWED_ORIGINS`, `PRODUCT_WEBHOOK_BATCH_SIZE`, `SIMULATION_BYPASS_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TEST_ADMIN_JWT`, `TEST_SELLER_A_JWT`, `TEST_SELLER_B_JWT`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TURNSTILE_SECRET_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `WEBHOOK_DISPATCHER_SECRET`

**ATENÇÃO — credenciais em Deno.env para banco externo**: `CRM_SUPABASE_SERVICE_KEY`, `CRM_SUPABASE_ANON_KEY`, `CRM_SUPABASE_URL`, `EXTERNAL_SUPABASE_SERVICE_KEY`, `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY`, `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY` — precisam existir como segredos de edge function; se faltarem, a function falha silenciosamente.

**Credenciais de teste em Deno.env**: `TEST_ADMIN_JWT`, `TEST_SELLER_A_JWT`, `TEST_SELLER_B_JWT`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` — devem existir apenas em ambiente de teste, não em produção.

---

## config.toml vs Produção

| Campo | config.toml | Status |
|---|---|---|
| `project_id` | `doufsxqlfjyuvxuezpln` | ✓ |
| `db.major_version` | `17` | verificar produção (PG17) |
| `verify_jwt = false` em | 29 funções | verificar se produção corresponde |

---

## types.ts

| Item | Valor |
|---|---|
| Entradas únicas em types.ts | **1.608** (inclui tabelas, views, functions, enums) |
| CURRENT_PROJECT_ID em client.ts | `doufsxqlfjyuvxuezpln` ✓ |

