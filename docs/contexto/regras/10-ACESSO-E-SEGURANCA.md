# 10 · ACESSO E SEGURANÇA — quem pode o quê

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `ab0817a68b` · branch `main` · 2026-11-14 18:21 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Perfis / roles identificados

`admin`, `agent`, `agente`, `anon`, `assistant`, `cancelled`, `completed`, `coordenador`, `denied`, `dev`, `failed`, `granted`, `manager`, `member`, `owner`, `pending`, `perm`, `public`, `r`, `role`, `running`, `skipped`, `string`, `success`, `supervisor`, `system`, `user`, `vendedor`

- Tabelas de perfil/permissão: `organization_members`, `permissions`, `product_group_members`, `role_migration_batches`, `role_migration_items`, `role_permissions`, `user_roles`, `product_similarity_group_members`, `roles`
- Colunas de perfil: `ai_usage_quotas.role` (public.app_role USING role::public.app_role USING role::public.app_role NOT NULL UNIQUE), `conversation_event_history.role` ("text" NOT NULL), `expert_messages.role` (text NOT NULL DEFAULT 'user'), `profiles.role` (text CHECK (role IN ('admin','manager','sales','seller'))), `role_permissions.role` (app_role NOT NULL), `user_roles.role` (text NOT NULL), `client_contacts.role` (TEXT)
- Claims do JWT usados em políticas/funções: `aal`, `role`, `user_metadata`
- Funções usadas dentro de políticas RLS (a regra real está no corpo delas — veja `06`): `can_access_quote`, `can_approve_discount`, `can_view_all_sales`, `current_user_role`, `fn_product_active_for_rls`, `foldername`, `get_user_org_ids`, `has_org_role`, `has_role`, `is_admin`, `is_admin_or_above`, `is_admin_strict`, `is_coord_or_above`, `is_dev`, `is_kit_collaborator`, `is_kit_owner`, `is_manager_or_admin`, `is_org_owner_or_admin`, `is_supervisor_or_above`, `jwt`, `org_has_any_members`, `role`, `uid`, `user_is_org_member`

## Configuração de auth (supabase/config.toml)

| Chave | Valor |
|---|---|
| enable_signup | `false` |
| enable_anonymous_sign_ins | `false` |

## Matriz tabela × operação → quem pode (derivada das políticas RLS)

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `_asia_api_staging` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `_backup_stock_daily_summary_20260618` | enabled | service_role: true | service_role: true | service_role: true | service_role: true |
| `_deprecated_silver_images_queue_20260606` | enabled | service_role: true<br>authenticated: true | service_role: true | service_role: true | service_role: true |
| `_deprecated_silver_print_areas_20260606` | enabled | service_role: true<br>authenticated: true | service_role: true | service_role: true | service_role: true |
| `_deprecated_silver_products_20260606` | enabled | service_role: true<br>authenticated: true | service_role: true | service_role: true | service_role: true |
| `_deprecated_silver_variants_20260606` | enabled | service_role: true<br>authenticated: true | service_role: true | service_role: true | service_role: true |
| `_qa_pct_results` | enabled | — | — | — | — |
| `access_blocked_log` | enabled | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | — | — |
| `access_security_settings` | enabled | authenticated: (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)) | — | authenticated: (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)) | — |
| `achievements` | enabled | — | — | — | — |
| `admin_audit_log` | enabled | authenticated: is_admin_strict(auth.uid()) OR is_dev(auth.uid()) | authenticated: is_admin_strict(auth.uid()) OR is_dev(auth.uid()) | — | — |
| `admin_audit_log_y2025m12` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026m01` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026m02` | enabled | — | — | — | — |
| `admin_audit_log_y2026m03` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026m04` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026m05` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `admin_audit_log_y2026m06` | enabled | — | — | — | — |
| `admin_settings` | enabled | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) | — |
| `ai_enrichment_queue` | enabled | authenticated: organization_id = '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid | — | — | — |
| `ai_function_routing` | enabled | public: "public"."is_dev"() | public: "public"."is_dev"() | public: "public"."is_dev"() | public: "public"."is_dev"() |
| `ai_models` | enabled | public: "public"."is_dev"() | public: "public"."is_dev"() | public: "public"."is_dev"() | public: "public"."is_dev"() |
| `ai_providers` | enabled | public: "public"."is_dev"() | public: "public"."is_dev"() | public: "public"."is_dev"() | public: "public"."is_dev"() |
| `ai_routing_decisions` | enabled | public: ("public"."is_dev"() OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'supervisor'::"public"."app_role") | — | — | — |
| `ai_usage_events` | enabled | authenticated: ((SELECT auth.uid()) = user_id) OR has_role((SELECT auth.uid()), 'admin'::app_role) | authenticated: (SELECT auth.uid()) = user_id | — | — |
| `ai_usage_logs` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated: (user_id = auth.uid())<br>public: ("public"."is_dev"() OR "public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'admin'::"public"."app_role") OR "<br>authenticated: user_id = auth.uid() | service_role: (auth.jwt() ->> 'role') = 'service_role' | service_role: true | — |
| `ai_usage_quotas` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated: true<br>public: auth.uid() IS NOT NULL | authenticated: public.is_admin(auth.uid())<br>public: is_dev() OR has_role(auth.uid(), 'admin'::app_role) | authenticated: public.is_admin(auth.uid())<br>public: is_dev() OR has_role(auth.uid(), 'admin'::app_role) | authenticated: public.is_admin(auth.uid())<br>public: is_dev() OR has_role(auth.uid(), 'admin'::app_role) |
| `analytics_events` | enabled | public: true | — | — | — |
| `anon_catalog_grant_audit_log` | enabled | authenticated: is_admin_or_above((SELECT auth.uid()))<br>service_role: true | service_role: true | service_role: true | service_role: true |
| `anon_insert_rate` | enabled | service_role: true | — | — | — |
| `app_vitals` | enabled | — | — | — | — |
| `archive._cleanup_manifest` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `art_file_attachments` | enabled | public: (user_id = auth.uid()) | public: (user_id = auth.uid()) | public: (user_id = auth.uid()) | public: (user_id = auth.uid()) |
| `asia_image_import_queue` | enabled | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false |
| `asia_legacy_upload_queue` | enabled | — | — | — | — |
| `asia_upload_mapping` | enabled | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false |
| `attribute_definitions` | enabled | public: ("organization_id" IN ( SELECT "attribute_definitions"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT  | public: ("organization_id" IN ( SELECT "attribute_definitions"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT  | public: ("organization_id" IN ( SELECT "attribute_definitions"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT  | public: ("organization_id" IN ( SELECT "attribute_definitions"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT  |
| `attribute_equivalences` | enabled | authenticated: true<br>service_role: true | service_role: true | service_role: true | service_role: true |
| `attribute_groups` | enabled | public: ("organization_id" IN ( SELECT "attribute_groups"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SEL | public: ("organization_id" IN ( SELECT "attribute_groups"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SEL | public: ("organization_id" IN ( SELECT "attribute_groups"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SEL | public: ("organization_id" IN ( SELECT "attribute_groups"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SEL |
| `audit_log` | enabled | — | authenticated: (SELECT auth.uid()) = user_id | — | — |
| `audit_log_gravacao` | enabled | — | — | — | — |
| `audit_logs` | enabled | authenticated: (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)) | — | — | — |
| `audit_trail` | enabled | public: true | — | — | — |
| `auth.users` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `auth_login_attempts` | enabled | — | — | — | — |
| `auto_tag_rules` | enabled | — | — | — | — |
| `b2b_collection_products` | enabled | public: EXISTS ( SELECT 1 FROM b2b_collections c WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND user_is_org_member(c.organiza | public: EXISTS ( SELECT 1 FROM b2b_collections c WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND is_org_owner_or_admin(c.organ | public: EXISTS ( SELECT 1 FROM b2b_collections c WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND is_org_owner_or_admin(c.organ | public: EXISTS ( SELECT 1 FROM b2b_collections c WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND is_org_owner_or_admin(c.organ |
| `b2b_collections` | enabled | public: user_is_org_member(organization_id) | public: is_org_owner_or_admin(organization_id) | public: is_org_owner_or_admin(organization_id) | public: is_org_owner_or_admin(organization_id) |
| `binding_colors` | enabled | public: true | — | — | — |
| `binding_types` | enabled | public: true | — | — | — |
| `bitrix_clients` | enabled | authenticated: true | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) |
| `bitrix_deals` | enabled | — | — | — | — |
| `bitrix_sync_logs` | enabled | — | — | — | — |
| `bot_detection_log` | enabled | authenticated: public.is_dev(auth.uid()) | service_role: (auth.jwt() ->> 'role') = 'service_role' | — | — |
| `cache_entries` | enabled | public: true | — | — | — |
| `cart_templates` | enabled | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) |
| `catalog_analytics` | enabled | authenticated: is_manager_or_admin() OR (SELECT auth.uid()) = user_id | authenticated: (SELECT auth.uid()) = user_id | — | — |
| `categories` | enabled | — | public: ("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "aut | public: ("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "aut | public: ("organization_id" IN ( SELECT "uo"."organization_id" FROM "public"."user_organizations" "uo" WHERE (("uo"."user_id" = ( SELECT "aut |
| `category_accessory_categories` | enabled | — | — | — | — |
| `category_ancestors` | enabled | anon, authenticated: true<br>public: true<br>service_role: true | service_role: true | service_role: true | service_role: true |
| `category_attributes` | enabled | public: ("category_id" IN ( SELECT "categories"."id" FROM "public"."categories" WHERE ("categories"."organization_id" IN ( SELECT "user_orga | public: ("category_id" IN ( SELECT "categories"."id" FROM "public"."categories" WHERE ("categories"."organization_id" IN ( SELECT "user_orga | public: ("category_id" IN ( SELECT "categories"."id" FROM "public"."categories" WHERE ("categories"."organization_id" IN ( SELECT "user_orga | public: ("category_id" IN ( SELECT "categories"."id" FROM "public"."categories" WHERE ("categories"."organization_id" IN ( SELECT "user_orga |
| `category_colors` | enabled | — | — | — | — |
| `category_commemorative_dates` | enabled | — | — | — | — |
| `category_copywriting_config` | enabled | — | — | — | — |
| `category_icons` | enabled | public: true | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) |
| `category_relationships` | enabled | public: "public"."user_belongs_to_org"("organization_id") | — | — | — |
| `category_target_audiences` | enabled | — | — | — | — |
| `category_variation_types` | enabled | — | — | — | — |
| `cf_recon.action_log` | enabled | — | — | — | — |
| `cf_recon.cf_ghost_check_queue` | enabled | — | — | — | — |
| `cf_recon.cf_image` | enabled | — | — | — | — |
| `cf_recon.crawl_run` | enabled | — | — | — | — |
| `cf_recon.metric_snapshot` | enabled | — | — | — | — |
| `cf_recon.remediation` | enabled | — | — | — | — |
| `cf_recon_inflight` | enabled | — | — | — | — |
| `city_whitelist` | enabled | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) |
| `classification_audit.category_suggestions` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `classify_functions_registry` | enabled | — | — | — | — |
| `client_contacts` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `client_notes` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `collection_item_reactions` | enabled | authenticated: auth.uid() IS NOT NULL AND EXISTS ( SELECT 1 FROM public.collections c WHERE c.id = collection_item_reactions.collection_id A<br>anon: EXISTS ( SELECT 1 FROM public.collections c WHERE c.id = collection_item_reactions.collection_id AND c.is_public = true AND c.share_to | public: false | — | — |
| `collection_items` | enabled | public: (EXISTS ( SELECT 1 FROM public.collections c WHERE ((c.id = collection_items.collection_id) AND (c.is_public = true) AND (c.share_to<br>public: ((EXISTS ( SELECT 1 FROM "public"."collections" WHERE (("collections"."id" = "collection_items"."collection_id") AND ("collections". | — | — | — |
| `collection_items_trash` | enabled | public: (( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id") | public: (( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id") | — | public: (( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id") |
| `collection_products` | enabled | authenticated: EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_products.collection_id AND (c.user_id = (SELECT auth.uid()) OR c. | authenticated: EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_products.collection_id AND c.user_id = (SELECT auth.uid())) OR is | authenticated: EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_products.collection_id AND c.user_id = (SELECT auth.uid())) OR is | authenticated: EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_products.collection_id AND c.user_id = (SELECT auth.uid())) OR is |
| `collections` | enabled | anon: (is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now())) | — | — | — |
| `color_analysis_staging` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `color_equivalences` | enabled | public: "public"."user_belongs_to_org"("organization_id") | — | — | — |
| `color_groups` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `color_nuances` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role)<br>anon: is_active = true | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `color_synonym_map` | enabled | authenticated: true<br>authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) |
| `color_variations` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `commemorative_date_colors` | enabled | public: true | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `commemorative_date_exclusions` | enabled | public: true | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `commemorative_dates` | enabled | public: ("is_active" = true) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `companies` | enabled | authenticated: true | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) |
| `company_addresses` | enabled | — | — | — | — |
| `company_contacts` | enabled | — | — | — | — |
| `company_email_patterns` | enabled | — | — | — | — |
| `comparison_reactions` | enabled | — | — | — | — |
| `component_media` | enabled | authenticated: true | authenticated: has_role((select auth.uid()), 'admin'::app_role) | authenticated: has_role((select auth.uid()), 'admin'::app_role) | authenticated: has_role((select auth.uid()), 'admin'::app_role) |
| `connection_test_history` | enabled | authenticated: public.is_dev(auth.uid()) | service_role: (auth.jwt() ->> 'role') = 'service_role' | — | authenticated: public.is_dev(auth.uid()) |
| `contact_emails` | enabled | — | — | — | — |
| `contact_phones` | enabled | — | — | — | — |
| `content_articles` | enabled | anon, authenticated: status = 'published' AND is_deleted = false | authenticated: author_id = (SELECT auth.uid()) | authenticated: author_id = (SELECT auth.uid()) | authenticated: author_id = (SELECT auth.uid()) |
| `conversation_audit_logs` | enabled | authenticated: (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))<br>authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) | — | — |
| `conversation_delivery_status` | enabled | — | — | — | — |
| `conversation_event_history` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.conversation_audit_logs cal WHERE cal.id = conversation_event_history.conversation_id AND ( cal | authenticated: (EXISTS ( SELECT 1 FROM public.conversation_audit_logs WHERE ((conversation_audit_logs.id = conversation_event_history.conver | — | — |
| `cotacao_eventos` | enabled | — | — | — | — |
| `cotacoes` | enabled | authenticated: true | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() or public.current_user_role() = 'admin' | — |
| `cover_finishes` | enabled | public: true | — | — | — |
| `cover_materials` | enabled | public: true | — | — | — |
| `cover_types` | enabled | public: true | — | — | — |
| `crm_callback_events` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager') )<br>authenticated: external_quote_id IN ( SELECT id FROM public.quotes WHERE seller_id = auth.uid() )<br>authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) | — | — | — |
| `cron_job_timeout_map` | enabled | — | — | — | — |
| `cron_watchdog_log` | enabled | — | — | — | — |
| `custom_kits` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated: ((user_id = auth.uid()) OR public.is_admin(auth.uid())) | authenticated: ((user_id = auth.uid()) OR public.is_admin(auth.uid()))<br>authenticated: user_id = (SELECT auth.uid()) | authenticated: ((user_id = auth.uid()) OR public.is_admin(auth.uid())) | authenticated: ((user_id = auth.uid()) OR public.is_admin(auth.uid())) |
| `dashboard_insights_cache` | enabled | authenticated: true | authenticated: (SELECT auth.uid()) = user_id | authenticated: (SELECT auth.uid()) = user_id | authenticated: ((SELECT auth.uid()) = user_id) OR has_role((SELECT auth.uid()), 'admin'::app_role) |
| `db_connection_snapshots` | enabled | authenticated: true | — | — | — |
| `device_login_notifications` | enabled | authenticated: user_id = (SELECT auth.uid()) | — | — | — |
| `discount_approval_audit` | enabled | authenticated: can_view_all_sales() OR has_role((SELECT auth.uid()), 'supervisor'::app_role) OR (EXISTS ( SELECT 1 FROM discount_approval_re | authenticated: false | authenticated: false | authenticated: false |
| `discount_approval_requests` | enabled | authenticated: (public.can_view_all_sales() OR public.has_role(auth.uid(), 'supervisor'::public.app_role) OR (seller_id = auth.uid()))<br>authenticated: requesting_user_id = auth.uid() | authenticated: ((seller_id = auth.uid()) OR public.can_view_all_sales())<br>authenticated: requesting_user_id = auth.uid() | authenticated: (public.can_view_all_sales() OR public.has_role(auth.uid(), 'supervisor'::public.app_role))<br>authenticated: requesting_user_id = auth.uid() | authenticated: public.can_view_all_sales() |
| `e2e_cleanup_audit` | enabled | authenticated: public.has_role((SELECT auth.uid()), 'admin') | — | — | — |
| `e2e_cleanup_rate_limit` | enabled | — | — | — | — |
| `eco_material_config` | enabled | — | — | — | — |
| `edge_function_invocations` | enabled | — | — | — | — |
| `edge_rate_limits` | enabled | public: auth.role() = 'service_role' | public: auth.role() = 'service_role' | public: auth.role() = 'service_role' | public: auth.role() = 'service_role' |
| `enriched_contacts` | enabled | — | — | — | — |
| `enrichment_log` | enabled | — | — | — | — |
| `entity_versions` | enabled | — | — | — | — |
| `expert_conversations` | enabled | — | — | — | — |
| `expert_messages` | enabled | — | — | — | — |
| `external_connections` | forced | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) |
| `external_connections_sync_log` | enabled | — | — | — | — |
| `favorite_item_reactions` | enabled | anon, authenticated: is_admin((select auth.uid())) OR EXISTS ( SELECT 1 FROM favorite_lists l WHERE ((l.id = favorite_item_reactions.list_id | anon, authenticated: EXISTS (SELECT 1 FROM public.favorite_lists l WHERE l.id=favorite_item_reactions.list_id AND l.shared_token IS NOT NULL | — | authenticated: EXISTS (SELECT 1 FROM public.favorite_lists l WHERE l.id=favorite_item_reactions.list_id AND l.user_id=auth.uid()) |
| `favorite_items` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated, anon: (EXISTS ( SELECT 1 FROM public.favorite_lists l WHERE ((l.id = favorite_items.list_id) AND (l.shared_token IS NOT NULL)<br>authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) |
| `favorite_items_trash` | enabled | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) |
| `favorite_lists` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated, anon: ((shared_token IS NOT NULL) AND ((shared_expires_at IS NULL) OR (shared_expires_at > now())))<br>authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) | authenticated: (user_id = auth.uid()) |
| `feature_flags` | enabled | public: true | — | — | — |
| `feminine_color_config` | enabled | — | — | — | — |
| `file_scan_logs` | enabled | — | — | — | — |
| `follow_up_reminders` | enabled | authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid()) |
| `frontend_telemetry` | enabled | public: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'supervisor') ) | anon: user_id IS NULL AND length(coalesce(event_type,'')) BETWEEN 1 AND 64 AND length(coalesce(name,'')) BETWEEN 1 AND 256 AND length(coales<br>authenticated: (user_id IS NULL OR user_id = (select auth.uid())) AND length(coalesce(event_type,'')) BETWEEN 1 AND 64 AND length(coalesce(n<br>anon, authenticated: event_type IN ('error', 'performance', 'ux_action', 'api_fail') AND length(btrim(name)) BETWEEN 1 AND 256 AND (duration<br>service_role: (auth.jwt() ->> 'role') = 'service_role'<br>anon, authenticated: event_type IN ('page_view','web_vital','error','perf','interaction') AND length(coalesce(metadata::text, '')) < 8000 | — | public: EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'supervisor') ) |
| `future_stock_entries` | enabled | — | — | — | — |
| `generated_mockups` | enabled | authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid()) |
| `geo_allowed_countries` | enabled | public: true | — | — | — |
| `hardening_health_snapshots` | enabled | authenticated: public.is_dev(auth.uid()) | — | — | — |
| `image_backfill_queue` | enabled | authenticated: is_org_owner_or_admin('5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid) | authenticated: is_org_owner_or_admin('5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid) | authenticated: is_org_owner_or_admin('5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid) | authenticated: is_org_owner_or_admin('5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid) |
| `image_types` | enabled | — | — | — | — |
| `import_pipeline_steps` | enabled | — | — | — | — |
| `import_staging_images` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `inbound_webhook_endpoints` | enabled | public: public.is_admin(auth.uid()) | public: public.is_admin(auth.uid()) | public: public.is_admin(auth.uid()) | public: public.is_admin(auth.uid()) |
| `inbound_webhook_events` | enabled | public: public.is_admin(auth.uid()) | — | — | public: public.is_admin(auth.uid()) |
| `included_packaging_print_areas` | enabled | — | — | — | — |
| `included_packaging_techniques` | enabled | — | — | — | — |
| `ingestion_run_log` | enabled | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false |
| `integration_credentials` | forced | — | — | — | — |
| `ip_access_control` | enabled | authenticated: public.is_dev(auth.uid())<br>service_role: true | authenticated: public.is_dev(auth.uid())<br>service_role: true | authenticated: public.is_dev(auth.uid())<br>service_role: true | authenticated: public.is_dev(auth.uid())<br>service_role: true |
| `ip_whitelist` | enabled | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) |
| `kill_switch_hits` | enabled | authenticated: is_admin_or_above((SELECT auth.uid())) | anon, authenticated, service_role: switch_name IS NOT NULL AND length(switch_name) BETWEEN 3 AND 100 AND source IS NOT NULL AND occurred_at  | — | authenticated: is_admin_or_above((SELECT auth.uid())) |
| `kit_collaborators` | enabled | public: (is_kit_owner(kit_id, (SELECT auth.uid())) OR (user_id = auth.uid())) | public: is_kit_owner(kit_id, (SELECT auth.uid())) | public: is_kit_owner(kit_id, (SELECT auth.uid())) | public: is_kit_owner(kit_id, (SELECT auth.uid())) |
| `kit_comments` | enabled | public: is_kit_owner(kit_id, ( SELECT auth.uid())) OR is_kit_collaborator(kit_id, ( SELECT auth.uid())) OR is_admin(( SELECT auth.uid())) | public: (author_id = ( SELECT auth.uid())) AND (is_kit_owner(kit_id, ( SELECT auth.uid())) OR is_kit_collaborator(kit_id, ( SELECT auth.uid( | public: (author_id = ( SELECT auth.uid())) OR is_admin(( SELECT auth.uid())) | public: (author_id = ( SELECT auth.uid())) OR is_admin(( SELECT auth.uid())) |
| `kit_component_enrichment_raw` | enabled | public: is_admin_or_above((SELECT auth.uid()))<br>public: ( SELECT auth.uid()) IS NOT NULL | public: is_admin_or_above((SELECT auth.uid()))<br>public: is_admin_or_above(( SELECT auth.uid())) | public: is_admin_or_above((SELECT auth.uid()))<br>public: is_admin_or_above(( SELECT auth.uid())) | public: is_admin_or_above((SELECT auth.uid()))<br>public: is_admin_or_above(( SELECT auth.uid())) |
| `kit_component_ficha_staging` | enabled | — | — | — | — |
| `kit_component_padronizacao` | enabled | public: is_admin_or_above((SELECT auth.uid()))<br>public: ( SELECT auth.uid()) IS NOT NULL | public: is_admin_or_above((SELECT auth.uid()))<br>public: is_admin_or_above(( SELECT auth.uid())) | public: is_admin_or_above((SELECT auth.uid()))<br>public: is_admin_or_above(( SELECT auth.uid())) | public: is_admin_or_above((SELECT auth.uid()))<br>public: is_admin_or_above(( SELECT auth.uid())) |
| `kit_component_types` | enabled | — | — | — | — |
| `kit_component_variant_skus` | enabled | — | — | — | — |
| `kit_ficha_session_log` | enabled | — | — | — | — |
| `kit_quote_requests` | enabled | authenticated: (SELECT auth.uid()) = user_id | authenticated: (SELECT auth.uid()) = user_id | — | — |
| `kit_save_requests` | enabled | authenticated: user_id = (SELECT auth.uid()) | authenticated: user_id = (SELECT auth.uid()) | — | — |
| `kit_share_tokens` | enabled | authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid()) |
| `kit_templates` | enabled | authenticated: ((is_active = true) OR public.is_admin(auth.uid())) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `kit_typical_dims` | enabled | — | — | — | — |
| `kit_variants` | enabled | public: (EXISTS ( SELECT 1 FROM custom_kits k WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid()))))) OR is_adm | public: EXISTS ( SELECT 1 FROM custom_kits k WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid())))) | public: EXISTS ( SELECT 1 FROM custom_kits k WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid())))) | public: EXISTS ( SELECT 1 FROM custom_kits k WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid())))) |
| `login_attempts` | enabled | authenticated: public.is_admin(auth.uid()) | service_role: (auth.jwt() ->> 'role') = 'service_role' | — | — |
| `magazine_duplicate_requests` | enabled | authenticated: actor_id = (SELECT auth.uid())<br>service_role: true | authenticated: actor_id = (SELECT auth.uid())<br>service_role: true | service_role: true | service_role: true |
| `magazine_items` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND ( m.owner_id = (SELECT auth.uid()) OR p<br>authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND ( m.owner_id = auth.uid() OR ( m.organi<br>authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND m.owner_id = (SELECT auth.uid()) ) | authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND ( m.owner_id = auth.uid() OR ( m.organi<br>authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND m.owner_id = (SELECT auth.uid()) ) | authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND ( m.owner_id = auth.uid() OR ( m.organi<br>authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND m.owner_id = (SELECT auth.uid()) ) | authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND ( m.owner_id = auth.uid() OR ( m.organi<br>authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_items.magazine_id AND m.owner_id = (SELECT auth.uid()) ) |
| `magazine_public_reactions` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_public_reactions.magazine_id AND m.owner_id = (SELECT auth.ui | — | — | — |
| `magazine_public_view_events` | enabled | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) OR EXISTS ( SELECT 1 FROM public.magazines m WHERE m.id = magazine_public_vi | — | — | — |
| `magazine_public_view_events_2026_07` | enabled | — | — | — | — |
| `magazine_public_view_events_2026_08` | enabled | — | — | — | — |
| `magazine_public_view_events_2026_09` | enabled | — | — | — | — |
| `magazine_public_view_events_2026_10` | enabled | — | — | — | — |
| `magazine_public_view_events_2026_11` | enabled | — | — | — | — |
| `magazine_public_view_events_2026_12` | enabled | — | — | — | — |
| `magazine_public_view_events_2027_01` | enabled | — | — | — | — |
| `magazine_public_view_events_default` | enabled | — | — | — | — |
| `magazine_reader_state` | enabled | anon, authenticated: true<br>authenticated: user_id = (SELECT auth.uid()) | anon, authenticated: magazine_token IS NOT NULL AND viewer_fingerprint IS NOT NULL AND cardinality(bookmarks) <= 500 AND last_page_index >=  | anon, authenticated: true | — |
| `magazine_templates` | enabled | authenticated: owner_id = auth.uid()<br>authenticated: shared_in_org = true AND organization_id IS NOT NULL AND EXISTS ( SELECT 1 FROM public.organization_members om WHERE om.organ<br>authenticated: owner_id = (SELECT auth.uid())<br>authenticated: shared_in_org = true AND organization_id IS NOT NULL AND EXISTS ( SELECT 1 FROM public.organization_members om WHERE om.organ | authenticated: owner_id = auth.uid()<br>authenticated: owner_id = (SELECT auth.uid()) | authenticated: owner_id = auth.uid()<br>authenticated: owner_id = (SELECT auth.uid()) | authenticated: owner_id = auth.uid()<br>authenticated: owner_id = (SELECT auth.uid()) |
| `magazine_templates_catalog` | enabled | — | — | — | — |
| `magazine_view_rollup_watermark` | enabled | — | — | — | — |
| `magazines` | enabled | authenticated: organization_id IS NOT NULL AND deleted_at IS NULL AND EXISTS ( SELECT 1 FROM public.organization_members om WHERE om.organiz<br>authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) OR ((owner_id = (SELECT auth.uid())) AND (deleted_at IS NULL))<br>authenticated: owner_id = (SELECT auth.uid()) | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) OR ((owner_id = (SELECT auth.uid())) AND (deleted_at IS NULL))<br>authenticated: owner_id = (SELECT auth.uid()) | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) OR ((owner_id = (SELECT auth.uid())) AND (deleted_at IS NULL))<br>authenticated: owner_id = (SELECT auth.uid()) | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) OR ((owner_id = (SELECT auth.uid())) AND (deleted_at IS NULL))<br>authenticated: owner_id = (SELECT auth.uid()) |
| `magic_up_brand_kits` | enabled | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) |
| `magic_up_campaigns` | enabled | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) |
| `magic_up_comments` | enabled | authenticated: (auth.uid() = user_id) | authenticated: ((auth.uid() = user_id) AND (EXISTS ( SELECT 1 FROM public.magic_up_generations g WHERE ((g.id = magic_up_comments.generation | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) |
| `magic_up_generations` | enabled | — | — | — | — |
| `magic_up_public_shares` | enabled | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) |
| `magic_up_reactions` | enabled | authenticated: (auth.uid() = user_id) | authenticated: ((auth.uid() = user_id) AND (EXISTS ( SELECT 1 FROM public.magic_up_generations g WHERE ((g.id = magic_up_reactions.generatio | authenticated: (auth.uid() = user_id) | authenticated: (auth.uid() = user_id) |
| `markup_configurations` | enabled | — | — | — | — |
| `material_equivalences` | enabled | — | — | — | — |
| `material_groups` | enabled | public: "public"."user_belongs_to_org"("organization_id") | — | — | — |
| `material_types` | enabled | — | public: ("organization_id" IN ( SELECT "material_types"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELEC | public: ("organization_id" IN ( SELECT "material_types"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELEC | public: ("organization_id" IN ( SELECT "material_types"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT ( SELEC |
| `material_variations` | enabled | public: ("organization_id" IN ( SELECT "material_variations"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT (  | public: ("organization_id" IN ( SELECT "material_variations"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT (  | public: ("organization_id" IN ( SELECT "material_variations"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT (  | public: ("organization_id" IN ( SELECT "material_variations"."organization_id" FROM "public"."profiles" WHERE ("profiles"."id" = ( SELECT (  |
| `mcp_access_violations` | enabled | — | — | — | — |
| `mcp_api_keys` | forced | authenticated: public.is_dev(auth.uid()) | authenticated: false | authenticated: false | authenticated: false |
| `mcp_full_grantors` | enabled | authenticated: public.is_dev(auth.uid()) | public: "public"."is_admin_strict"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_strict"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_strict"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `mcp_key_auto_revocations` | enabled | public: "public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | — | — | — |
| `mcp_kv` | enabled | — | — | — | — |
| `mcp_sessions` | enabled | service_role: true | service_role: true | service_role: true | service_role: true |
| `medallion_coverage_snapshots` | enabled | — | — | — | — |
| `mockup_approval_links` | enabled | — | — | — | — |
| `mockup_credit_transactions` | enabled | — | — | — | — |
| `mockup_credits` | enabled | — | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `mockup_drafts` | enabled | — | — | — | — |
| `mockup_generation_jobs` | enabled | — | — | — | — |
| `mockup_prompt_configs` | enabled | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `mockup_prompt_history` | enabled | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | — | — |
| `mockup_templates` | enabled | public: (auth.uid() = user_id) | public: (auth.uid() = user_id)<br>public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: (auth.uid() = user_id)<br>public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: (auth.uid() = user_id)<br>public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `navigation_analytics` | enabled | authenticated: (SELECT auth.uid()) = user_id | authenticated: (SELECT auth.uid()) = user_id | — | — |
| `ncm_codes` | enabled | — | — | — | — |
| `notebook_features` | enabled | public: true | — | — | — |
| `notification_preferences` | enabled | public: ( SELECT auth.uid()) = user_id<br>public: auth.uid() = user_id | public: ( SELECT auth.uid()) = user_id<br>public: auth.uid() = user_id | public: ( SELECT auth.uid()) = user_id<br>public: auth.uid() = user_id | public: ( SELECT auth.uid()) = user_id<br>public: auth.uid() = user_id |
| `notification_templates` | enabled | authenticated: is_supervisor_or_above((SELECT auth.uid())) | public: false | public: false | public: false |
| `notifications` | enabled | public: ("user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))<br>public: auth.uid() = user_id | public: true | public: ("user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))<br>public: auth.uid() = user_id | public: auth.uid() = user_id |
| `ops.pgss_history` | enabled | — | — | — | — |
| `ops.table_size_history` | enabled | — | — | — | — |
| `ops.wraparound_monitor_log` | enabled | — | — | — | — |
| `ops_grant_audit` | enabled | PUBLIC: FALSE | PUBLIC: FALSE | PUBLIC: FALSE | PUBLIC: FALSE |
| `optimization_logs` | enabled | public: true | — | — | — |
| `optimization_queue` | enabled | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) | authenticated: public.is_dev(auth.uid()) |
| `optimization_queue_runs` | enabled | — | — | — | — |
| `order_history` | enabled | — | — | — | — |
| `order_item_personalizations` | enabled | public: (EXISTS ( SELECT 1 FROM ("public"."order_items" "oi" JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id"))) WHERE (("oi"."id" | — | — | — |
| `order_items` | enabled | public: (EXISTS ( SELECT 1 FROM "public"."orders" "o" WHERE (("o"."id" = "order_items"."order_id") AND "public"."user_is_org_member"("o"."or<br>authenticated: EXISTS ( SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND ( o.seller_id = auth.uid() OR o.client_id = auth.uid()  | authenticated: EXISTS ( SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND ( o.seller_id = auth.uid() OR o.created_by = auth.uid() | public: (EXISTS ( SELECT 1 FROM "public"."orders" "o" WHERE (("o"."id" = "order_items"."order_id") AND "public"."user_is_org_member"("o"."or<br>authenticated: EXISTS ( SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND ( o.seller_id = auth.uid() OR o.organization_id IN (SEL | public: (EXISTS ( SELECT 1 FROM "public"."orders" "o" WHERE (("o"."id" = "order_items"."order_id") AND "public"."is_org_owner_or_admin"("o".<br>authenticated: EXISTS ( SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND ( o.seller_id = auth.uid() OR o.organization_id IN (SEL |
| `orders` | enabled | authenticated: (seller_id = auth.uid())<br>authenticated: (public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR<br>public: "public"."user_is_org_member"("organization_id") | authenticated: (public.can_view_all_sales() OR (seller_id = auth.uid()))<br>authenticated: (seller_id = auth.uid()) | authenticated: (seller_id = auth.uid())<br>authenticated: (public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR<br>public: "public"."user_is_org_member"("organization_id") | authenticated: (public.can_view_all_sales() OR (seller_id = auth.uid()))<br>authenticated: (seller_id = auth.uid())<br>public: "public"."is_org_owner_or_admin"("organization_id") |
| `organization_members` | enabled | authenticated: (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)) | authenticated: public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role)<br>public: has_org_role((select auth.uid()), organization_id, 'owner'::org_role) OR has_org_role((select auth.uid()), organization_id, 'admin': | authenticated: public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role)<br>public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | authenticated: (public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role) OR (user_id = auth.uid()))<br>public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `organizations` | enabled | public: (EXISTS ( SELECT 1 FROM "public"."user_organizations" "uo" WHERE (("uo"."organization_id" = "organizations"."id") AND ("uo"."user_id | — | authenticated: public.has_org_role(auth.uid(), id, 'owner'::public.org_role) | — |
| `outbound_webhooks` | enabled | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `ownership_audit_reports` | enabled | — | public: ("public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SE | — | public: ("public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SE |
| `ownership_repair_logs` | enabled | authenticated: (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)) | — | — | — |
| `packaging_compatibility_config` | enabled | — | — | — | — |
| `packaging_types` | enabled | — | — | — | — |
| `packagings` | enabled | — | — | — | — |
| `paper_colors` | enabled | public: true | — | — | — |
| `paper_formats` | enabled | public: true | — | — | — |
| `paper_rulings` | enabled | public: true | — | — | — |
| `paper_weights` | enabled | public: true | — | — | — |
| `password_reset_requests` | enabled | public: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('dev', 'supervisor', 'admin')<br>public: auth.uid() = user_id OR auth.role() = 'service_role' | anon, authenticated: email ~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' AND length(email) BETWEEN 5 AND 254 AND status = 'pending' AND rev<br>anon, authenticated: email = lower(btrim(email)) AND length(email) BETWEEN 6 AND 254 AND email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$<br>anon, authenticated: email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND length(email) <= 320 AND NOT EXISTS ( SELECT 1 FROM publi | public: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('dev', 'supervisor', 'admin') | — |
| `permissions` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated: true | authenticated: public.is_admin(auth.uid())<br>public: "public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | authenticated: public.is_admin(auth.uid())<br>public: "public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | authenticated: public.is_admin(auth.uid())<br>public: "public"."is_dev"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `personalization_locations` | enabled | — | — | — | — |
| `personalization_simulations` | enabled | authenticated: (seller_id = (SELECT auth.uid())) OR is_supervisor_or_above((SELECT auth.uid())) | authenticated: seller_id = (SELECT auth.uid()) | authenticated: (seller_id = (SELECT auth.uid())) OR is_admin_or_above((SELECT auth.uid())) | authenticated: (seller_id = (SELECT auth.uid())) OR is_admin_or_above((SELECT auth.uid())) |
| `personalization_sizes` | enabled | — | — | — | — |
| `personalization_technique_mappings` | enabled | — | — | — | — |
| `personalization_techniques` | enabled | anon: is_active = true | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) | public: "public"."is_admin_or_above"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) |
| `pipeline_control` | enabled | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false |
| `pipeline_health_log` | enabled | public: (SELECT auth.role()) = 'service_role' | public: (SELECT auth.role()) = 'service_role' | public: (SELECT auth.role()) = 'service_role' | public: (SELECT auth.role()) = 'service_role' |
| `pipeline_known_issues` | enabled | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false |
| `pipeline_run_log` | enabled | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false |
| `point_transactions` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `price_history` | enabled | public: ("public"."has_role"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SE | — | — | — |
| `print_area_techniques` | enabled | — | — | — | — |
| `prod_audit.category_keywords` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `prod_audit.category_suggestions` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `prod_audit.classification_rules` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `prod_audit.product_features` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `prod_audit.test_results` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `product_ai_content` | enabled | service_role: true<br>anon, authenticated: true | service_role: true | service_role: true | service_role: true |
| `product_ai_history` | enabled | — | — | — | — |
| `product_attributes` | enabled | public: is_active = true AND is_visible = true<br>authenticated: true<br>service_role: true | service_role: true | service_role: true | service_role: true |
| `product_badge_definitions` | enabled | authenticated, anon: true | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) AND is_system = false |
| `product_category_assignments` | enabled | public: (EXISTS ( SELECT 1 FROM "public"."products" "p" WHERE (("p"."id" = "product_category_assignments"."product_id") AND ("p"."organizati | — | — | — |
| `product_commemorative_dates` | enabled | — | — | — | — |
| `product_comparisons` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `product_component_location_techniques` | enabled | authenticated: true | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) |
| `product_component_locations` | enabled | authenticated: true | authenticated: has_role((select auth.uid()), 'admin'::app_role) | authenticated: has_role((select auth.uid()), 'admin'::app_role) | authenticated: has_role((select auth.uid()), 'admin'::app_role) |
| `product_components` | enabled | authenticated: true | authenticated: has_role((select auth.uid()), 'admin'::app_role) | authenticated: has_role((select auth.uid()), 'admin'::app_role) | authenticated: has_role((select auth.uid()), 'admin'::app_role) |
| `product_customization_prices` | enabled | public: true | — | — | — |
| `product_deactivation_requests` | enabled | — | — | — | — |
| `product_deactivation_tokens` | enabled | — | — | — | — |
| `product_faqs` | enabled | public: ("is_active" = true) | — | — | — |
| `product_fiscal` | enabled | service_role: true<br>anon, authenticated: true | service_role: true | service_role: true | service_role: true |
| `product_group_components` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: true | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: is_admin_or_above((SELECT auth.uid())) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: is_admin_or_above((SELECT auth.uid())) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: is_admin_or_above((SELECT auth.uid())) |
| `product_group_location_techniques` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: true | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: is_admin_or_above((SELECT auth.uid())) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: is_admin_or_above((SELECT auth.uid())) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: is_admin_or_above((SELECT auth.uid())) |
| `product_group_locations` | enabled | public: true<br>public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: true | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: is_admin_or_above((SELECT auth.uid())) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: is_admin_or_above((SELECT auth.uid())) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: is_admin_or_above((SELECT auth.uid())) |
| `product_group_members` | enabled | authenticated: true<br>public: true<br>public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: has_role((select auth.uid()), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: has_role((select auth.uid()), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: has_role((select auth.uid()), 'admin'::app_role) |
| `product_groups` | enabled | authenticated: true<br>public: true | authenticated: has_role((select auth.uid()), 'admin'::app_role) | authenticated: has_role((select auth.uid()), 'admin'::app_role) | authenticated: has_role((select auth.uid()), 'admin'::app_role) |
| `product_images` | enabled | public: is_active = true OR is_org_owner_or_admin(organization_id) | — | — | public: (EXISTS ( SELECT 1 FROM "public"."products" "p" WHERE (("p"."id" = "product_images"."product_id") AND ("p"."organization_id" IN ( SE |
| `product_included_packagings` | enabled | public: true | — | — | — |
| `product_kit_components` | enabled | — | — | — | public: (EXISTS ( SELECT 1 FROM "public"."products" "p" WHERE (("p"."id" = "product_kit_components"."kit_product_id") AND "public"."is_org_o |
| `product_materials` | enabled | — | — | — | — |
| `product_notebook_features` | enabled | public: true | — | — | — |
| `product_notebook_specs` | enabled | public: true | — | — | — |
| `product_novelties` | enabled | public: true<br>public: has_role(auth.uid(), 'admin')<br>public: true<br>service_role: true<br>authenticated: is_active = true<br>anon: is_active = true | public: has_role(auth.uid(), 'admin')<br>public: true<br>service_role: true | public: has_role(auth.uid(), 'admin')<br>public: true<br>service_role: true | public: has_role(auth.uid(), 'admin')<br>public: true<br>service_role: true |
| `product_packaging` | enabled | public: true | — | — | — |
| `product_packaging_compatibility` | enabled | public: true | — | — | — |
| `product_packagings` | enabled | — | — | — | — |
| `product_physical` | enabled | authenticated: true<br>service_role: true | service_role: true | service_role: true | service_role: true |
| `product_price_freshness_overrides` | enabled | — | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) | authenticated: has_role((SELECT auth.uid()), 'admin'::app_role) |
| `product_print_positions` | enabled | public: true | — | — | — |
| `product_properties` | enabled | anon: public.fn_product_active_for_rls(product_id) | — | — | — |
| `product_qa_image_alerts` | enabled | authenticated: true<br>authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) | authenticated: is_admin_or_above((SELECT auth.uid())) |
| … +195 linhas — lista completa em `context.json` | | | | | |

> `—` com RLS ligado = ninguém além de service_role. `sem RLS` = qualquer chave anon lê/escreve tudo.

## Onde o RLS é IGNORADO (service_role) — 821 arquivo(s)

- `auditoria-supabase/propostas/P01_rls_restrictive_correcao.sql`
- `auditoria-supabase/propostas/P10_func_new_001_fn_cron_guard_revoke.sql`
- `docs/db/proposals/20260922210000_create_quote_lineage.sql`
- `docs/db/proposals/20260922211000_update_quote_lineage_lock.sql`
- `docs/promo-champions/migration-helpers.sql`
- `docs/promo-champions/migration.sql`
- `docs/promo-champions/receive-quote-sync.ts`
- `docs/sql/crm_callback_alerts_cron.sql`
- `docs/sql/crm_callback_events_retention.sql`
- `e2e/flows/04cb-discount-approval-idempotency-db.spec.ts`
- `e2e/flows/28-error-boundaries.spec.ts`
- `e2e/flows/webhook-fuzzing.spec.ts`
- `qa/migrations-draft/2026-06-18_security_definer_acl.sql`
- `qa/migrations-draft/2026-06-19_reposicao_variants_summary.sql`
- `qa/migrations-draft/2026-06-20_revoke_secdef_from_authenticated.sql`
- `qa/migrations-draft/2026-07-06_crm_callback_events.sql`
- `qa/migrations-draft/2026-07-13_secdef_revoke_webhook_locks.sql`
- `qa/migrations-draft/2026-07-13_secdef_revoke_webhook_locks_ROLLBACK.sql`
- `qa/migrations-draft/2026-07-23_get_edge_invoke_summary.sql`
- `qa/migrations-draft/2026-09-09_magazine_rpc_only_contract.sql`
- `qa/migrations-draft/_archived/2026-07-12_magazine_reader_state.sql`
- `qa/migrations-draft/_archived/2026-07-12_magazines.sql`
- `recovery/20260511123935_f45f50db-bcac-46e4-8542-e438396d69be.sql`
- `recovery/block03_policies.sql`
- `recovery/block04_functions.sql`
- `recovery/block09_storage.sql`
- `recovery/block09b_storage_policies_full.sql`
- `recovery/block16_auth_hooks_validation.sql`
- `recovery/full-public-schema.sql`
- `recovery/migrations/20260511123935_purge_expired_step_up_artifacts.sql`
- `recovery/patches/D1.1_storage_policies/patch.sql`
- `recovery/patches/D1.2_optimization_queue/patch.sql`
- `recovery/patches/D2.2_webhooks_extra/functions.sql`
- `recovery/patches/D2.4_external_connections/patch.sql`
- `recovery/patches/D4.1_step_up_mfa/patch.sql`
- `recovery/patches/D4.6_security_auth/patch.sql`
- `recovery/patches/D4.7_mcp_advanced/functions.sql`
- `recovery/patches/D6_advisor_fixes/patch.sql`
- `recovery/patches/D7_fase_b_cleanup/02_drop_dead_functions.sql`
- `recovery/sql/01_missing_functions.sql`
- `scripts/ai-context/cenarios.mjs`
- `scripts/ai-context/gerar.unit.mjs`
- `scripts/audit-credentials.mjs`
- `scripts/check-edge-authorization.mjs`
- `scripts/check-env.mjs`
- `scripts/check-lint-0011-drift.mjs`
- `scripts/check-lint-0029-drift.mjs`
- `scripts/check-no-bypass-literals.mjs`
- `scripts/check-policies-baseline.mjs`
- `scripts/check-public-views-drift.mjs`
- `scripts/check-quote-rpc-canonical-readiness.mjs`
- `scripts/check-restore-seller-cart-rpc.mjs`
- `scripts/check-rls-no-policy-drift.mjs`
- `scripts/check-secdef-anon-drift.mjs`
- `scripts/check-security-definer-acl.mjs`
- `scripts/ci-cron-table.mjs`
- `scripts/contract-testing.mjs`
- `scripts/drift-baseline.mjs`
- `scripts/e2e-check-stock-seed.mjs`
- `scripts/freight-quest-load-test.mjs`
- `scripts/fuzz-edge-uploads.mjs`
- `scripts/fuzz-testing.mjs`
- `scripts/kit-enrichment/asia-dims-batch.py`
- `scripts/kit-enrichment/xbz-dims-batch.py`
- `scripts/list-users.ts`
- `scripts/massive-load-test.mjs`
- `scripts/observability-check.mjs`
- `scripts/regras_negocio/generate.py`
- `scripts/simulate-quote-rpc-proposals.mjs`
- `scripts/stress-burst.mjs`
- `scripts/supabase-read-only-query.mjs`
- `scripts/supabase_snapshot/snapshot.py`
- `scripts/verify-external.ts`
- `scripts/verify-roboflow-setup.js`
- `src/components/admin/connections/ConnectionRowSourceBadge.tsx`
- `src/components/admin/connections/DataSourceDebugTab.tsx`
- `src/components/admin/connections/ExpectedKeysMatchPanel.tsx`
- `src/components/admin/connections/KeysValidationTab.tsx`
- `src/components/admin/connections/__tests__/ConnectionSecurity.unit.test.tsx`
- `src/components/admin/connections/secretImpactMap.ts`
- `src/components/admin/connections/secretNormalizers.ts`
- `src/components/admin/connections/secretValidators.ts`
- `src/components/admin/connections/secretWhitelist.ts`
- `src/hooks/admin/useRoleMigration.ts`
- `src/hooks/products/useProductEngravingOptions.ts`
- `src/lib/sensitive-masking.ts`
- `src/pages/admin/AdminConexoesStatusPage.tsx`
- `src/pages/admin/OwnershipAuditAdminPage.tsx`
- `src/pages/magazine/hooks/__tests__/useMagazineReaderState.test.ts`
- `src/pages/magazine/hooks/useMagazineReaderState.ts`
- `src/utils/security-audit.ts`
- `supabase/cron/cron-config.sql`
- `supabase/functions/_shared/ai-router/index.ts`
- `supabase/functions/_shared/ai-usage.ts`
- `supabase/functions/_shared/audit-log.ts`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/authorize.ts`
- `supabase/functions/_shared/bot-protection.ts`
- `supabase/functions/_shared/connection-test-runner.ts`
- `supabase/functions/_shared/contracts/schemas/sync-external-db.ts`
- `supabase/functions/_shared/credentials.test.ts`
- `supabase/functions/_shared/credentials.ts`
- `supabase/functions/_shared/dispatcher-auth.test.ts`
- `supabase/functions/_shared/dispatcher-auth.ts`
- `supabase/functions/_shared/edge-authz-manifest.ts`
- `supabase/functions/_shared/external-db-telemetry.ts`
- `supabase/functions/_shared/kill_switch.ts`
- `supabase/functions/_shared/log-safety.ts`
- `supabase/functions/_shared/rate-limiter.ts`
- `supabase/functions/_shared/security.ts`
- `supabase/functions/_shared/token-revocation.ts`
- `supabase/functions/ai-recommendations/kill_switch_contract_test.ts`
- `supabase/functions/anonymize-user/index.ts`
- `supabase/functions/asia-ingestion/credential-client.test.ts`
- `supabase/functions/asia-ingestion/index.ts`
- `supabase/functions/audit-suite/index.ts`
- `supabase/functions/backfill-image-dimensions/index.ts`
- `supabase/functions/bitrix-sync/handler_characterization_test.ts`
- `supabase/functions/bitrix-sync/index.ts`
- `supabase/functions/bulk-random-passwords/index.ts`
- `supabase/functions/categories-api/index.ts`
- `supabase/functions/check-login/index.ts`
- `supabase/functions/cleanup-notifications/index.ts`
- `supabase/functions/cleanup-novelties/index.ts`
- `supabase/functions/collections-watcher/index.ts`
- `supabase/functions/commemorative-dates/index.ts`
- `supabase/functions/comparison-price-watcher/index.ts`
- `supabase/functions/connection-tester/index.ts`
- `supabase/functions/connections-auto-test/index.ts`
- `supabase/functions/connections-health-check/index.ts`
- `supabase/functions/connections-hub-audit/index.ts`
- `supabase/functions/crm-callback-alerts/index.ts`
- `supabase/functions/crm-callback-reprocess/index.ts`
- `supabase/functions/crm-db-bridge/creds_health.test.ts`
- `supabase/functions/crm-db-bridge/index.ts`
- `supabase/functions/crm-db-bridge/scope_integration_test.ts`
- `supabase/functions/e2e-cleanup/handler_characterization_test.ts`
- `supabase/functions/e2e-cleanup/index.mockups.test.ts`
- `supabase/functions/e2e-cleanup/index.ts`
- `supabase/functions/expert-chat/index.ts`
- `supabase/functions/external-db-inspect/index.ts`
- `supabase/functions/favorites-watcher/index.ts`
- `supabase/functions/force-global-logout/index.ts`
- `supabase/functions/full-op-diagnostics/index.ts`
- `supabase/functions/generate-blurhashes/index.ts`
- `supabase/functions/generate-mockup/index.ts`
- `supabase/functions/github-credentials-test/index.ts`
- `supabase/functions/hash-product-images/index.ts`
- `supabase/functions/health-check/index.ts`
- `supabase/functions/load-test/index.ts`
- … +671 (lista completa em `context.json`)

## Funções SQL `SECURITY DEFINER` (rodam com privilégio do dono, ignoram RLS)

- `_can_act_on_behalf_of_others`
- `acquire_ai_quota`
- `add_product_novelty`
- `admin_revoke_user_sessions`
- `apply_high_confidence_suggestions`
- `assert_quote_discount_integrity`
- `audit_mcp_api_keys_changes`
- `audit_mcp_key_insert`
- `audit_mcp_key_revoke`
- `audit_ownership_orphans`
- `audit_rls_coverage`
- `audit_rls_matrix`
- `audit_user_role_changes`
- `auto_assign_user_to_promo_brindes`
- `auto_block_extreme_offenders`
- `auto_revoke_orphan_full_keys`
- `calculate_seo_score`
- `can_access_quote`
- `can_approve_discount`
- `can_grant_mcp_full`
- `can_manage`
- `can_manage_connections`
- `can_manage_quotes`
- `can_view_all_sales`
- `can_view_audit_logs`
- `can_view_connections`
- `can_view_telemetry`
- `charge_mockup_credits_for_job`
- `check_auth_config_status`
- `check_edge_rate_limit`
- `check_hardening_status`
- `check_ip_access`
- `check_login_rate_limit`
- `check_mcp_abuse_threshold`
- `check_rate_limit`
- `check_telemetry_regression`
- `check_webhook_dedup`
- `claim_next_optimization`
- `claim_webhook_delivery`
- `classify_product_origin`
- `classify_xbz_category`
- `clean_old_audit_logs`
- `clean_old_rate_limits`
- `cleanup_discount_test_data`
- `cleanup_expired_auth_sessions`
- `cleanup_expired_collection_trash`
- `cleanup_expired_edge_rate_limits`
- `cleanup_expired_favorite_trash`
- `cleanup_expired_novelties`
- `cleanup_expired_public_comparisons`
- `cleanup_expired_step_up`
- `cleanup_expired_step_up_tokens`
- `cleanup_expired_webhook_request_nonces`
- `cleanup_old_login_attempts`
- `cleanup_old_logs`
- `cleanup_old_notifications`
- `cleanup_orphan_step_up_artifacts`
- `cleanup_rate_limits`
- `cleanup_security_logs`
- `cleanup_stale_webhook_locks`
- `cleanup_user_search_history`
- `cleanup_webhook_logs`
- `complete_optimization`
- `confirm_notifications_dispatched`
- `consume_step_up_token`
- `create_mockup_credit_account`
- `create_organization_with_owner`
- `create_quote_version`
- `cron_invoke_edge`
- `detect_geo_violations`
- `dispatch_quote_webhook_event`
- `e2e_cleanup_check_rate_limit`
- `enforce_created_by_owner`
- `enforce_password_reset_rate_limit`
- `enforce_seller_cart_ready_requires_items`
- `enforce_seller_id_owner`
- `enforce_user_id_owner`
- `enqueue_optimization`
- `execute_role_migration_batch`
- `expire_stale_password_reset_requests`
- `fill_integration_credential_metadata`
- `fn_admin_sync_external_connections`
- `fn_aggregate_stock_daily`
- `fn_ai_quota_summary`
- `fn_alert_dispatcher_failures`
- `fn_alert_products_without_images`
- `fn_alert_supplier_settings_incomplete`
- `fn_analyze_dictionaries`
- `fn_anon_access_audit`
- `fn_anon_catalog_grant_audit_run`
- `fn_anon_insert_rate_guard`
- `fn_apply_auto_tag_rules`
- `fn_apply_crm_callback`
- `fn_apply_print_profiles`
- `fn_apply_supplier_flag_tags`
- `fn_approve_product_deactivation`
- `fn_asia_complete_image_upload`
- `fn_asia_complete_image_upload_batch`
- `fn_asia_dispatch_queue_batch`
- `fn_asia_enqueue_primary_url_images`
- `fn_asia_enqueue_videos`
- `fn_asia_find_not_found`
- `fn_asia_fix_multi_main_images`
- `fn_asia_harvest_queue_batch`
- `fn_asia_import_youtube_videos`
- `fn_asia_ingest_all_pages`
- `fn_asia_legacy_dispatch_batch`
- `fn_asia_legacy_harvest_batch`
- `fn_asia_legacy_run_cycle`
- `fn_asia_link_video`
- `fn_asia_mark_upload_error`
- `fn_asia_monitor_variants`
- `fn_asia_populate_image_queue`
- `fn_asia_recover_stale_queue`
- `fn_asia_run_image_cycle`
- `fn_asia_site_promote_to_gold`
- `fn_asia_stock_fast_sync`
- `fn_assert_public_contract`
- `fn_audit_and_fix_grants`
- `fn_audit_discount_approval`
- `fn_audit_gravacao_changes`
- `fn_audit_row_change`
- `fn_auto_assign_org_on_profile`
- `fn_auto_revoke_secdef_public_execute`
- `fn_auto_similarity_groups_v2`
- `fn_auto_similarity_groups_v3`
- `fn_autolink_canonical_on_content_hash`
- `fn_autopromote_primary_on_deactivation`
- `fn_backfill_all_product_tags`
- `fn_backfill_asia_properties`
- `fn_backfill_is_thermal`
- `fn_backfill_queue_reap_stuck`
- `fn_batch_update_cart_item_sort_order`
- `fn_block_unauthorized_product_deactivation`
- `fn_bronze_mark_absent`
- `fn_bulk_request_deactivation`
- `fn_bulk_update_image_dimensions`
- `fn_capture_connection_snapshot`
- `fn_capture_schema_baseline`
- `fn_capture_stock_snapshot`
- `fn_capture_supplier_promise`
- `fn_cascade_deactivate_vss`
- `fn_cascade_product_deactivation`
- `fn_categories_default_organization`
- `fn_cf_collect_sm_legacy_dispatch`
- `fn_cf_collect_sm_legacy_harvest`
- `fn_cf_recon_collect`
- `fn_cf_recon_dispatch`
- `fn_cf_sm_legacy_insert_batch`
- `fn_check_dead_letters`
- `fn_check_login_allowed`
- `fn_check_preco_minimo_faixa`
- `fn_check_rowtype_staleness`
- `fn_check_schema_signature_drift`
- `fn_claim_ai_description_batch`
- `fn_cleanup_ai_queue_on_product_deactivate`
- `fn_cleanup_log_tables`
- `fn_cleanup_webhook_dispatcher_log`
- `fn_color_link_all_suppliers`
- `fn_complete_ai_description`
- `fn_compute_and_record_drift`
- `fn_cron_safe_run`
- `fn_cron_watchdog`
- `fn_dar_enforce_seller_id`
- `fn_decompose_kit_from_ficha`
- `fn_deferred_dar_quote_integrity`
- `fn_deferred_quote_discount_integrity`
- `fn_dequeue_ai_enrichment`
- `fn_derive_similarity_pairs_on_insert`
- `fn_detect_recurring_errors_last_hour`
- `fn_dryrun_raw_v2`
- `fn_dryrun_standardize_supplier`
- `fn_ema_kpi_by_level`
- `fn_enqueue_ai_enrichment`
- `fn_enqueue_products_for_ai_description`
- `fn_enrich_asia_components_batch`
- `fn_enrich_kits_daily`
- `fn_enrich_pen_categories`
- `fn_enrich_properties_batch`
- `fn_ensure_history_partitions`
- `fn_ensure_seller_discount_limit`
- `fn_expire_novelties`
- `fn_expire_novelties_with_stats`
- `fn_expire_overdue_quotes`
- `fn_expire_pending_promises`
- `fn_extract_dimensions_from_text`
- `fn_extract_item_dims_xbz_from_bronze`
- `fn_extract_kit_dims_from_somarcas_bronze`
- `fn_extract_kit_dims_from_spot_bronze`
- `fn_extract_kit_dims_from_xbz_bronze`
- `fn_extract_notebook_feature_codes`
- `fn_extract_pkg_dims_from_bronze`
- `fn_favorite_items_assign_position`
- `fn_favorite_items_no_archived_list`
- `fn_favorite_items_soft_delete`
- `fn_favorite_lists_assign_position`
- `fn_fetch_xbz_ficha`
- `fn_generate_market_insights_cache`
- `fn_generate_trends_insights`
- `fn_get_all_leaf_categories`
- `fn_get_asia_api_key`
- `fn_get_asia_product_dims_for_kit`
- `fn_get_asia_secret_key`
- `fn_get_cf_account_id`
- `fn_get_cf_api_token`
- `fn_get_cf_credentials`
- `fn_get_color_swatches_batch`
- `fn_get_conversion_funnel`
- `fn_get_customization_price`
- `fn_get_discontinued_products`
- `fn_get_discontinued_stats`
- `fn_get_image_upload_queue`
- `fn_get_low_stock_alerts`
- `fn_get_navigation_patterns`
- `fn_get_novelty_alerts`
- `fn_get_product_ai_context`
- `fn_get_product_customization_options`
- `fn_get_product_intelligence_all`
- `fn_get_recent_restocks`
- `fn_get_replenishment_stats`
- `fn_get_reposicao_listing`
- `fn_get_reposicao_metrics`
- `fn_get_reposicao_variants_summary`
- `fn_get_repressed_demand`
- `fn_get_similar_products`
- `fn_get_sm_session_cookie`
- `fn_get_spot_access_key`
- `fn_get_spot_feb2026_ids`
- `fn_get_stock_notification_counts`
- `fn_get_stockout_alerts`
- `fn_global_search`
- `fn_grant_default_role_on_profile`
- `fn_handle_canonical_root_soft_delete`
- `fn_handle_image_restoration`
- `fn_handle_new_user`
- `fn_health_check_gravacao`
- `fn_ingest_asia_api_batch`
- `fn_ingest_asia_hg_batch`
- `fn_ingest_asia_hg_batch_debug`
- `fn_ingest_asia_hg_debug_sample`
- `fn_ingest_bronze_batch`
- `fn_ingest_colors_batch`
- `fn_ingest_customization_options_batch`
- `fn_ingestion_health`
- `fn_ingestion_run_close`
- `fn_ingestion_run_open`
- `fn_is_bulk_import_mode`
- `fn_is_graphic_material`
- `fn_kcvs_guard_not_sellable`
- `fn_kit_auto_approve_high_confidence`
- `fn_kit_auto_promote_approved`
- `fn_kit_from_ficha`
- `fn_kit_material_quick_propagate`
- `fn_kit_sync_personalization_notes`
- `fn_link_asia_colors_from_bronze`
- `fn_link_cf_image`
- `fn_link_sm_colors_from_title`
- `fn_list_deactivation_requests`
- `fn_log_search_analytics`
- `fn_magazine_public_token`
- `fn_match_canonical_color`
- `fn_notebook_specs_health`
- `fn_notify_champions_on_quote_status`
- `fn_notify_discount_approval_requested`
- `fn_notify_user`
- `fn_padvar_sync`
- `fn_parse_binding_color_code`
- `fn_parse_binding_type_code`
- `fn_parse_cover_material_code`
- `fn_parse_cover_type_code`
- `fn_parse_ficha_tecnica_text`
- `fn_parse_kit_page_dimensions`
- `fn_parse_paper_color_code`
- `fn_parse_paper_format`
- `fn_parse_paper_ruling`
- `fn_parse_paper_weight`
- `fn_parse_sheet_count`
- `fn_parse_xbz_ficha_site_batch`
- `fn_pbd_project_intelligence_settings`
- `fn_pgrst_reload`
- `fn_pipeline_health`
- `fn_pipeline_health_monitor`
- `fn_pipeline_promote_tick`
- `fn_pkc_freeze_slot`
- `fn_pkc_guard_not_sellable`
- `fn_pn_set_updated_at`
- `fn_pn_sync_products_is_new`
- `fn_populate_all_products_seo`
- `fn_populate_novelties_from_supplier`
- `fn_prevent_canonical_chain`
- `fn_process_all_kit_component_enrichments`
- `fn_process_asia_stock_pending`
- `fn_process_raw_v2`
- `fn_process_webhook_outbox_batch`
- `fn_product_active_for_rls`
- `fn_product_images_health_check`
- `fn_products_quality_dashboard`
- `fn_promote_customization_to_gold`
- `fn_promote_kit_component_padronizacao`
- `fn_promote_kit_ficha_staging`
- `fn_promote_notebook_specs`
- `fn_promote_padronizacao`
- `fn_purge_expired_restock_dates`
- `fn_purge_old_stock_snapshots`
- `fn_purge_spr_history`
- `fn_qa_alert_on_activate_without_image`
- `fn_qa_check_image_coverage`
- `fn_qa_scan_imageless_products`
- `fn_qip_propagate_to_quote_items`
- `fn_quote_children_enforce_parent_immutability`
- `fn_quotes_enforce_immutability`
- `fn_quotes_recalc_subtotal_from_items`
- `fn_quotes_validate_discount`
- `fn_reactivate_valid_novelties`
- `fn_rebuild_category_ancestors`
- `fn_rebuild_color_swatches`
- `fn_recalc_has_optional_packaging`
- `fn_reconcile_category_products_count`
- `fn_reconcile_stock_gold`
- `fn_refresh_kit_component_variant_skus`
- `fn_refresh_supplier_sync_timestamps`
- `fn_reject_product_deactivation`
- `fn_remove_similarity_pairs_on_delete`
- `fn_repair_canonical_chains`
- `fn_reposicao_backfill_today`
- `fn_request_product_deactivation`
- `fn_reset_is_shared_on_canonical_null`
- `fn_resolve_supplier`
- `fn_resolve_supplier_arrivals`
- `fn_resync_all_category_counts`
- `fn_resync_product_image_urls`
- `fn_resync_product_media`
- `fn_resync_product_physical_all`
- `fn_revoke_truncate_public`
- `fn_revoke_view_write_grants_on_create`
- `fn_rpc_exists`
- `fn_run_and_persist_smoke_tests`
- `fn_run_pipeline_health_check`
- `fn_run_schema_drift_check`
- `fn_rupture_anomalia_report`
- `fn_rupture_by_level`
- `fn_rupture_health_check`
- `fn_rupture_quick_stats`
- `fn_sanitize_product_image_urls`
- `fn_save_ai_enrichment_results`
- `fn_set_updated_at`
- `fn_should_apply_kill_switch`
- `fn_site_pipeline_health`
- `fn_site_promote_to_gold`
- `fn_sm_category_collect`
- `fn_sm_category_enqueue`
- `fn_sm_category_seed`
- `fn_sm_enqueue_videos`
- `fn_sm_link_video`
- `fn_sm_pipeline_health`
- `fn_sm_populate_colors`
- `fn_sm_populate_videos_from_site`
- `fn_sm_promote_videos_from_site`
- `fn_sm_session_check`
- `fn_sm_site_collect`
- `fn_sm_site_enqueue`
- `fn_sm_site_tick`
- `fn_sm_stock_guard`
- `fn_sm_to_silver`
- `fn_sm_url_discover_collect`
- `fn_sm_url_discover_via_search`
- `fn_sm_url_map_build`
- `fn_sm_url_map_from_site_urls`
- `fn_sm_variant_coherence_guard`
- `fn_smoke_tests_categorization`
- `fn_snapshot_medallion_coverage`
- `fn_spot_color_integrity_check`
- `fn_spot_customization_prices_to_gold`
- `fn_spot_detect_new_images`
- `fn_spot_direct_prices_gold`
- `fn_spot_direct_stock_gold`
- `fn_spot_enqueue_new_videos`
- `fn_spot_enqueue_vimeo_eu`
- `fn_spot_enrich_image_colors`
- `fn_spot_eu_diff_get_refs`
- `fn_spot_fix_materials`
- `fn_spot_gold_enrich`
- `fn_spot_health_check`
- `fn_spot_link_video`
- `fn_spot_print_positions`
- `fn_spot_process_batch`
- `fn_spot_process_ref`
- `fn_spot_reconcile_variant_to_legacy`
- `fn_spot_relink_family_images`
- `fn_spot_silver_enrich`
- `fn_spot_stock_fast_sync`
- `fn_spot_variant_repl_enrich`
- `fn_spot_vimeo_daily_sync`
- `fn_spr_requeue_failed`
- `fn_sre_set_updated_at`
- `fn_standardize_kit_component`
- `fn_standardize_supplier`
- `fn_super_filtro`
- `fn_super_filtro_opcoes`
- `fn_super_filtro_price_range`
- `fn_super_filtro_product_ids`
- `fn_sync_ai_usage_logs_total_tokens`
- `fn_sync_all_is_new`
- `fn_sync_asia_colors`
- `fn_sync_backfill_queue_on_pi_fill`
- `fn_sync_category_image_url_on_slug_change`
- `fn_sync_derived_product_flags`
- `fn_sync_dispatcher_log_from_net`
- `fn_sync_dynamic_collections`
- `fn_sync_is_new_expires_at`
- `fn_sync_is_stockout_all`
- `fn_sync_local_drift_to_schema_drift_log`
- `fn_sync_main_category_from_pca`
- `fn_sync_novelty_to_product`
- `fn_sync_pat_on_product_status_change`
- `fn_sync_product_ai_on_change`
- `fn_sync_product_deactivation_to_similarity`
- `fn_sync_product_fiscal_on_change`
- `fn_sync_product_images_on_product_deactivate`
- `fn_sync_product_images_to_products`
- `fn_sync_product_materials_to_jsonb`
- `fn_sync_product_novelties`
- `fn_sync_product_physical_from_products`
- `fn_sync_product_seo_on_change`
- `fn_sync_product_stock_cache`
- `fn_sync_product_supply_on_change`
- `fn_sync_product_variants_next_entry`
- `fn_sync_product_view_count`
- `fn_sync_products_videos_cache`
- `fn_sync_profile_role_from_user_roles`
- `fn_sync_search_analytics_seller_id`
- `fn_sync_set_image_url`
- `fn_sync_sku_promo`
- `fn_sync_stock_bronze_to_gold`
- `fn_sync_stock_bronze_to_gold_spot`
- `fn_sync_workspace_notifications_search_vector`
- `fn_tag_product_complete`
- `fn_toggle_group_similarity_pairs`
- `fn_trg_compat_sync_optional`
- `fn_trg_sync_category_assignment`
- `fn_trg_sync_physical_on_product_update`
- `fn_trigger_fill_supplier_subtype`
- `fn_trigger_product_automation`
- `fn_trigger_rebuild_swatches_on_image`
- `fn_trigger_rebuild_swatches_on_variant`
- `fn_trigger_schema_drift_fetch`
- `fn_update_all_seo_scores`
- `fn_update_image_dimensions`
- `fn_update_supplier_last_sync`
- `fn_upsert_asia_wp_batch`
- `fn_upsert_stock_to_bronze`
- `fn_upsert_stocks_bulk_spot`
- `fn_vacuum_high_dead_tuples`
- `fn_validate_member_supplier`
- `fn_verify_anon_catalog_grants`
- `fn_video_link`
- `fn_video_link_to_products`
- `fn_video_queue_old_uid`
- `fn_video_queue_recover_stuck`
- `fn_video_retry_errors`
- `fn_video_set_dimensions`
- `fn_video_sim_export`
- `fn_video_sim_upsert`
- `fn_xbz_dispatch_image_batch`
- `fn_xbz_enqueue_videos`
- `fn_xbz_enrich_stock_batch`
- `fn_xbz_ficha_run_batch`
- `fn_xbz_harvest_image_batch`
- `fn_xbz_link_images_to_colors`
- `fn_xbz_link_video`
- `fn_xbz_populate_images_from_site`
- `fn_xbz_populate_videos_from_site`
- `fn_xbz_recover_stale`
- `fn_xbz_resolver_cor_secundaria`
- `fn_xbz_run_image_cycle`
- `fn_xbz_site_enqueue`
- `fn_xbz_stock_fast_sync`
- `fn_xbz_stock_fast_sync_v2`
- `fn_xbz_stock_fast_sync_v3`
- `force_logout_all_users`
- `generate_order_number`
- `generate_quote_number`
- `generate_secure_token`
- `get_active_novelties`
- `get_app_health_summary`
- `get_auto_test_job_status`
- `get_bundle_suggestions`
- `get_catalog_bestseller_page`
- `get_client_seasonality`
- `get_client_top_products`
- `get_collections_weekly_count`
- `get_color_filters`
- `get_connection_failure_window_minutes`
- `get_connections_auto_test_interval`
- `get_edge_anon_key`
- `get_edge_function_secret`
- `get_edge_functions_base_url`
- `get_edge_invoke_summary`
- `get_favorite_list_counts`
- `get_favorites_weekly_count`
- `get_industry_benchmark_stats`
- `get_industry_seasonality`
- `get_industry_top_products`
- `get_inventory_health`
- `get_novelties_stats`
- `get_platform_failure_metrics`
- `get_profile_and_roles`
- `get_promo_sales_90d_by_product`
- `get_promo_sales_ranking`
- `get_public_schema_signatures`
- `get_quote_token_by_value`
- `get_quote_token_public`
- `get_sitemap_public`
- `get_supplier_reliability_history`
- `get_top_collected_products`
- `get_top_compared_products`
- `get_top_favorited_products`
- `get_unread_count`
- `get_user_org_ids`
- `get_user_role`
- `get_vault_secret`
- `guard_mcp_api_keys_writes`
- `handle_new_user`
- `handle_password_reset_request`
- `has_org_role`
- `has_role`
- `http_request`
- `increment_kit_template_usage`
- `increment_row_version`
- `increment_webhook_dedupe_hit`
- `increment_webhook_stats`
- `invalidate_used_approval_token`
- `is_admin`
- `is_admin_or_above`
- `is_admin_strict`
- `is_coord_or_above`
- `is_dev`
- `is_dnd_active`
- `is_kit_collaborator`
- `is_kit_owner`
- `is_manager_or_admin`
- `is_org_admin`
- `is_org_member`
- `is_org_owner_or_admin`
- `is_seller_only`
- `limit_recently_viewed_items`
- `log_access_denied`
- `log_full_scope_grant`
- `log_mcp_key_changes`
- `log_mcp_key_revocation`
- `log_mockup_prompt_change`
- `log_rls_denial`
- `log_user_logout`
- `lookup_request_id`
- `magazine_add_items_atomic`
- `magazine_add_items_v2`
- `magazine_archive_v2`
- `magazine_auto_archive_stale_drafts`
- `magazine_cleanup_all`
- `magazine_cleanup_orphan_state`
- `magazine_cleanup_view_events`
- `magazine_create_v2`
- `magazine_duplicate_atomic`
- `magazine_duplicate_v2`
- `magazine_ensure_view_event_partitions`
- `magazine_guard_and_version_v2`
- `magazine_import_local_v2`
- `magazine_items_guard_v2`
- `magazine_lock_v2`
- `magazine_publish_atomic`
- `magazine_publish_v2`
- `magazine_reactivate_v2`
- `magazine_remove_items_atomic`
- `magazine_remove_items_v2`
- `magazine_reorder_items_atomic`
- `magazine_reorder_items_v2`
- `magazine_restore_v2`
- `magazine_rollup_view_counts`
- `magazine_soft_delete_v2`
- `magazine_unpublish_v2`
- `magazine_update_item_v2`
- `magazine_update_metadata_atomic`
- `magazine_update_metadata_v2`
- `magazine_validate_page_order_v2`
- `maintain_webhook_metrics`
- `mark_all_notifications_read`
- `mark_notification_read`
- `mark_step_up_password_verified`
- `mcp_audit_actor`
- `mcp_kv_get`
- `mcp_kv_set`
- `mcp_kv_try_lock`
- `move_collection_item_to_trash`
- `move_favorite_to_trash`
- `move_favorites_to_trash`
- `notify_discount_approval_request`
- `notify_hardening_regression`
- `notify_new_order`
- `notify_quote_client_response`
- `notify_quote_status_change`
- `org_has_any_members`
- `ownership_check_orphans`
- `permanent_delete_record`
- `prevent_non_admin_quote_item_price_change`
- `prevent_profile_role_change`
- `prevent_role_self_update`
- `process_notifications_queue`
- `process_spot_products`
- `process_supplier_product`
- `process_supplier_products_batch`
- `purge_edge_invocations_old`
- `purge_expired_security_data`
- `purge_favorite_trash_old`
- `purge_old_audit_logs`
- `purge_old_crm_callback_events`
- `reconcile_cf_image_status`
- `record_dev_route_telemetry`
- `record_mcp_access_violation`
- `record_platform_failure`
- `record_public_token_failure`
- `record_schema_drift_result`
- `refresh_all_materialized_views`
- `registrar_entrada_estoque`
- `registrar_saida_estoque`
- `release_webhook_delivery_lock`
- `repair_ownership_orphans`
- `request_discount_approval_transactional`
- `request_step_up_challenge`
- `reset_mockup_credit_limits`
- `respond_discount_approval_transactional`
- `restore_collection_item_from_trash`
- `restore_favorite_from_trash`
- `restore_record`
- `restore_seller_cart`
- `retry_failed_webhook_deliveries`
- `revoke_all_user_tokens`
- `rpc_enrich_kit_component`
- `search_products_semantic`
- `search_records_rerank`
- `seed_discount_test_users`
- `send_digest_notification`
- `set_connection_failure_window_minutes`
- `set_connections_auto_test_interval`
- `set_quote_sent_at`
- `sincronizar_estoque_spot`
- `snapshot_hardening_status`
- `soft_delete_record`
- `start_step_up_challenge`
- `submit_quote_response`
- `sync_external_connections_from_credentials`
- `sync_quote_discount_approval`
- `sync_user_org_to_org_members`
- `tg_ip_access_control_set_updated_at`
- `tg_order_items_set_updated_at`
- `tg_reader_state_validate`
- `trg_auto_revoke_mcp_on_role_loss`
- `trg_fn_update_tag_usage_count`
- `trg_sync_external_connections`
- `trg_user_roles_sync_profile_role`
- `trim_connection_test_history`
- `update_company_fields`
- `update_preferred_suppliers`
- `validate_discount_approval_status`
- `validate_edge_functions_base_url`
- `validate_ip_access_control`
- `validate_mcp_key`
- `validate_scheduled_report_email`
- `validate_secret_rotation_action_type`
- `validate_status_fields`
- `vault_delete_secret`
- `vault_get_secret`
- `vault_list_secret_names`
- `vault_set_secret`
- `verify_step_up_otp`
- `verify_step_up_password`
- `zapp_catalog_stats`

## Edge functions públicas (sem JWT — qualquer um chama)

- `crm-db-bridge`
- `ai-recommendations`
- `external-db-inspect`
- `image-proxy`
- `webhook-dispatcher`
- `webhook-inbound`
- `mcp-server`
- `connections-auto-test`
- `e2e-cleanup`
- `get-visitor-info`
- `cleanup-notifications`
- `cleanup-novelties`
- `collections-watcher`
- `comparison-price-watcher`
- `connections-health-check`
- `favorites-watcher`
- `ownership-audit`
- `process-queue`
- `process-scheduled-reports`
- `quote-followup-reminders`
- `send-digest`
- `send-notification`
- `send-scheduled-reports`
- `sync-external-db`
- `log-login-attempt`
- `check-login`
- `asia-ingestion`
- `backfill-image-dimensions`
- `receive-crm-callback`
- `crm-callback-reprocess`
- `crm-callback-alerts`
- `magazine-public-view`
- `magazine-public-react`
- `magazine-reader-state-read`
- `magazine-reader-state-write`
- `magazine-import-local`

## Rotas protegidas no front

| Rota | Guard | Roles | Arquivo |
|---|---|---|---|
| /app | ProtectedRoute |  | `scripts/ai-context/gerar.unit.mjs` |

Guards usados: AdminRoute, Protected, ProtectedRoute

Middleware matcher (Next.js): nenhum

## Grants / Revokes (agrupados por role e privilégio)

| Ação | Para/De | Privilégios | Objetos |
|---|---|---|---|
| grant | PUBLIC | execute | `claim_webhook_delivery`, `release_webhook_delivery_lock`, `cleanup_stale_webhook_locks`, `fn_cron_guard`, `cleanup_expired_auth_sessions` |
| grant | anon | execute | `get_quote_token_by_value`, `submit_quote_response`, `fn_should_apply_kill_switch`, `fn_log_search_analytics`, `is_org_owner_or_admin`, `is_org_owner_or_admin`, `mcp_kv_get`, `mcp_kv_set`, `mcp_kv_try_lock`, `fn_get_reposicao_listing`, `fn_get_reposicao_metrics`, `fn_get_replenishment_stats`, `fn_xbz_enqueue_videos`, `get_favorite_list_counts`, `get_favorite_list_counts` … +54 |
| grant | anon | insert | `kill_switch_hits` |
| grant | anon | insert, update, delete, references, trigger | `external_connections` |
| grant | anon | select | `system_kill_switches`, `products`, `products`, `products`, `public`, `somarcas_catalogo_publico`, `somarcas_catalogo_publico`, `analytics.mv_product_compositions`, `discount_approval_requests`, `discount_approval_requests`, `category_icons`, `discount_approval_requests`, `workspace_notifications`, `discount_approval_requests`, `workspace_notifications` … +70 |
| grant | anon | select, insert, update | `magazine_reader_state` |
| grant | anon | select, insert, update, delete, references, trigger | `mockup_approval_links` |
| grant | anon, authenticated | execute | `check_login_rate_limit`, `get_public_schema_signatures`, `get_catalog_bestseller_page`, `get_catalog_bestseller_ids`, `get_catalog_bestseller_page`, `fn_get_product_intelligence_all`, `fn_get_all_leaf_categories`, `get_catalog_bestseller_page`, `get_promo_sales_ranking`, `get_catalog_bestseller_page`, `get_catalog_bestseller_page`, `fn_get_reposicao_listing`, `get_catalog_bestseller_page`, `get_promo_sales_90d_by_product`, `fn_get_similar_products` |
| grant | anon, authenticated | insert | `password_reset_requests` |
| grant | anon, authenticated | select | `v_products_public`, `v_products_public`, `v_suppliers_public`, `system_settings`, `video_sim_results`, `product_novelties`, `v_product_active_badge`, `v_product_active_badge`, `v_product_active_badge`, `v_products_public`, `v_catalog_stats`, `mv_product_leaf_category`, `mv_product_leaf_category`, `v_catalog_stats`, `category_ancestors` … +19 |
| grant | anon, authenticated | usage, select | `kill_switch_hits_id_seq` |
| grant | anon, authenticated, service_role | execute | `claim_webhook_delivery`, `release_webhook_delivery_lock`, `cleanup_stale_webhook_locks`, `fn_video_set_dimensions`, `fn_video_queue_old_uid`, `fn_video_queue_recover_stuck`, `fn_video_sim_export`, `fn_video_sim_upsert`, `fn_super_filtro_product_ids`, `fn_super_filtro_product_ids`, `fn_ema_kpi_by_level`, `fn_ema_kpi_by_level`, `fn_ema_kpi_by_level`, `fn_super_filtro_product_ids`, `get_sitemap_public` … +1 |
| grant | anon, authenticated, service_role | select | `system_kill_switches`, `vw_product_novelties_active`, `vw_novelties_home_highlights`, `vw_novelties_home_highlights`, `v_variant_sale_prices_public`, `v_products_min_price`, `v_print_area_techniques_public`, `v_product_properties_public`, `v_product_compositions_public`, `v_kit_component_media_public`, `v_tags_public`, `v_product_tags_public`, `v_personalization_techniques_public`, `v_color_nuances_public`, `v_kit_component_print_areas_public` … +5 |
| grant | anon, service_role | execute | `fn_dequeue_ai_enrichment`, `fn_save_ai_enrichment_results`, `fn_enqueue_ai_enrichment`, `fn_enqueue_ai_enrichment`, `fn_dequeue_ai_enrichment`, `fn_dequeue_ai_enrichment`, `fn_save_ai_enrichment_results`, `fn_dequeue_ai_enrichment` |
| grant | anon, service_role | select | `vw_ai_enrichment_status` |
| grant | authenticated | all | `user_preferences` |
| grant | authenticated | execute | `seed_discount_test_users`, `cleanup_discount_test_data`, `get_bundle_suggestions`, `get_client_top_products`, `get_industry_top_products`, `get_industry_benchmark_stats`, `get_web_vitals_summary`, `check_hardening_status`, `get_top_favorited_products`, `get_favorites_weekly_count`, `set_connections_auto_test_interval`, `get_connections_auto_test_interval`, `set_connection_failure_window_minutes`, `get_connection_failure_window_minutes`, `get_auto_test_job_status` … +126 |
| grant | authenticated | insert | `kill_switch_hits`, `system_error_logs`, `navigation_analytics`, `navigation_analytics`, `navigation_analytics`, `frontend_telemetry` |
| grant | authenticated | insert, update, delete | `collection_products` |
| grant | authenticated | select | `quotes_inbound`, `webhook_inbound_dedupe`, `webhook_inbound_log`, `crm_callback_events`, `user_token_revocations`, `collection_products`, `system_kill_switches`, `v_kill_switch_hits_summary`, `v_kill_switch_hits_summary`, `smoke_tests_runs`, `v_smoke_tests_latest_run`, `v_smoke_tests_trend`, `v_smoke_tests_latest_run`, `v_smoke_tests_trend`, `system_error_logs` … +62 |
| grant | authenticated | select, delete | `kill_switch_hits` |
| grant | authenticated | select, insert | `access_blocked_log`, `smoke_test_runs`, `admin_audit_log`, `admin_audit_log`, `catalog_analytics`, `audit_log`, `kit_quote_requests` |
| grant | authenticated | select, insert, update | `visual_search_feedback` |
| grant | authenticated | select, insert, update, delete | `magazine_reader_state`, `magazines`, `magazine_items`, `magazine_templates`, `user_2fa_settings`, `bitrix_clients`, `personalization_simulations`, `roles`, `ip_whitelist`, `city_whitelist`, `user_allowed_ips`, `companies`, `sales_goals`, `product_group_components`, `product_group_locations` … +10 |
| grant | authenticated | usage, select | `smoke_tests_runs_id_seq` |
| grant | authenticated, anon | execute | `search_products_semantic`, `can_view_audit_logs`, `can_view_telemetry`, `can_view_connections`, `can_manage_connections`, `fn_get_product_customization_options`, `fn_get_product_customization_options`, `fn_get_product_customization_options`, `fn_get_product_customization_options` |
| grant | authenticated, anon | select | `archive.color_analysis_staging`, `archive.import_staging_images`, `archive.scraper_images_staging`, `archive.sm_images_staging`, `archive.xbz_gallery_staging`, `color_analysis_staging`, `import_staging_images`, `scraper_images_staging`, `sm_images_staging`, `xbz_gallery_staging`, `analytics.mv_product_intelligence`, `mv_product_intelligence`, `analytics.mv_product_intelligence`, `mv_product_intelligence`, `analytics.mv_product_intelligence` … +4 |
| grant | authenticated, anon, service_role | select | `archive.v_import_staging_by_product`, `archive.v_import_staging_progress` |
| grant | authenticated, service_role | all | `user_roles`, `order_items`, `admin_audit_log` |
| grant | authenticated, service_role | execute | `fn_get_reposicao_variants_summary`, `get_web_vitals_regression`, `audit_ownership_orphans`, `audit_rls_coverage`, `audit_rls_matrix`, `audit_security_definer_acl`, `can_access_quote`, `audit_security_definer_acl`, `public`, `fn_pipeline_health`, `is_supervisor_or_above`, `is_admin`, `is_admin`, `is_dev`, `is_admin_strict` … +54 |
| grant | authenticated, service_role | select | `vw_system_health_quick`, `vw_system_health_quick`, `mv_supplier_reliability`, `mv_supplier_reliability`, `mv_stock_velocity` |
| grant | authenticated, service_role | select, insert | `admin_audit_log` |
| grant | authenticated, service_role | select, insert, update, delete | `user_roles`, `order_items` |
| grant | postgres | all | `system_kill_switches`, `archive`, `archive` |
| grant | postgres | execute | `get_edge_function_secret`, `fn_run_and_persist_smoke_tests`, `get_edge_functions_base_url`, `fn_standardize_supplier`, `fn_apply_print_profiles`, `get_edge_function_secret`, `get_edge_function_secret`, `fn_dryrun_standardize_supplier`, `fn_dryrun_standardize_supplier` |
| grant | postgres WITH GRANT OPTION | select, insert, update, delete, references, trigger, truncate | `v_products_public` |
| grant | postgres, service_role | execute | `retry_failed_webhook_deliveries`, `cleanup_webhook_logs`, `auto_revoke_orphan_full_keys`, `fn_trigger_sync_descendants_count`, `prevent_category_loops`, `fn_rebuild_category_ancestors`, `fn_trigger_sync_category_ancestors`, `fn_reconcile_category_products_count` |
| grant | postgres, service_role | select | `vault.decrypted_secrets`, `vault.secrets` |
| grant | postgres, service_role, authenticated | execute | `fn_categories_health_check` |
| grant | service_role | all | `quotes_inbound`, `webhook_inbound_dedupe`, `webhook_inbound_log`, `crm_callback_events`, `magazine_reader_state`, `magazines`, `magazine_items`, `magazine_templates`, `user_roles`, `order_items`, `admin_audit_log`, `admin_audit_log`, `visual_search_feedback`, `system_error_logs`, `public` … +52 |
| grant | service_role | all privileges | `cf_recon.cf_image`, `cf_recon.cf_ghost_check_queue`, `cf_recon.action_log`, `cf_recon.crawl_run`, `cf_recon.metric_snapshot`, `cf_recon.remediation` |
| grant | service_role | execute | `increment_webhook_dedupe_hit`, `claim_webhook_delivery`, `release_webhook_delivery_lock`, `cleanup_stale_webhook_locks`, `get_edge_invoke_summary`, `purge_expired_step_up_artifacts`, `record_public_token_failure`, `public`, `get_edge_function_secret`, `get_edge_function_secret`, `check_edge_rate_limit`, `cleanup_expired_edge_rate_limits`, `record_schema_drift_result`, `fn_trigger_schema_drift_fetch`, `fn_compute_and_record_drift` … +181 |
| grant | service_role | select | `slow_queries_view`, `v_ai_function_routing_effective`, `v_ai_function_routing_effective`, `archive`, `v_product_images_quality_gap`, `v_product_images_quality_gap`, `mv_product_images_audit`, `v_product_images_quality_gap`, `vw_image_type_dropblockers`, `mv_product_images_audit`, `v_cf_drift_dashboard`, `v_cf_drift_dashboard`, `v_cf_drift_dashboard`, `v_ai_function_routing_effective`, `mv_stock_rupture_alert` |
| grant | service_role | select, insert, delete | `webhook_request_nonces` |
| grant | service_role | select, insert, update | `image_backfill_queue`, `e2e_cleanup_audit` |
| grant | service_role | select, insert, update, delete | `product_novelties`, `_cf_images_audit`, `_img_divergence_audit`, `cf_recon.cf_image`, `cf_recon.cf_ghost_check_queue`, `cf_recon.action_log`, `cf_recon.crawl_run`, `cf_recon.metric_snapshot`, `cf_recon.remediation`, `ai_insights_cache`, `ai_usage_logs`, `products`, `product_sync_logs` |
| grant | service_role | select, insert, update, delete, references, trigger, truncate | `v_products_public` |
| grant | service_role, authenticated | execute | `record_mcp_access_violation`, `fn_sm_pipeline_health`, `fn_expire_novelties`, `fn_check_schema_signature_drift` |
| grant | service_role, postgres | execute | `increment_webhook_stats` |
| revoke | PUBLIC | all | `get_edge_invoke_summary`, `_can_act_on_behalf_of_others`, `_get_user_primary_role`, `acquire_ai_quota`, `apply_transform`, `assert_quote_discount_integrity`, `audit_mcp_api_keys_changes`, `audit_mcp_key_insert`, `audit_mcp_key_revoke`, `audit_ownership_orphans`, `audit_rls_coverage`, `audit_rls_matrix`, `audit_security_definer_acl`, `audit_user_role_changes`, `auto_block_extreme_offenders` … +2550 |
| revoke | PUBLIC | execute | `fn_magazine_public_token`, `public`, `can_access_quote`, `org_has_any_members`, `org_has_any_members`, `get_edge_function_secret`, `create_organization_with_owner`, `get_quote_token_by_value`, `submit_quote_response`, `get_public_schema_signatures`, `public`, `check_webhook_dedup`, `process_notifications_queue`, `process_notifications_queue`, `process_notifications_queue` … +42 |
| revoke | PUBLIC | insert, update, delete, truncate, trigger, references | `anon_catalog_grant_audit_log`, `anon_catalog_grant_audit_log` |
| revoke | PUBLIC | select | `vw_product_availability`, `extensions.pg_stat_statements`, `extensions.pg_stat_statements_info` |
| revoke | PUBLIC, anon | all | `fn_get_reposicao_variants_summary`, `check_hardening_status`, `record_mcp_access_violation`, `fn_reconcile_stock_gold`, `fn_pipeline_health`, `fn_generate_market_insights_cache`, `request_discount_approval_transactional`, `respond_discount_approval_transactional`, `request_discount_approval_transactional`, `request_discount_approval_transactional`, `create_quote_with_discount_approval_transactional`, `update_quote_with_discount_approval_transactional`, `request_discount_approval_transactional`, `request_discount_approval_transactional`, `magazine_add_items_atomic` … +15 |
| revoke | PUBLIC, anon | execute | `cleanup_rate_limits`, `acquire_ai_quota`, `complete_optimization`, `reset_optimization_queue`, `is_org_member`, `start_step_up_challenge`, `verify_step_up_password`, `fn_handle_canonical_root_soft_delete`, `fn_reset_is_shared_on_canonical_null`, `fn_auto_revoke_secdef_public_execute`, `fn_revoke_view_write_grants_on_create`, `get_supplier_reliability_history`, `get_supplier_reliability_history`, `fn_run_smoke_tests`, `fn_run_smoke_tests` … +19 |
| revoke | PUBLIC, anon, authenticated | all | `increment_webhook_dedupe_hit`, `purge_expired_step_up_artifacts`, `cleanup_security_logs`, `check_mcp_abuse_threshold`, `vault.decrypted_secrets`, `vault.secrets`, `increment_webhook_stats`, `fn_spot_direct_stock_gold`, `fn_spot_direct_prices_gold`, `fn_ingest_asia_api_batch`, `fn_ingest_asia_hg_batch`, `fn_sync_asia_colors`, `fn_parity_standardize_variant`, `fn_purge_spr_history`, `fn_expire_novelties` … +33 |
| revoke | PUBLIC, anon, authenticated | execute | `check_seller_cart_limit`, `handle_password_reset_request`, `check_auth_config_status`, `refresh_product_popularity`, `audit_rls_coverage`, `audit_security_definer_acl`, `fn_pipeline_health`, `fn_product_images_health_check`, `fn_run_schema_drift_check`, `fn_trigger_schema_drift_fetch`, `fn_compute_and_record_drift`, `fn_snapshot_medallion_coverage`, `fn_deploy_readiness_check`, `fn_check_coverage_regression`, `refresh_product_popularity` … +192 |
| revoke | PUBLIC, anon, authenticated, service_role | all | `magazine_add_items_atomic`, `magazine_remove_items_atomic`, `magazine_reorder_items_atomic`, `magazine_duplicate_atomic`, `magazine_update_metadata_atomic`, `magazine_publish_atomic`, `magazine_validate_page_order_v2`, `magazine_page_order_remove_items_v2`, `magazine_guard_and_version_v2`, `magazine_items_guard_v2`, `magazine_lock_v2` |
| revoke | PUBLIC,anon | all | `magazine_create_v2`, `magazine_update_metadata_v2`, `magazine_add_items_v2`, `magazine_remove_items_v2`, `magazine_reorder_items_v2`, `magazine_update_item_v2`, `magazine_publish_v2`, `magazine_unpublish_v2`, `magazine_archive_v2`, `magazine_reactivate_v2`, `magazine_soft_delete_v2`, `magazine_restore_v2`, `magazine_duplicate_v2`, `magazine_import_local_v2` |
| revoke | anon | all | `get_edge_invoke_summary`, `get_webhook_delivery_summary`, `get_app_health_summary`, `lookup_request_id`, `collection_products`, `user_2fa_settings`, `bitrix_clients`, `personalization_simulations`, `roles`, `ip_whitelist`, `city_whitelist`, `access_blocked_log`, `user_allowed_ips`, `companies`, `sales_goals` … +67 |
| revoke | anon | all privileges | `image_backfill_queue`, `product_deactivation_requests`, `supplier_replenishment_events`, `product_deactivation_requests`, `supplier_replenishment_events`, `db_connection_snapshots`, `profiles`, `user_roles`, `ip_access_control`, `outbound_webhooks`, `mockup_approval_links` |
| revoke | anon | delete, insert, update, trigger, references | `anon_catalog_grant_audit_log` |
| revoke | anon | delete, trigger, truncate | `supplier_products_raw` |
| revoke | anon | delete, update, trigger, references | `frontend_telemetry`, `frontend_telemetry` |
| revoke | anon | execute | `fn_magazine_public_token`, `public`, `can_access_quote`, `org_has_any_members`, `org_has_any_members`, `create_organization_with_owner`, `get_quote_token_by_value`, `public`, `fn_purge_spr_history`, `fn_process_raw_v2`, `fn_dryrun_raw_v2`, `fn_purge_spr_history`, `reconcile_cf_image_status`, `fn_get_reposicao_listing`, `fn_get_replenishment_stats` … +24 |
| revoke | anon | insert, update, delete | `workspace_notifications`, `workspace_notifications`, `product_badge_definitions` |
| revoke | anon | insert, update, delete, references, trigger | `external_connections` |
| revoke | anon | insert, update, delete, truncate | `products` |
| revoke | anon | insert, update, delete, truncate, references, trigger | `system_kill_switches` |
| revoke | anon | insert, update, delete, truncate, trigger, references, select | `suppliers` |
| revoke | anon | insert, update, references | `supplier_products_raw`, `supplier_products_raw`, `import_staging_images`, `color_analysis_staging`, `xbz_gallery_staging`, `scraper_images_staging`, `sm_images_staging`, `_asia_api_staging` |
| revoke | anon | select | `v_kill_switch_hits_summary`, `v_smoke_tests_latest_run`, `v_smoke_tests_trend`, `v_smoke_tests_latest_run`, `v_smoke_tests_trend`, `products`, `products`, `products`, `products`, `_asia_api_staging`, `_backup_produtos_padronizacao_20260604`, `ai_function_routing`, `ai_provider_quotas`, `ai_providers`, `ai_routing_decisions` … +71 |
| revoke | anon, PUBLIC | execute | `fn_rupture_quick_stats`, `fn_ema_kpi_by_level`, `fn_rupture_anomalia_report`, `fn_rupture_by_level`, `fn_rupture_health_check` |
| revoke | anon, authenticated | all | `slow_queries_view`, `get_edge_function_secret`, `webhook_request_nonces`, `get_edge_functions_base_url`, `mcp_sessions`, `supplier_customization_raw`, `fn_resync_product_media`, `fn_resync_product_media`, `fn_resync_product_media`, `fn_resync_product_media`, `mv_product_images_audit`, `v_product_images_quality_gap`, `vw_image_type_dropblockers`, `mv_product_images_audit`, `mcp_kv` … +28 |
| revoke | anon, authenticated | all privileges | `_cf_images_audit`, `_img_divergence_audit`, `cf_recon.cf_image`, `cf_recon.cf_ghost_check_queue`, `cf_recon.action_log`, `cf_recon.crawl_run`, `cf_recon.metric_snapshot`, `cf_recon.remediation`, `archive`, `archive`, `archive`, `backup`, `backup`, `archive`, `backup` … +2 |
| revoke | anon, authenticated | execute | `cleanup_expired_webhook_request_nonces`, `get_public_schema_signatures`, `upsert_supplier_stock_raw`, `upsert_supplier_customization_raw`, `fn_autolink_canonical_on_content_hash`, `reconcile_cf_image_status`, `fn_handle_canonical_root_soft_delete`, `fn_prevent_canonical_chain`, `fn_autolink_canonical_on_content_hash`, `fn_relink_former_deps_on_root_becomes_dep`, `fn_product_images_health_check`, `fn_autolink_canonical_on_content_hash`, `fn_autolink_canonical_on_content_hash`, `fn_autolink_canonical_on_content_hash`, `fn_repair_canonical_chains` … +21 |
| revoke | anon, authenticated | insert, update, delete, references, trigger | `v_catalog_stats` |
| revoke | anon, authenticated | insert, update, delete, truncate | `category_ancestors`, `mv_stock_rupture_alert` |
| revoke | anon, authenticated | select | `vw_stock_quantity_outliers`, `vw_orphan_active_variants`, `v_cf_drift_dashboard`, `vw_stock_quantity_outliers`, `vw_orphan_active_variants`, `v_cf_drift_dashboard` |
| revoke | anon, authenticated | select, insert, update, delete | `_backup_stock_daily_summary_20260618`, `_bkp_kit_dims_20260619`, `_bkp_orphan_active_variants_20260619`, `cron_job_timeout_map`, `cron_watchdog_log` |
| revoke | anon, authenticated, PUBLIC | execute | `cleanup_expired_webhook_request_nonces`, `expire_stale_password_reset_requests`, `fn_favorite_items_no_archived_list`, `fn_favorite_items_assign_position`, `fn_favorite_items_assign_position` |
| revoke | anon, authenticated, public | insert, update, delete | `v_products_public`, `v_products_public` |
| revoke | authenticated | all | `get_edge_invoke_summary`, `fn_standardize_supplier`, `fn_apply_print_profiles`, `fn_resync_product_media`, `v_product_images_quality_gap`, `fn_resync_product_media`, `v_product_images_quality_gap`, `get_edge_function_secret`, `get_edge_function_secret`, `product_popularity_30d`, `fn_check_dead_letters`, `enforce_seller_cart_ready_requires_items`, `v_site_products_public`, `fn_dryrun_standardize_supplier`, `fn_dryrun_standardize_supplier` |
| revoke | authenticated | all privileges | `image_backfill_queue` |
| revoke | authenticated | delete | `admin_settings`, `admin_settings`, `frontend_telemetry` |
| revoke | authenticated | delete, insert, update, trigger, references | `anon_catalog_grant_audit_log` |
| revoke | authenticated | delete, trigger, truncate | `supplier_products_raw` |
| revoke | authenticated | delete, truncate, trigger, references, insert, update | `supplier_products_raw` |
| revoke | authenticated | execute | `fn_magazine_public_token`, `get_quote_token_by_value`, `submit_quote_response`, `public`, `fn_purge_spr_history`, `fn_process_raw_v2`, `fn_dryrun_raw_v2`, `fn_purge_spr_history`, `process_pending_batches`, `reconcile_cf_image_status`, `get_edge_anon_key`, `fn_ensure_seller_discount_limit`, `fn_process_raw_v2`, `fn_sm_to_silver`, `process_supplier_product` … +16 |
| revoke | authenticated | insert, update, delete | `admin_audit_log`, `mcp_api_keys`, `secret_rotation_log`, `login_attempts`, `ai_usage_logs` |
| revoke | authenticated | insert, update, delete, references, trigger | `discount_approval_audit` |
| revoke | authenticated | insert, update, delete, truncate, references | `supplier_products_raw_history` |
| revoke | authenticated | insert, update, delete, truncate, references, trigger | `system_kill_switches`, `produtos_padronizacao`, `product_physical`, `supplier_price_tiers` |
| revoke | authenticated | insert, update, references | `supplier_products_raw`, `supplier_products_raw` |
| revoke | authenticated | references | `frontend_telemetry` |
| revoke | authenticated | references, trigger | `seller_discount_limits`, `quotes`, `quote_approval_tokens`, `quote_items`, `quote_versions`, `quote_drafts`, `quote_item_personalizations`, `quote_comments`, `quote_templates`, `discount_approval_requests`, `product_variants` |
| revoke | authenticated | select | `suppliers`, `image_backfill_queue`, `v_cf_drift_dashboard`, `suppliers`, `v_kill_switch_hits_summary` |
| revoke | authenticated | trigger | `frontend_telemetry` |
| revoke | authenticated | update | `frontend_telemetry` |
| revoke | authenticated | update, delete, references, trigger | `quote_history` |
| revoke | authenticated, PUBLIC | execute | `fn_stage_variant`, `fn_stage_product`, `fn_process_staged_product`, `fn_process_all_staged_products` |
| revoke | authenticated, anon | all | `e2e_cleanup_check_rate_limit` |
| revoke | authenticated, anon | select | `mv_stock_rupture_alert`, `mv_ema_kpi_by_level` |
| revoke | public | all | `seed_discount_test_users`, `cleanup_discount_test_data`, `search_products_semantic`, `audit_rls_coverage`, `audit_rls_matrix`, `fn_video_set_dimensions`, `fn_video_queue_old_uid`, `fn_video_queue_recover_stuck`, `fn_video_sim_export`, `fn_video_sim_upsert`, `mcp_kv_get`, `mcp_kv_set`, `v_site_products_public` |
| revoke | public | execute | `public` |
| revoke | public, anon | all | `execute_role_migration_batch`, `mcp_kv_try_lock`, `zapp_catalog_stats` |
| revoke | public, anon | execute | `is_admin`, `is_admin`, `is_admin_strict`, `can_view_all_sales`, `can_manage_quotes`, `revoke_all_user_tokens`, `is_seller_only`, `can_view_audit_logs`, `is_manager_or_admin` |
| revoke | public, anon, authenticated | all | `record_public_token_failure`, `fn_get_spot_access_key`, `fn_resolve_supplier`, `fn_ingest_bronze_batch`, `fn_bronze_mark_absent`, `fn_ingestion_run_open`, `fn_ingestion_run_close`, `fn_ingestion_health`, `fn_upsert_stock_to_bronze`, `fn_sync_stock_bronze_to_gold`, `fn_upsert_asia_wp_batch`, `fn_upsert_asia_wp_batch`, `fn_ingest_customization_options_batch`, `fn_asia_wp_to_canonical`, `fn_upsert_asia_wp_batch` … +9 |
| revoke | public, anon, authenticated | execute | `audit_rls_matrix`, `cleanup_expired_collection_trash`, `sync_external_connections_from_credentials`, `cron_invoke_edge`, `get_platform_failure_metrics`, `repair_ownership_orphans`, `revoke_all_user_tokens`, `sync_external_connections_from_credentials` |

## Riscos de acesso detectados

| Tabela | Problema | Arquivos |
|---|---|---|
| `audit_log` | front faz SELECT mas nenhuma política RLS permite SELECT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useAuditLog.ts` |
| `bitrix_deals` | RLS ligado sem nenhuma política → só service_role acessa |  |
| `collection_items` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| `collection_items` | front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| `collection_items` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| `collection_items` | front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| `collections` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| `collections` | front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/components/collections/ShareCollectionDialog.tsx`<br>`recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| `collections` | front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useCollections.ts`<br>`src/hooks/collections/useCollections.ts` |
| `e2e_cleanup_rate_limit` | RLS ligado sem nenhuma política → só service_role acessa |  |
| `edge_function_invocations` | RLS ligado sem nenhuma política → só service_role acessa |  |
| `expert_conversations` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useExpertConversations.tsx`<br>`src/hooks/intelligence/useExpertConversations.tsx` |
| `expert_messages` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useExpertConversations.tsx`<br>`src/hooks/intelligence/useExpertConversations.tsx` |
| `external_connections_sync_log` | RLS ligado sem nenhuma política → só service_role acessa | `src/components/admin/connections/ExternalConnectionsSyncLogPanel.tsx`<br>`src/components/admin/connections/LastSyncRunPanel.tsx` |
| `file_scan_logs` | RLS ligado sem nenhuma política → só service_role acessa | `src/components/admin/security/SecureUploadManager.tsx` |
| `geo_allowed_countries` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useGeoBlocking.ts` |
| `geo_allowed_countries` | front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useGeoBlocking.ts` |
| `geo_allowed_countries` | front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useGeoBlocking.ts` |
| `integration_credentials` | RLS ligado sem nenhuma política → só service_role acessa |  |
| `magic_up_generations` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useMagicUpGeneration.ts`<br>`recovery/src-legacy/src/hooks/useMagicUpState.ts`<br>`src/components/search/useGlobalSearch.ts`<br>`src/hooks/intelligence/useMagicUpGeneration.ts`<br>… +1 |
| `mockup_drafts` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useMockupDraft.ts`<br>`src/hooks/mockup/useMockupDraft.ts` |
| `product_materials` | RLS ligado sem nenhuma política → só service_role acessa |  |
| `product_price_freshness_overrides` | front faz SELECT mas nenhuma política RLS permite SELECT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useProductFreshnessOverride.ts`<br>`src/hooks/products/useProductFreshnessOverride.ts` |
| `role_migration_batches` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useRoleMigration.ts` |
| `role_migration_items` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useRoleMigration.ts` |
| `security_settings` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useGeoBlocking.ts` |
| `seller_cart_items` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useSellerCarts.ts`<br>`src/hooks/products/useSellerCarts.helpers.ts`<br>`src/hooks/products/useSellerCarts.ts` |
| `seller_carts` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/hooks/useSellerCarts.ts`<br>`src/hooks/products/useSellerCarts.helpers.ts`<br>`src/hooks/products/useSellerCarts.ts` |
| `supplier_products_raw` | RLS ligado sem nenhuma política → só service_role acessa |  |
| `tabela_preco_gravacao_oficial` | RLS ligado sem nenhuma política → só service_role acessa | `src/lib/external-db/rpc-native.ts` |
| `user_comparisons` | RLS ligado sem nenhuma política → só service_role acessa | `recovery/src-legacy/src/components/compare/ShareComparisonDialog.tsx`<br>`recovery/src-legacy/src/hooks/useComparisonSync.ts`<br>`src/hooks/comparison/useComparisonSync.ts` |
| `user_onboarding` | front faz SELECT mas nenhuma política RLS permite SELECT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useOnboarding.ts`<br>`src/hooks/ui/useOnboarding.ts` |
| `user_onboarding` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useOnboarding.ts`<br>`src/hooks/ui/useOnboarding.ts` |
| `user_onboarding` | front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `recovery/src-legacy/src/hooks/useOnboarding.ts`<br>`src/hooks/ui/useOnboarding.ts` |

## Multi-tenancy

- Chave de tenant: **`organization_id`** presente em 30 tabela(s): `quotes`, `magazines`, `material_groups`, `material_types`, `product_materials`, `magazine_templates`, `order_items`, `orders`, `organization_members`, `variant_supplier_sources`, `ai_enrichment_queue`, `attribute_definitions`, `attribute_equivalences`, `attribute_groups`, `auto_tag_rules`, `b2b_collections`, `category_relationships`, `color_equivalences`, `commemorative_dates`, `markup_configurations`, `material_variations`, `ncm_codes`, `product_ai_history`, `product_deactivation_requests`, `product_videos`, `variation_types`, `variation_values`, `user_organizations`, `_deprecated_silver_products_20260606`, `product_specifications`
- Cobertura: 6% das tabelas. Abaixo de 60% — isolamento provavelmente por usuário (auth.uid()) ou misto; não flagado por tabela.

## Soft delete (registros 'apagados' continuam na tabela — filtre!)

| Tabela | Coluna |
|---|---|
| `categories` | `is_active` |
| `categories` | `deleted_at` |
| `categories` | `active` |
| `products` | `is_active` |
| `products` | `is_deleted` |
| `magazines` | `archived_at` |
| `magazines` | `deleted_at` |
| `material_groups` | `is_active` |
| `material_types` | `is_active` |
| `product_materials` | `is_active` |
| `category_icons` | `is_active` |
| `collection_items_trash` | `deleted_at` |
| `favorite_items_trash` | `deleted_at` |
| `geo_allowed_countries` | `is_active` |
| `inbound_webhook_endpoints` | `is_active` |
| `kit_templates` | `is_active` |
| `mockup_prompt_configs` | `is_active` |
| `outbound_webhooks` | `active` |
| `product_component_locations` | `is_active` |
| `product_components` | `is_active` |
| `product_groups` | `is_active` |
| `profiles` | `is_active` |
| `scheduled_reports` | `is_active` |
| `suppliers` | `is_active` |
| `suppliers` | `deleted_at` |
| `product_variants` | `is_active` |
| `variant_supplier_sources` | `is_active` |
| `variant_supplier_sources` | `removed_at` |
| `prod_audit.classification_rules` | `active` |
| `ai_function_routing` | `is_active` |
| `ai_models` | `is_active` |
| `ai_providers` | `is_active` |
| `attribute_definitions` | `is_active` |
| `attribute_equivalences` | `is_active` |
| `attribute_groups` | `is_active` |
| `auto_tag_rules` | `is_active` |
| `binding_colors` | `is_active` |
| `binding_types` | `is_active` |
| `category_accessory_categories` | `is_active` |
| `category_colors` | `is_active` |
| `category_commemorative_dates` | `is_active` |
| `category_copywriting_config` | `is_active` |
| `category_target_audiences` | `is_active` |
| `category_variation_types` | `is_active` |
| `city_whitelist` | `is_active` |
| `classify_functions_registry` | `is_active` |
| `color_equivalences` | `is_active` |
| `color_groups` | `is_active` |
| `color_nuances` | `is_active` |
| `color_variations` | `is_active` |
| `commemorative_dates` | `is_active` |
| `content_articles` | `is_deleted` |
| `cover_finishes` | `is_active` |
| `cover_materials` | `is_active` |
| `cover_types` | `is_active` |
| `eco_material_config` | `is_active` |
| `feminine_color_config` | `is_active` |
| `image_types` | `is_active` |
| `included_packaging_print_areas` | `active` |
| `included_packaging_techniques` | `active` |
| `ip_whitelist` | `is_active` |
| `kit_component_types` | `is_active` |
| `markup_configurations` | `is_active` |
| `material_variations` | `is_active` |
| `mockup_approval_links` | `is_active` |
| `ncm_codes` | `is_active` |
| `notebook_features` | `is_active` |
| `packaging_types` | `active` |
| `packagings` | `active` |
| `paper_colors` | `is_active` |
| `paper_formats` | `is_active` |
| `paper_rulings` | `is_active` |
| `paper_weights` | `is_active` |
| `personalization_techniques` | `is_active` |
| `print_area_techniques` | `is_active` |
| `product_attributes` | `is_active` |
| `product_commemorative_dates` | `is_active` |
| `product_component_location_techniques` | `is_active` |
| `product_faqs` | `is_active` |
| `product_group_components` | `is_active` |
| `product_group_location_techniques` | `is_active` |
| `product_group_locations` | `is_active` |
| `product_included_packagings` | `active` |
| `product_novelties` | `is_active` |
| `product_packaging_compatibility` | `active` |
| `product_packagings` | `active` |
| `product_relationships` | `is_active` |
| `product_similarity_groups` | `is_active` |
| `product_target_audiences` | `is_active` |
| `product_videos` | `is_active` |
| `produtos_padronizacao` | `is_active` |
| `produtos_padronizacao_variantes` | `is_active` |
| `produtos_site_padronizacao` | `is_active` |
| `property_definitions` | `active` |
| `push_subscriptions` | `is_active` |
| `ramo_atividade` | `ativo` |
| `ramo_atividade_filho` | `ativo` |
| `seo_redirects` | `is_active` |
| `variation_types` | `is_active` |
| `variation_values` | `is_active` |
| `video_types` | `is_active` |
| `supplier_stricker.customization_options` | `is_active` |
| `supplier_stricker.customization_tables` | `is_active` |
| `supplier_stricker.optionals` | `is_active` |
| `supplier_stricker.product_types` | `is_active` |
| `supplier_stricker.products` | `is_active` |
| `user_allowed_ips` | `is_active` |
| `user_ip_allowlist` | `is_active` |
| `user_sessions` | `is_active` |
| `achievements` | `is_active` |
| `rewards` | `is_active` |
| `personalization_locations` | `is_active` |
| `personalization_sizes` | `is_active` |
| `store_rewards` | `is_active` |
| `user_rewards` | `is_active` |
| `company_contacts` | `is_active` |
| `_deprecated_silver_products_20260606` | `is_active` |
| `_deprecated_silver_products_20260606` | `is_deleted` |
| `_deprecated_silver_variants_20260606` | `is_active` |
| `_deprecated_silver_print_areas_20260606` | `is_active` |
| `_deprecated_silver_images_queue_20260606` | `is_active` |
| `product_specifications` | `is_active` |
| `stock_notes` | `deleted_at` |
| `webhook_configs` | `is_active` |

## Auditoria (colunas de rastreio)

| Tabela | Colunas |
|---|---|
| `optimization_queue` | `created_at`, `created_by`, `updated_at` |
| `quotes` | `created_by` |
| `categories` | `created_at`, `updated_at` |
| `product_category_assignments` | `created_at` |
| `magazines` | `created_at`, `updated_at` |
| `custom_kits` | `created_at`, `updated_at` |
| `material_groups` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `material_types` | `created_at`, `updated_at` |
| `product_materials` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `quotes_inbound` | `updated_at` |
| `crm_callback_events` | `created_at`, `updated_at` |
| `magazine_items` | `created_at`, `updated_at` |
| `magazine_reader_state` | `created_at`, `updated_at` |
| `magazine_templates` | `created_at`, `updated_at` |
| `access_security_settings` | `updated_at`, `updated_by` |
| `admin_audit_log` | `created_at` |
| `admin_audit_log_y2025m12` | `created_at` |
| `admin_audit_log_y2026m01` | `created_at` |
| `admin_audit_log_y2026m02` | `created_at` |
| `admin_audit_log_y2026m03` | `created_at` |
| `admin_audit_log_y2026m04` | `created_at` |
| `admin_audit_log_y2026m05` | `created_at` |
| `admin_audit_log_y2026m06` | `created_at` |
| `admin_settings` | `created_at`, `updated_at`, `updated_by` |
| `ai_usage_events` | `created_at` |
| `ai_usage_logs` | `created_at`, `updated_at` |
| `ai_usage_quotas` | `created_at`, `updated_at` |
| `app_vitals` | `created_at` |
| `art_file_attachments` | `created_at`, `updated_at` |
| `audit_logs` | `created_at` |
| `auth_login_attempts` | `created_at` |
| `bot_detection_log` | `created_at` |
| `cart_templates` | `created_at`, `updated_at` |
| `category_icons` | `created_at`, `updated_at` |
| `collection_item_reactions` | `created_at` |
| `collection_items` | `created_at` |
| `collections` | `created_at`, `updated_at` |
| `comparison_reactions` | `created_at` |
| `component_media` | `created_at`, `updated_at` |
| `connection_test_history` | `created_at` |
| `conversation_delivery_status` | `updated_at` |
| `conversation_event_history` | `created_at` |
| `e2e_cleanup_audit` | `created_at` |
| `e2e_cleanup_rate_limit` | `updated_at` |
| `expert_conversations` | `created_at`, `updated_at` |
| `expert_messages` | `created_at` |
| `external_connections` | `created_at`, `created_by`, `updated_at` |
| `external_connections_sync_log` | `created_at` |
| `favorite_items` | `updated_at` |
| `favorite_lists` | `created_at`, `updated_at` |
| `file_scan_logs` | `created_at` |
| `follow_up_reminders` | `created_at` |
| `generated_mockups` | `created_at` |
| `geo_allowed_countries` | `created_at`, `created_by` |
| `hardening_health_snapshots` | `created_at` |
| `integration_credentials` | `created_at`, `updated_at`, `updated_by` |
| `ip_access_control` | `created_at`, `created_by`, `updated_at` |
| `kit_collaborators` | `created_at`, `updated_at` |
| `kit_comments` | `created_at`, `updated_at` |
| `kit_templates` | `created_at`, `created_by`, `updated_at` |
| `kit_variants` | `created_at`, `updated_at` |
| `login_attempts` | `created_at` |
| `magic_up_brand_kits` | `created_at`, `updated_at` |
| `magic_up_campaigns` | `created_at`, `updated_at` |
| `magic_up_comments` | `created_at` |
| `magic_up_generations` | `created_at` |
| `magic_up_public_shares` | `created_at`, `updated_at` |
| `magic_up_reactions` | `created_at` |
| `mcp_access_violations` | `created_at` |
| `mcp_api_keys` | `created_at`, `created_by`, `updated_at` |
| `mcp_key_auto_revocations` | `created_at`, `created_by` |
| `mockup_drafts` | `created_at`, `updated_at` |
| `mockup_prompt_configs` | `created_at`, `updated_at` |
| `mockup_templates` | `created_at`, `updated_at` |
| `optimization_queue_runs` | `created_at` |
| `order_item_personalizations` | `created_at`, `updated_at` |
| `order_items` | `created_at` |
| `orders` | `created_at`, `updated_at` |
| `ownership_repair_logs` | `created_at` |
| `permissions` | `created_at`, `updated_at` |
| `product_component_locations` | `created_at`, `updated_at` |
| `product_components` | `created_at`, `updated_at` |
| `product_group_members` | `created_at`, `updated_at` |
| `product_groups` | `created_at`, `updated_at` |
| `product_price_freshness_overrides` | `created_at`, `updated_at`, `updated_by` |
| `product_sync_logs` | `created_at` |
| `product_views` | `created_at` |
| `profiles` | `created_at`, `updated_at` |
| `query_telemetry` | `created_at` |
| `quote_templates` | `created_at`, `updated_at` |
| `request_rate_limits` | `created_at`, `updated_at` |
| `rls_denial_log` | `created_at` |
| `role_migration_batches` | `created_at` |
| `role_migration_items` | `created_at` |
| `role_permissions` | `created_at` |
| `saved_filters` | `created_at`, `updated_at` |
| `saved_trends_views` | `created_at`, `updated_at` |
| `scheduled_reports` | `created_at`, `updated_at` |
| `search_analytics` | `created_at` |
| `seller_cart_items` | `created_at`, `updated_at` |
| `seller_carts` | `created_at`, `updated_at` |
| `simulator_wizard_drafts` | `created_at`, `updated_at` |
| `step_up_audit_log` | `created_at` |
| `step_up_challenges` | `created_at` |
| `step_up_tokens` | `created_at` |
| `system_settings` | `updated_at`, `updated_by` |
| `user_comparisons` | `created_at`, `updated_at` |
| `user_onboarding` | `created_at`, `updated_at` |
| `user_preferences` | `created_at`, `updated_at` |
| `user_search_history` | `created_at`, `updated_at` |
| `video_variant_links` | `created_at` |
| `voice_command_logs` | `created_at` |
| `workspace_notifications` | `created_at` |
| `suppliers` | `created_at`, `updated_at` |
| `product_variants` | `created_at`, `updated_at` |
| `stock_daily_summary` | `created_at` |
| `variant_supplier_sources` | `updated_at` |
| `cf_recon.remediation` | `created_at` |
| `prod_audit.category_suggestions` | `created_at` |
| `prod_audit.classification_rules` | `created_at` |
| `_backup_stock_daily_summary_20260618` | `created_at` |
| `_qa_pct_results` | `created_at` |
| `access_blocked_log` | `created_at` |
| `ai_enrichment_queue` | `created_at`, `updated_at` |
| `ai_function_routing` | `created_at`, `updated_at`, `updated_by` |
| `dashboard_insights_cache` | `created_at` |
| `ai_models` | `created_at`, `updated_at` |
| `ai_providers` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `ai_routing_decisions` | `created_at` |
| `analytics_events` | `created_at`, `updated_at` |
| `asia_image_import_queue` | `created_at`, `updated_at` |
| `asia_upload_mapping` | `created_at` |
| `attribute_definitions` | `created_at`, `updated_at` |
| `attribute_equivalences` | `created_at`, `updated_at` |
| `attribute_groups` | `created_at`, `updated_at` |
| `audit_log` | `created_at` |
| `auto_tag_rules` | `created_at`, `updated_at` |
| `b2b_collections` | `created_at`, `created_by`, `updated_at` |
| `binding_colors` | `created_at`, `updated_at` |
| `binding_types` | `created_at`, `updated_at` |
| `catalog_analytics` | `created_at` |
| `category_accessory_categories` | `created_at`, `updated_at` |
| `category_attributes` | `created_at`, `updated_at` |
| `category_colors` | `created_at`, `updated_at` |
| `category_commemorative_dates` | `created_at`, `updated_at` |
| `category_copywriting_config` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `category_relationships` | `created_at` |
| `category_target_audiences` | `created_at`, `updated_at` |
| `category_variation_types` | `created_at`, `updated_at` |
| `city_whitelist` | `created_at`, `updated_at` |
| `classify_functions_registry` | `created_at`, `updated_at` |
| `collection_products` | `created_at` |
| `color_equivalences` | `created_at`, `updated_at` |
| `color_groups` | `created_at`, `updated_at` |
| `color_nuances` | `created_at`, `updated_at` |
| `color_synonym_map` | `created_at` |
| `color_variations` | `created_at`, `updated_at` |
| `commemorative_date_colors` | `created_at` |
| `commemorative_date_exclusions` | `created_at` |
| `commemorative_dates` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `companies` | `created_at`, `updated_at` |
| `company_email_patterns` | `created_at`, `updated_at` |
| `content_articles` | `created_at`, `updated_at` |
| `cover_finishes` | `created_at`, `updated_at` |
| `cover_materials` | `created_at`, `updated_at` |
| `cover_types` | `created_at`, `updated_at` |
| `device_login_notifications` | `created_at` |
| `discount_approval_audit` | `created_at` |
| `eco_material_config` | `created_at` |
| `edge_rate_limits` | `created_at`, `updated_at` |
| `enriched_contacts` | `created_at`, `created_by`, `updated_at` |
| `enrichment_log` | `created_at` |
| `feminine_color_config` | `created_at` |
| `frontend_telemetry` | `created_at` |
| `image_backfill_queue` | `created_at` |
| `image_types` | `created_at`, `updated_at` |
| `import_pipeline_steps` | `created_at`, `updated_at` |
| `included_packaging_print_areas` | `created_at`, `updated_at` |
| `included_packaging_techniques` | `created_at`, `updated_at` |
| `ingestion_run_log` | `created_at` |
| `ip_whitelist` | `created_at`, `updated_at` |
| `kit_component_enrichment_raw` | `created_at`, `updated_at` |
| `kit_component_ficha_staging` | `created_at` |
| `kit_component_padronizacao` | `created_at`, `updated_at` |
| `kit_component_types` | `created_at`, `updated_at` |
| `kit_component_variant_skus` | `created_at`, `updated_at` |
| `kit_quote_requests` | `created_at` |
| `kit_save_requests` | `created_at` |
| `kit_typical_dims` | `created_at` |
| `magazine_duplicate_requests` | `created_at` |
| `magazine_public_reactions` | `created_at` |
| `markup_configurations` | `created_at`, `created_by`, `updated_at` |
| `material_equivalences` | `created_at`, `updated_at` |
| `material_variations` | `created_at`, `updated_at` |
| `mcp_kv` | `updated_at` |
| `mcp_sessions` | `atualizado_em`, `updated_at` |
| `mockup_approval_links` | `created_at`, `updated_at` |
| `mockup_credit_transactions` | `created_at` |
| `mockup_credits` | `created_at`, `updated_at` |
| `mockup_generation_jobs` | `created_at`, `updated_at` |
| `supplier_replenishment_events` | `created_at`, `updated_at` |
| `navigation_analytics` | `created_at` |
| `ncm_codes` | `created_at`, `updated_at` |
| `notebook_features` | `created_at`, `updated_at` |
| `notification_preferences` | `created_at`, `updated_at` |
| `notification_templates` | `created_at` |
| `notifications` | `created_at`, `updated_at` |
| `packaging_compatibility_config` | `created_at` |
| `packaging_types` | `created_at`, `updated_at` |
| `packagings` | `created_at`, `updated_at` |
| `paper_colors` | `created_at`, `updated_at` |
| `paper_formats` | `created_at`, `updated_at` |
| `paper_rulings` | `created_at`, `updated_at` |
| `paper_weights` | `created_at`, `updated_at` |
| `personalization_simulations` | `created_at`, `updated_at` |
| `personalization_technique_mappings` | `created_at`, `updated_at` |
| `personalization_techniques` | `created_at`, `updated_at` |
| `pipeline_control` | `updated_at` |
| `pipeline_known_issues` | `created_at`, `updated_at` |
| `print_area_techniques` | `created_at`, `updated_at` |
| `product_ai_content` | `created_at`, `updated_at` |
| `product_ai_history` | `created_at` |
| `product_attributes` | `created_at`, `updated_at` |
| `product_badge_definitions` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `product_commemorative_dates` | `created_at`, `updated_at` |
| `product_component_location_techniques` | `created_at`, `updated_at` |
| `product_customization_prices` | `created_at`, `updated_at` |
| `product_deactivation_requests` | `created_at`, `updated_at` |
| `product_faqs` | `created_at`, `created_by`, `updated_at` |
| `product_fiscal` | `created_at`, `updated_at` |
| `product_group_components` | `created_at`, `updated_at` |
| `product_group_location_techniques` | `created_at`, `updated_at` |
| `product_group_locations` | `created_at`, `updated_at` |
| `product_included_packagings` | `created_at`, `updated_at` |
| `product_notebook_features` | `created_at`, `updated_at` |
| `product_notebook_specs` | `created_at`, `updated_at` |
| `product_novelties` | `created_at`, `created_by`, `updated_at` |
| `product_packaging_compatibility` | `created_at`, `updated_at` |
| `product_packagings` | `created_at`, `updated_at` |
| `product_physical` | `created_at`, `updated_at` |
| `product_print_positions` | `created_at`, `updated_at` |
| `product_properties` | `created_at`, `updated_at` |
| `product_qa_image_alerts` | `created_at` |
| `product_relationships` | `created_at` |
| `product_search_logs` | `created_at` |
| `product_similarity_group_members` | `created_at` |
| `product_similarity_groups` | `created_at`, `updated_at` |
| `product_supply` | `created_at`, `updated_at` |
| `product_tags` | `created_at` |
| `product_target_audiences` | `created_at`, `updated_at` |
| `product_videos` | `created_at`, `updated_at` |
| `produto_ramo_atividade` | `created_at` |
| `produtos_padronizacao` | `created_at`, `updated_at` |
| `produtos_padronizacao_variantes` | `created_at`, `updated_at` |
| `produtos_site_padronizacao` | `created_at`, `updated_at` |
| `property_definitions` | `created_at`, `updated_at` |
| `push_subscriptions` | `created_at` |
| `quote_versions` | `created_at`, `created_by` |
| `ramo_atividade` | `created_at`, `updated_at` |
| `ramo_atividade_filho` | `created_at`, `updated_at` |
| `roles` | `created_at` |
| `sales_goals` | `created_at`, `updated_at` |
| `search_queries` | `created_at` |
| `security_settings` | `updated_at`, `updated_by` |
| `seo_redirects` | `created_at`, `created_by` |
| `sm_category_pages` | `created_at`, `updated_at` |
| `sm_site_url_map` | `created_at`, `updated_at` |
| `sm_worker_partitions` | `created_at` |
| `supplier_products_raw` | `created_at`, `updated_at` |
| `variant_commemorative_dates` | `created_at`, `created_by` |
| `webhook_dispatcher_log` | `created_at` |
| `variation_types` | `created_at`, `updated_at` |
| `variation_values` | `created_at`, `updated_at` |
| `video_import_queue` | `created_at`, `updated_at` |
| `video_types` | `created_at`, `updated_at` |
| `visual_search_feedback` | `created_at` |
| `webhook_outbox` | `created_at`, `updated_at` |
| `webhook_request_nonces` | `created_at` |
| `xbz_upload_mapping` | `created_at` |
| `supplier_stricker.canceled_products` | `created_at` |
| `supplier_stricker.category_mappings` | `created_at`, `updated_at` |
| `supplier_stricker.colors` | `created_at`, `updated_at` |
| `supplier_stricker.customization_options` | `created_at`, `updated_at` |
| `supplier_stricker.customization_tables` | `created_at`, `updated_at` |
| `supplier_stricker.optionals` | `created_at`, `updated_at` |
| `supplier_stricker.product_types` | `created_at`, `updated_at` |
| `supplier_stricker.products` | `created_at`, `updated_at` |
| `supplier_stricker.stg_colors` | `created_at` |
| `supplier_stricker.stg_customizations` | `created_at` |
| `supplier_stricker.stg_images` | `created_at` |
| `supplier_stricker.stg_optionals` | `created_at`, `updated_at` |
| `supplier_stricker.stg_product_types` | `created_at` |
| `supplier_stricker.stg_products` | `created_at`, `updated_at` |
| `supplier_stricker.stg_stock` | `created_at`, `updated_at` |
| `supplier_stricker.stocks` | `created_at`, `updated_at` |
| `supplier_customization_raw` | `created_at`, `updated_at` |
| `supplier_subtype_category_map` | `created_at`, `updated_at` |
| `system_kill_switches` | `created_at`, `updated_at` |
| `user_2fa_settings` | `created_at` |
| `user_allowed_ips` | `created_at`, `created_by` |
| … +56 linhas — lista completa em `context.json` | |

## Dados pessoais / sensíveis (LGPD — cuidado em logs, exports, prompts de IA)

| Tabela | Coluna |
|---|---|
| `admin_audit_log` | `ip_address` |
| `admin_audit_log_y2025m12` | `ip_address` |
| `admin_audit_log_y2026m01` | `ip_address` |
| `admin_audit_log_y2026m02` | `ip_address` |
| `admin_audit_log_y2026m03` | `ip_address` |
| `admin_audit_log_y2026m04` | `ip_address` |
| `admin_audit_log_y2026m05` | `ip_address` |
| `admin_audit_log_y2026m06` | `ip_address` |
| `auth_login_attempts` | `email` |
| `auth_login_attempts` | `ip_address` |
| `bot_detection_log` | `ip_address` |
| `e2e_cleanup_audit` | `email` |
| `ip_access_control` | `ip_address` |
| `login_attempts` | `email` |
| `login_attempts` | `ip_address` |
| `mcp_access_violations` | `ip_address` |
| `profiles` | `email` |
| `rls_denial_log` | `ip_address` |
| `step_up_audit_log` | `ip_address` |
| `step_up_challenges` | `ip_address` |
| `suppliers` | `email` |
| `suppliers` | `phone` |
| `suppliers` | `address` |
| `access_blocked_log` | `email` |
| `access_blocked_log` | `ip_address` |
| `audit_log` | `ip_address` |
| `device_login_notifications` | `ip_address` |
| `edge_function_invocations` | `ip_address` |
| `ip_whitelist` | `ip_address` |
| `password_reset_requests` | `email` |
| `user_allowed_ips` | `ip_address` |
| `user_ip_allowlist` | `ip_address` |
| `user_sessions` | `ip_address` |
| `client_contacts` | `email` |
| `client_contacts` | `phone` |
| `contact_emails` | `email` |
| `company_addresses` | `cep` |
| `company_addresses` | `logradouro` |
| `public_token_failures` | `ip_address` |
| `auth.users` | `email` |

## Colunas de dinheiro (tipo importa: numeric ✅ / float ❌)

| Tabela | Coluna | Tipo |
|---|---|---|
| `quotes` | `subtotal` | `numeric` |
| `quotes` | `discount_percent` | `numeric` |
| `quotes` | `discount_amount` | `numeric` |
| `quotes` | `total` | `numeric` |
| `quotes` | `shipping_type` | `text` |
| `quotes` | `shipping_cost` | `numeric` |
| `custom_kits` | `total_price` | `numeric` |
| `quotes_inbound` | `total` | `numeric(14,2)` |
| `ai_usage_logs` | `total_tokens` | `integer` |
| `collection_items` | `price_at_save` | `numeric(12` |
| `collection_items_trash` | `price_at_save` | `numeric(12` |
| `conversation_audit_logs` | `total_tokens_estimated` | `integer` |
| `e2e_cleanup_audit` | `total_deleted` | `INT` |
| `favorite_items` | `price_at_save` | `NUMERIC(12,2)` |
| `favorite_items_trash` | `price_at_save` | `NUMERIC(12,2)` |
| `kit_templates` | `total_price` | `numeric` |
| `kit_variants` | `total_price` | `numeric(12` |
| `order_item_personalizations` | `price_adjustment` | `numeric(10,2)` |
| `order_items` | `discount_amount` | `numeric` |
| `orders` | `subtotal` | `numeric` |
| `orders` | `discount_amount` | `numeric` |
| `orders` | `shipping_cost` | `numeric` |
| `orders` | `shipping_type` | `text` |
| `ownership_audit_reports` | `total_tables_scanned` | `integer` |
| `ownership_audit_reports` | `total_issues_found` | `integer` |
| `price_history` | `price` | `numeric(12,2)` |
| `quote_item_personalizations` | `total_cost` | `numeric` |
| `quote_items` | `subtotal` | `numeric` |
| `quote_items` | `discount_percentage` | `numeric` |
| `quote_items` | `discount_amount` | `numeric` |
| `quote_items` | `price_confirmed_at` | `timestamptz` |
| `quote_items` | `price_updated_at` | `timestamptz` |
| `quote_items` | `price_freshness_threshold_days` | `integer` |
| `quote_templates` | `discount_percent` | `numeric` |
| `quote_templates` | `discount_amount` | `numeric` |
| `role_migration_batches` | `total_items` | `integer` |
| `seller_carts` | `shipping_deadline` | `DATE` |
| `product_variants` | `price_adjustment` | `DECIMAL(10,2)` |
| `stock_daily_summary` | `cost_price_open` | `numeric(12,4)` |
| `stock_daily_summary` | `cost_price_close` | `numeric(12,4)` |
| `stock_daily_summary` | `price_changed` | `boolean` |
| `variant_supplier_sources` | `cost_price` | `numeric(10,4)` |
| `variant_supplier_sources` | `cost_price_1` | `numeric(10,4)` |
| `variant_supplier_sources` | `cost_price_2` | `numeric(10,4)` |
| `variant_supplier_sources` | `cost_price_3` | `numeric(10,4)` |
| `variant_supplier_sources` | `cost_price_4` | `numeric(10,4)` |
| `variant_supplier_sources` | `cost_price_5` | `numeric(10,4)` |
| `variant_supplier_sources` | `price_updated_at` | `timestamp` |
| `_backup_stock_daily_summary_20260618` | `cost_price_open` | `numeric(12,4)` |
| `_backup_stock_daily_summary_20260618` | `cost_price_close` | `numeric(12,4)` |
| `_backup_stock_daily_summary_20260618` | `price_changed` | `boolean` |
| `ai_models` | `cost_input_per_1m` | `numeric(10,4)` |
| `ai_models` | `cost_output_per_1m` | `numeric(10,4)` |
| `ai_models` | `cost_per_image` | `numeric(10,4)` |
| `ai_routing_decisions` | `total_attempts` | `integer` |
| `ai_routing_decisions` | `total_duration_ms` | `integer` |
| `audit_log_gravacao` | `valor_antes` | `"jsonb"` |
| `audit_log_gravacao` | `valor_depois` | `"jsonb"` |
| `category_commemorative_dates` | `custom_message` | `"text"` |
| `db_connection_snapshots` | `total_conns` | `int` |
| `enrichment_log` | `cost_usd` | `numeric(10,4)` |
| `ingestion_run_log` | `feed` | `text` |
| `mockup_credit_transactions` | `amount` | `DECIMAL(10,4)` |
| `mockup_credit_transactions` | `balance_before` | `DECIMAL(10,2)` |
| `mockup_credit_transactions` | `balance_after` | `DECIMAL(10,2)` |
| `mockup_credits` | `balance` | `DECIMAL(10,2)` |
| `mockup_generation_jobs` | `custom_prompt` | `TEXT` |
| `mockup_generation_jobs` | `total_mockups` | `INTEGER` |
| `product_ai_history` | `total_tokens` | `integer` |
| `product_commemorative_dates` | `custom_message` | `"text"` |
| `product_customization_prices` | `price` | `numeric[]` |
| `product_fiscal` | `tax_reference_state` | `varchar(5)` |
| `produtos_padronizacao` | `cost_price` | `numeric` |
| `produtos_padronizacao_variantes` | `cost_price` | `numeric` |
| `produtos_padronizacao_variantes` | `cost_price_1` | `numeric` |
| `sm_worker_partitions` | `total_skus` | `integer` |
| `sm_worker_partitions` | `total_images` | `integer` |
| `sm_worker_partitions` | `total_uploaded` | `integer` |
| `sm_worker_partitions` | `total_errors` | `integer` |
| `variant_commemorative_dates` | `custom_description` | `"text"` |
| `visual_search_feedback` | `feedback_notes` | `text` |
| `supplier_stricker.customization_options` | `price` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_1` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_2` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_3` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_4` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_5` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_6` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_7` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_8` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_9` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_10` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_11` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_12` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_13` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_14` | `numeric(10,2)` |
| `supplier_stricker.customization_tables` | `price_15` | `numeric(10,2)` |
| `supplier_stricker.optionals` | `price_1` | `numeric(10,2)` |
| `supplier_stricker.optionals` | `price_2` | `numeric(10,2)` |
| `supplier_stricker.optionals` | `price_3` | `numeric(10,2)` |
| `supplier_stricker.optionals` | `price_4` | `numeric(10,2)` |
| `supplier_stricker.optionals` | `price_5` | `numeric(10,2)` |
| `supplier_stricker.stg_optionals` | `price_1` | `numeric(10,4)` |
| `supplier_stricker.stg_optionals` | `price_2` | `numeric(10,4)` |
| `supplier_stricker.stg_optionals` | `price_3` | `numeric(10,4)` |
| `supplier_stricker.stg_optionals` | `price_4` | `numeric(10,4)` |
| `supplier_stricker.stg_optionals` | `price_5` | `numeric(10,4)` |
| `supplier_customization_raw` | `customization_type` | `text` |
| `tabela_preco_gravacao_oficial` | `desconto_quarta_cor_mais` | `numeric(5` |
| `user_points` | `total_points` | `INTEGER` |
| `sync_jobs` | `total` | `INTEGER` |
| `personalization_sizes` | `price_modifier` | `NUMERIC(5,2)` |
| `seller_gamification` | `total_activities` | `INTEGER` |
| `cotacoes` | `preco_total` | `numeric(12,2)` |
| `simulation_runs` | `total_scenarios` | `INTEGER` |
| `_deprecated_silver_variants_20260606` | `cost_price_1` | `NUMERIC(12,4)` |
| `_deprecated_silver_variants_20260606` | `cost_price_2` | `NUMERIC(12,4)` |
| `_deprecated_silver_variants_20260606` | `cost_price_3` | `NUMERIC(12,4)` |
| `_deprecated_silver_variants_20260606` | `cost_price_4` | `NUMERIC(12,4)` |
| `_deprecated_silver_variants_20260606` | `cost_price_5` | `NUMERIC(12,4)` |
| `_deprecated_silver_variants_20260606` | `cost_price_6` | `NUMERIC(12,4)` |
| `_deprecated_silver_variants_20260606` | `cost_price_7` | `NUMERIC(12,4)` |
| `_deprecated_silver_variants_20260606` | `cost_price_8` | `NUMERIC(12,4)` |
| `_deprecated_silver_variants_20260606` | `cost_price_9` | `NUMERIC(12,4)` |
| `_deprecated_silver_variants_20260606` | `cost_price_10` | `NUMERIC(12,4)` |
| `ops.table_size_history` | `total_bytes` | `bigint` |
| `ops.pgss_history` | `total_exec_time` | `double` |
| `webhook_configs` | `total_calls` | `INT` |
