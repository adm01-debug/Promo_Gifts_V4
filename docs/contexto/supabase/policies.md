# Policies (RLS)


Visão consolidada (inclui `storage.objects` e `realtime.messages`); detalhes por tabela em `tables/`.

| tabela | policy | cmd | tipo | roles | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| cf_recon.action_log | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| cf_recon.cf_ghost_check_queue | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| cf_recon.cf_image | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| cf_recon.crawl_run | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| cf_recon.metric_snapshot | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| cf_recon.remediation | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| public._archive_product_ai_20260626 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public._archive_product_seo_20260626 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public._archive_supplier_price_tiers_20260626 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public._bkp_kcvs_pre_normalize_20260624 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public._bkp_kit_color_from_name_20260624 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public._bkp_kit_dims_20260619 | bkp_kit_dims_service_only | ALL | PERMISSIVE | service_role | `true` | `true` |
| public._bkp_kit_packing_type_20260624 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public._bkp_kit_pkg_material_20260624 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public._bkp_orphan_active_variants_20260619 | bkp_orphan_variants_service_only | ALL | PERMISSIVE | service_role | `true` | `true` |
| public._qa_pct_results | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.access_blocked_log | access_blocked_log_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.access_blocked_log | access_blocked_log_admin_read | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.access_security_settings | Admins e Devs podem atualizar configurações de segurança | UPDATE | PERMISSIVE | authenticated | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |
| public.access_security_settings | Admins e Devs podem visualizar configurações de segurança | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |  |
| public.admin_audit_log | Admins or above can insert audit entries | INSERT | PERMISSIVE | authenticated |  | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.admin_audit_log | Devs can read audit logs | SELECT | PERMISSIVE | authenticated | `can_view_audit_logs(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.admin_settings | Admins can insert admin_settings | INSERT | PERMISSIVE | authenticated |  | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.admin_settings | Admins can update admin_settings | UPDATE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.admin_settings | Admins can view admin_settings | SELECT | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |  |
| public.ai_enrichment_queue | ai_queue_select_dynamic | SELECT | PERMISSIVE | authenticated | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (organization_id IN ( SELECT user_organizations.organization_id    FROM user_organizations   WHERE (user_organizations.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |  |
| public.ai_function_routing | ai_function_routing_dev_all | ALL | PERMISSIVE | public | `is_dev()` | `is_dev()` |
| public.ai_models | ai_models_dev_all | ALL | PERMISSIVE | public | `is_dev()` | `is_dev()` |
| public.ai_providers | ai_providers_dev_all | ALL | PERMISSIVE | public | `is_dev()` | `is_dev()` |
| public.ai_routing_decisions | ai_routing_decisions_dev_read | SELECT | PERMISSIVE | public | `(is_dev() OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'supervisor'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role))` |  |
| public.ai_usage_events | Users can insert their own usage events | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.ai_usage_events | Users can view their own usage events | SELECT | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role))` |  |
| public.ai_usage_logs | ai_usage_logs_user_own | SELECT | PERMISSIVE | public | `(is_dev() OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'supervisor'::app_role) OR (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.ai_usage_quotas | ai_usage_quotas_admin_delete | DELETE | PERMISSIVE | authenticated | `(is_dev() OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |  |
| public.ai_usage_quotas | ai_usage_quotas_admin_insert | INSERT | PERMISSIVE | authenticated |  | `(is_dev() OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| public.ai_usage_quotas | ai_usage_quotas_admin_update | UPDATE | PERMISSIVE | authenticated | `(is_dev() OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` | `(is_dev() OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| public.ai_usage_quotas | ai_usage_quotas_read_authenticated | SELECT | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |  |
| public.ai_usage_quotas | rls_restrictive_ai_usage_quotas | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.analytics_events | ae_delete_dev | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.analytics_events | ae_insert_anon | INSERT | PERMISSIVE | anon |  | `(user_id IS NULL)` |
| public.analytics_events | ae_insert_self_or_anon | INSERT | PERMISSIVE | authenticated |  | `((user_id IS NULL) OR (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.analytics_events | ae_select_own_or_coord | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.anon_catalog_grant_audit_log | anon_catalog_grant_audit_log_admin_read | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.anon_catalog_grant_audit_log | anon_catalog_grant_audit_log_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.anon_insert_rate | anon_insert_rate_service_read | SELECT | PERMISSIVE | service_role | `true` |  |
| public.art_file_attachments | Users delete own art files | DELETE | PERMISSIVE | authenticated | `(user_id = ( SELECT auth.uid() AS uid))` |  |
| public.art_file_attachments | Users insert own art files | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT auth.uid() AS uid))` |
| public.art_file_attachments | Users update own art files | UPDATE | PERMISSIVE | authenticated | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |
| public.art_file_attachments | Users view own art files | SELECT | PERMISSIVE | authenticated | `(user_id = ( SELECT auth.uid() AS uid))` |  |
| public.asia_image_import_queue | rls_infra_deny_public | ALL | PERMISSIVE | anon, authenticated | `false` |  |
| public.asia_upload_mapping | rls_infra_deny_public | ALL | PERMISSIVE | anon, authenticated | `false` |  |
| public.attribute_definitions | attribute_definitions_delete_policy | DELETE | PERMISSIVE | public | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.attribute_definitions | attribute_definitions_insert_policy | INSERT | PERMISSIVE | public |  | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| public.attribute_definitions | attribute_definitions_select_policy | SELECT | PERMISSIVE | public | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.attribute_definitions | attribute_definitions_update_policy | UPDATE | PERMISSIVE | public | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.attribute_equivalences | aeq_select_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.attribute_equivalences | aeq_write_service_role | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.attribute_groups | attribute_groups_delete_policy | DELETE | PERMISSIVE | public | `(organization_id IN ( SELECT attribute_groups.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.attribute_groups | attribute_groups_insert_policy | INSERT | PERMISSIVE | public |  | `(organization_id IN ( SELECT attribute_groups.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| public.attribute_groups | attribute_groups_select_policy | SELECT | PERMISSIVE | public | `(organization_id IN ( SELECT attribute_groups.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.attribute_groups | attribute_groups_update_policy | UPDATE | PERMISSIVE | public | `(organization_id IN ( SELECT attribute_groups.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.audit_log | audit_log_insert_self | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.audit_log | audit_log_select_dev | SELECT | PERMISSIVE | authenticated | `can_view_audit_logs(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.audit_log_gravacao | audit_log_gravacao_insert_service | INSERT | PERMISSIVE | service_role |  | `true` |
| public.audit_log_gravacao | audit_log_gravacao_select_supervisor_or_above | SELECT | PERMISSIVE | authenticated | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.auto_tag_rules | atr_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.auto_tag_rules | atr_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.auto_tag_rules | atr_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.auto_tag_rules | auth_read_auto_tag_rules | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.b2b_collection_products | collection_products_delete | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM b2b_collections c   WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND is_org_owner_or_admin(c.organization_id))))` |  |
| public.b2b_collection_products | collection_products_insert | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM b2b_collections c   WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND is_org_owner_or_admin(c.organization_id))))` |
| public.b2b_collection_products | collection_products_select | SELECT | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM b2b_collections c   WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND user_is_org_member(c.organization_id))))` |  |
| public.b2b_collection_products | collection_products_update | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM b2b_collections c   WHERE ((c.id = b2b_collection_products.b2b_collection_id) AND is_org_owner_or_admin(c.organization_id))))` |  |
| public.b2b_collections | b2b_collections_delete | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.b2b_collections | b2b_collections_insert | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.b2b_collections | b2b_collections_select | SELECT | PERMISSIVE | authenticated | `user_is_org_member(organization_id)` |  |
| public.b2b_collections | b2b_collections_update | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.backup_produto_ramo_atividade_20260625 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.binding_colors | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.binding_types | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.bot_detection_log | Admins can read bot log | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.cart_templates | Users can manage own templates | ALL | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.catalog_analytics | anon_insert_catalog_analytics | INSERT | PERMISSIVE | anon |  | `(user_id IS NULL)` |
| public.catalog_analytics | catalog_analytics_read | SELECT | PERMISSIVE | authenticated | `(is_manager_or_admin() OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |  |
| public.catalog_analytics | users_insert_own_analytics | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.categories | categories_delete | DELETE | PERMISSIVE | public | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |  |
| public.categories | categories_insert | INSERT | PERMISSIVE | public |  | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| public.categories | categories_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.categories | categories_update | UPDATE | PERMISSIVE | public | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| public.category_accessory_categories | auth_read_category_accessory_categories | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.category_accessory_categories | cat_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_accessory_categories | cat_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_accessory_categories | cat_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.category_ancestors | category_ancestors_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.category_ancestors | category_ancestors_write_service_only | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.category_attributes | category_attributes_follows_category | ALL | PERMISSIVE | public | `(category_id IN ( SELECT categories.id    FROM categories   WHERE (categories.organization_id IN ( SELECT user_organizations.organization_id            FROM user_organizations           WHERE (user_organizations.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.category_colors | auth_read_category_colors | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.category_colors | cat_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_colors | cat_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_colors | cat_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.category_commemorative_dates | auth_read_category_commemorative_dates | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.category_commemorative_dates | cat_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_commemorative_dates | cat_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_commemorative_dates | cat_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.category_copywriting_config | auth_read_category_copywriting_config | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.category_copywriting_config | cat_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_copywriting_config | cat_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_copywriting_config | cat_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.category_relationships | category_relationships_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.category_relationships | category_relationships_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.category_relationships | category_relationships_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.category_relationships | category_relationships_select_org | SELECT | PERMISSIVE | public | `user_belongs_to_org(organization_id)` |  |
| public.category_target_audiences | auth_read_category_target_audiences | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.category_target_audiences | cat_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_target_audiences | cat_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_target_audiences | cat_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.category_variation_types | auth_read_category_variation_types | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.category_variation_types | cat_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_variation_types | cat_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.category_variation_types | cat_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.cf_recon_inflight | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.city_whitelist | city_whitelist_admin_all | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.classify_functions_registry | auth_read_classify_functions_registry | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.cnpj_backfill_audit | audit_internal_only | ALL | RESTRICTIVE | public | `false` |  |
| public.collection_item_reactions | Public can view reactions for public collections | SELECT | PERMISSIVE | public | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_item_reactions.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now()))))) OR (EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_item_reactions.collection_id) AND (c.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.collection_item_reactions | Service role inserts reactions | INSERT | PERMISSIVE | public |  | `false` |
| public.collection_items | collection_items_own_delete | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |  |
| public.collection_items | collection_items_own_insert | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| public.collection_items | collection_items_own_update | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` | `(EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| public.collection_items | collection_items_select | SELECT | PERMISSIVE | public | `((EXISTS ( SELECT 1    FROM collections   WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR (EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_items.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now()))))))` |  |
| public.collection_items_trash | Users delete own collection trash | DELETE | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.collection_items_trash | Users insert own collection trash | INSERT | PERMISSIVE | public |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.collection_items_trash | Users view own collection trash | SELECT | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.collection_products | anon_read_public_collection_products | SELECT | PERMISSIVE | anon | `(EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now())))))` |  |
| public.collection_products | collection_products_delete | DELETE | PERMISSIVE | authenticated | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND (c.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.collection_products | collection_products_insert | INSERT | PERMISSIVE | authenticated |  | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND (c.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.collection_products | collection_products_select | SELECT | PERMISSIVE | authenticated | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND ((c.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (c.is_public = true) OR (c.share_token IS NOT NULL))))) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.collection_products | collection_products_update | UPDATE | PERMISSIVE | authenticated | `((EXISTS ( SELECT 1    FROM collections c   WHERE ((c.id = collection_products.collection_id) AND (c.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.collections | collections_anon_shared_view | SELECT | PERMISSIVE | anon | `((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now())))` |  |
| public.collections | collections_own_delete | DELETE | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.collections | collections_own_insert | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.collections | collections_own_select | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.collections | collections_own_update | UPDATE | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.color_equivalences | color_equivalences_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.color_equivalences | color_equivalences_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.color_equivalences | color_equivalences_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.color_equivalences | color_equivalences_select_org | SELECT | PERMISSIVE | public | `user_belongs_to_org(organization_id)` |  |
| public.color_groups | color_groups_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.color_groups | color_groups_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.color_groups | color_groups_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.color_groups | color_groups_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.color_nuances | color_nuances_anon_read | SELECT | PERMISSIVE | anon | `(is_active = true)` |  |
| public.color_nuances | color_nuances_member_read | SELECT | PERMISSIVE | authenticated | `user_belongs_to_org(organization_id)` |  |
| public.color_nuances | color_nuances_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.color_nuances | color_nuances_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.color_nuances | color_nuances_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.color_nuances | color_nuances_service_role | ALL | PERMISSIVE | service_role | `true` |  |
| public.color_synonym_map | csm_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.color_synonym_map | csm_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.color_synonym_map | csm_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.color_synonym_map | csm_read_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.color_synonym_map | rls_anon_read_color_synonym_map | SELECT | PERMISSIVE | anon | `true` |  |
| public.color_variations | color_variations_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.color_variations | color_variations_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.color_variations | color_variations_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.color_variations | color_variations_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.color_variations | color_variations_service_role | ALL | PERMISSIVE | service_role | `true` |  |
| public.commemorative_date_colors | cdc_admin_delete | DELETE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.commemorative_date_colors | cdc_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.commemorative_date_colors | cdc_admin_update | UPDATE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.commemorative_date_colors | cdc_select | SELECT | PERMISSIVE | public | `true` |  |
| public.commemorative_date_exclusions | cde_admin_delete | DELETE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.commemorative_date_exclusions | cde_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.commemorative_date_exclusions | cde_admin_update | UPDATE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.commemorative_date_exclusions | cde_select | SELECT | PERMISSIVE | public | `true` |  |
| public.commemorative_dates | Anyone can view active commemorative dates | SELECT | PERMISSIVE | public | `(is_active = true)` |  |
| public.commemorative_dates | commemorative_dates_admin_delete | DELETE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.commemorative_dates | commemorative_dates_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.commemorative_dates | commemorative_dates_admin_update | UPDATE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.companies | companies_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.companies | companies_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.companies | companies_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.companies | companies_select_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.company_email_patterns | li_deny_anon | ALL | PERMISSIVE | anon, authenticated | `false` | `false` |
| public.comparison_reactions | anyone_read_comparison_reactions | SELECT | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM user_comparisons uc   WHERE ((uc.id = comparison_reactions.comparison_id) AND (uc.is_public = true) AND ((uc.share_expires_at IS NULL) OR (uc.share_expires_at > now())))))` |  |
| public.comparison_reactions | no_direct_insert_reactions | INSERT | PERMISSIVE | public |  | `false` |
| public.component_media | Admins delete component media | DELETE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |  |
| public.component_media | Admins insert component media | INSERT | PERMISSIVE | authenticated |  | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.component_media | Admins update component media | UPDATE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.component_media | Authenticated users can read component media | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.connection_test_history | Devs delete connection_test_history | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.connection_test_history | Devs read connection_test_history | SELECT | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.connection_test_history | Service role inserts connection_test_history | INSERT | PERMISSIVE | service_role |  | `true` |
| public.content_articles | content_articles_anon_select | SELECT | PERMISSIVE | anon, authenticated | `((status = 'published'::text) AND (is_deleted = false))` |  |
| public.content_articles | content_articles_author_delete | DELETE | PERMISSIVE | authenticated | `(author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.content_articles | content_articles_author_insert | INSERT | PERMISSIVE | authenticated |  | `(author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.content_articles | content_articles_author_update | UPDATE | PERMISSIVE | authenticated | `(author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.conversation_audit_logs | Usuários podem criar seus próprios logs de conversa | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.conversation_audit_logs | Usuários podem ver seus próprios logs de conversa | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'manager'::app_role) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |  |
| public.conversation_delivery_status | Service role manages delivery status | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.conversation_delivery_status | Users read own delivery status | SELECT | PERMISSIVE | authenticated | `(is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM (conversation_event_history e      JOIN conversation_audit_logs a ON ((a.id = e.conversation_id)))   WHERE ((e.id = conversation_delivery_status.event_id) AND (a.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.conversation_event_history | Acesso ao histórico de eventos segue o log de auditoria | SELECT | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM conversation_audit_logs   WHERE (conversation_audit_logs.id = conversation_event_history.conversation_id)))` |  |
| public.conversation_event_history | Inserção de eventos permitida para o dono da conversa | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM conversation_audit_logs   WHERE ((conversation_audit_logs.id = conversation_event_history.conversation_id) AND (conversation_audit_logs.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| public.cover_finishes | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.cover_materials | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.cover_types | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.crm_callback_events | Admins can view crm callback events | SELECT | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |  |
| public.crm_callback_events | Service role full access | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.cron_job_timeout_map | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.cron_watchdog_log | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.custom_kits | ck_delete_own_or_coord | DELETE | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.custom_kits | ck_insert_self | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.custom_kits | ck_select_own_or_coord | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.custom_kits | ck_update_own_or_coord | UPDATE | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.dashboard_insights_cache | Users can delete their own cached insights | DELETE | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role))` |  |
| public.dashboard_insights_cache | Users can insert their own cached insights | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.dashboard_insights_cache | Users can update their own cached insights | UPDATE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.dashboard_insights_cache | Users can view their own cached insights | SELECT | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role))` |  |
| public.db_connection_snapshots | dcs_select_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.device_login_notifications | Users can read own device login notifications | SELECT | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.discount_approval_audit | daa_no_direct_write_delete | DELETE | PERMISSIVE | authenticated | `false` |  |
| public.discount_approval_audit | daa_no_direct_write_insert | INSERT | PERMISSIVE | authenticated |  | `false` |
| public.discount_approval_audit | daa_no_direct_write_update | UPDATE | PERMISSIVE | authenticated | `false` | `false` |
| public.discount_approval_audit | daa_select_scope | SELECT | PERMISSIVE | authenticated | `(can_view_all_sales() OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'supervisor'::app_role) OR (EXISTS ( SELECT 1    FROM discount_approval_requests r   WHERE ((r.id = discount_approval_audit.request_id) AND (r.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.discount_approval_requests | dar_delete_dev_only | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.discount_approval_requests | dar_insert_scope | INSERT | PERMISSIVE | authenticated |  | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.discount_approval_requests | dar_select_scope | SELECT | PERMISSIVE | authenticated | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.discount_approval_requests | dar_update_scope | UPDATE | PERMISSIVE | authenticated | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.e2e_cleanup_audit | admins_select_e2e_cleanup_audit | SELECT | PERMISSIVE | authenticated | `has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)` |  |
| public.e2e_cleanup_rate_limit | Service role only | ALL | PERMISSIVE | authenticated | `false` | `false` |
| public.eco_backfill_log_20260625 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.eco_date_reconcile_log_20260626 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.eco_material_config | auth_read_eco_material_config | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.eco_material_config | emc_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.eco_material_config | emc_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.eco_material_config | emc_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.edge_function_invocations | efi_delete_dev_only | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.edge_function_invocations | efi_insert_any_authenticated | INSERT | PERMISSIVE | authenticated |  | `((invoked_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (invoked_by IS NULL))` |
| public.edge_function_invocations | efi_select_coord_or_above | SELECT | PERMISSIVE | authenticated | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.edge_rate_limits | Service role can do everything on edge_rate_limits | ALL | PERMISSIVE | public | `(( SELECT ( SELECT auth.role() AS role) AS role) = 'service_role'::text)` | `(( SELECT ( SELECT auth.role() AS role) AS role) = 'service_role'::text)` |
| public.enriched_contacts | li_deny_anon | ALL | PERMISSIVE | anon, authenticated | `false` | `false` |
| public.enrichment_log | li_deny_anon | ALL | PERMISSIVE | anon, authenticated | `false` | `false` |
| public.expert_conversations | Users can manage own conversations | ALL | PERMISSIVE | authenticated | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.expert_messages | Users can manage own messages | ALL | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM expert_conversations   WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` | `(EXISTS ( SELECT 1    FROM expert_conversations   WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| public.external_connections | Devs manage external_connections | ALL | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.external_connections_sync_log | Admins read external_connections_sync_log | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.favorite_item_reactions | Owners delete own list reactions | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_item_reactions.list_id) AND (l.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |  |
| public.favorite_item_reactions | Public can insert reactions on shared lists | INSERT | PERMISSIVE | anon, authenticated |  | `(EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_item_reactions.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now())))))` |
| public.favorite_item_reactions | Read reactions: admin, owner or shared list | SELECT | PERMISSIVE | anon, authenticated | `(is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_item_reactions.list_id) AND (l.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR (EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_item_reactions.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now()))))))` |  |
| public.favorite_items | fi_anon_via_shared_list | SELECT | PERMISSIVE | anon | `(EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_items.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now())) AND (l.is_archived = false))))` |  |
| public.favorite_items | fi_delete_own | DELETE | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.favorite_items | fi_insert_own | INSERT | PERMISSIVE | authenticated |  | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_items.list_id) AND (l.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| public.favorite_items | fi_select_own_list_or_coord | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_items.list_id) AND (l.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.favorite_items | fi_update_own | UPDATE | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.favorite_items_trash | fit_delete_own | DELETE | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.favorite_items_trash | fit_insert_own | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.favorite_items_trash | fit_select_own | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.favorite_lists | fl_anon_select_via_token | SELECT | PERMISSIVE | anon | `((shared_token IS NOT NULL) AND ((shared_expires_at IS NULL) OR (shared_expires_at > now())) AND (is_archived = false))` |  |
| public.favorite_lists | fl_delete_own_or_coord | DELETE | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.favorite_lists | fl_insert_self | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.favorite_lists | fl_select_own_or_coord | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.favorite_lists | fl_update_own | UPDATE | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.feminine_color_config | auth_read_feminine_color_config | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.file_scan_logs | Users read own file_scan_logs | SELECT | PERMISSIVE | authenticated | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |  |
| public.follow_up_reminders | Users can manage own reminders | ALL | PERMISSIVE | authenticated | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.frontend_telemetry | frontend_telemetry_insert_anon | INSERT | PERMISSIVE | anon |  | `((user_id IS NULL) AND ((length(COALESCE(event_type, ''::text)) >= 1) AND (length(COALESCE(event_type, ''::text)) <= 64)) AND ((length(COALESCE(name, ''::text)) >= 1) AND (length(COALESCE(name, ''::text)) <= 256)) AND (length(COALESCE(url, ''::text)) <= 2048) AND (length(COALESCE(user_agent, ''::text)) <= 1024) AND (length(COALESCE(session_id, ''::text)) <= 128) AND (length(COALESCE((metadata)::text, ''::text)) <= 8192))` |
| public.frontend_telemetry | frontend_telemetry_insert_authenticated | INSERT | PERMISSIVE | authenticated |  | `(((user_id IS NULL) OR (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) AND ((length(COALESCE(event_type, ''::text)) >= 1) AND (length(COALESCE(event_type, ''::text)) <= 64)) AND ((length(COALESCE(name, ''::text)) >= 1) AND (length(COALESCE(name, ''::text)) <= 256)) AND (length(COALESCE(url, ''::text)) <= 2048) AND (length(COALESCE(user_agent, ''::text)) <= 1024) AND (length(COALESCE(session_id, ''::text)) <= 128) AND (length(COALESCE((metadata)::text, ''::text)) <= 8192))` |
| public.generated_mockups | gm_delete_own_or_admin | DELETE | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.generated_mockups | gm_insert_self | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.generated_mockups | gm_select_own_or_admin | SELECT | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.generated_mockups | gm_update_own_or_admin | UPDATE | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.geo_allowed_countries | Users can view allowed countries | SELECT | PERMISSIVE | public | `true` |  |
| public.hardening_health_snapshots | Devs read hardening snapshots | SELECT | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.image_backfill_queue | backfill_queue_admin_all | ALL | PERMISSIVE | authenticated | `is_org_owner_or_admin('5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid)` | `is_org_owner_or_admin('5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid)` |
| public.image_types | auth_read_image_types | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.import_pipeline_steps | auth_read_import_pipeline_steps | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.inbound_webhook_endpoints | Admins manage inbound_webhook_endpoints | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.inbound_webhook_events | Admins delete inbound_webhook_events | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.inbound_webhook_events | Admins read inbound_webhook_events | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.included_packaging_print_areas | auth_read_ippa | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.included_packaging_techniques | auth_read_ipt | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.ingestion_run_log | rls_infra_deny_public | ALL | PERMISSIVE | anon, authenticated | `false` |  |
| public.integration_credentials | Admins can delete integration credentials | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.integration_credentials | Admins can insert integration credentials | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.integration_credentials | Admins can update integration credentials | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.integration_credentials | Admins can view integration credentials | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.ip_access_control | Admins can manage ip_access_control | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.ip_whitelist | ip_whitelist_admin_all | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kill_switch_hits | kill_switch_hits_anon_select_deny | SELECT | PERMISSIVE | anon | `false` |  |
| public.kill_switch_hits | kill_switch_hits_delete_admin | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.kill_switch_hits | kill_switch_hits_insert_validated | INSERT | PERMISSIVE | anon, authenticated, service_role |  | `((switch_name IS NOT NULL) AND ((length(switch_name) >= 3) AND (length(switch_name) <= 100)) AND (source IS NOT NULL) AND (occurred_at <= (now() + '00:05:00'::interval)) AND (occurred_at >= (now() - '01:00:00'::interval)) AND ((origin IS NULL) OR (length(origin) <= 500)) AND ((operation IS NULL) OR (length(operation) <= 200)) AND ((target IS NULL) OR (length(target) <= 200)))` |
| public.kill_switch_hits | kill_switch_hits_read_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.kit_collaborators | Owner can invite collaborators | INSERT | PERMISSIVE | authenticated |  | `is_kit_owner(kit_id, ( SELECT auth.uid() AS uid))` |
| public.kit_collaborators | Owner can remove collaborators | DELETE | PERMISSIVE | authenticated | `is_kit_owner(kit_id, ( SELECT auth.uid() AS uid))` |  |
| public.kit_collaborators | Owner can update collaborators | UPDATE | PERMISSIVE | authenticated | `is_kit_owner(kit_id, ( SELECT auth.uid() AS uid))` |  |
| public.kit_collaborators | View collaborators if owner or self | SELECT | PERMISSIVE | authenticated | `(is_kit_owner(kit_id, ( SELECT auth.uid() AS uid)) OR (user_id = auth.uid()))` |  |
| public.kit_collaborators | rls_restrictive_kit_collaborators | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.kit_comments | Author can delete own comment | DELETE | PERMISSIVE | authenticated | `((author_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))` |  |
| public.kit_comments | Author can edit own comment | UPDATE | PERMISSIVE | authenticated | `((author_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))` | `((author_id = ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))` |
| public.kit_comments | Owner or collab can comment | INSERT | PERMISSIVE | authenticated |  | `((author_id = ( SELECT auth.uid() AS uid)) AND (is_kit_owner(kit_id, ( SELECT auth.uid() AS uid)) OR is_kit_collaborator(kit_id, ( SELECT auth.uid() AS uid))))` |
| public.kit_comments | View comments if owner/collab/admin | SELECT | PERMISSIVE | authenticated | `(is_kit_owner(kit_id, ( SELECT auth.uid() AS uid)) OR is_kit_collaborator(kit_id, ( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))` |  |
| public.kit_component_enrichment_raw | kcer_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.kit_component_enrichment_raw | kcer_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| public.kit_component_enrichment_raw | kcer_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| public.kit_component_enrichment_raw | kcer_read_auth | SELECT | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |  |
| public.kit_component_ficha_staging | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_component_padronizacao | kcpad_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.kit_component_padronizacao | kcpad_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| public.kit_component_padronizacao | kcpad_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| public.kit_component_padronizacao | kcpad_read_auth | SELECT | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |  |
| public.kit_component_print_areas | auth_read_kit_component_print_areas | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.kit_component_print_areas | kcpa_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_component_print_areas | kcpa_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_component_print_areas | kcpa_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.kit_component_print_areas | kit_component_print_areas_anon_read | SELECT | PERMISSIVE | anon | `(is_active = true)` |  |
| public.kit_component_types | auth_read_kit_component_types | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.kit_component_types | kct_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_component_types | kct_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_component_types | kct_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.kit_component_variant_skus | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_ficha_session_log | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_quote_requests | kit_quote_requests_insert_own | INSERT | PERMISSIVE | authenticated |  | `(( SELECT auth.uid() AS uid) = user_id)` |
| public.kit_quote_requests | kit_quote_requests_select_own | SELECT | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` |  |
| public.kit_save_requests | kit_save_requests_insert_own | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT auth.uid() AS uid))` |
| public.kit_save_requests | kit_save_requests_select_own | SELECT | PERMISSIVE | authenticated | `(user_id = ( SELECT auth.uid() AS uid))` |  |
| public.kit_share_tokens | Sellers can manage own kit share tokens | ALL | PERMISSIVE | authenticated | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_templates | kt_delete_dev | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.kit_templates | kt_insert_coord | INSERT | PERMISSIVE | authenticated |  | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_templates | kt_select_authenticated | SELECT | PERMISSIVE | authenticated | `((is_active = true) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.kit_templates | kt_update_coord | UPDATE | PERMISSIVE | authenticated | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.kit_typical_dims | kit_typical_dims_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.kit_variants | Owner can delete variants | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM custom_kits k   WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid() AS uid)))))` |  |
| public.kit_variants | Owner can insert variants | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM custom_kits k   WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid() AS uid)))))` |
| public.kit_variants | Owner can update variants | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM custom_kits k   WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid() AS uid)))))` | `(EXISTS ( SELECT 1    FROM custom_kits k   WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid() AS uid)))))` |
| public.kit_variants | Owner can view variants | SELECT | PERMISSIVE | authenticated | `((EXISTS ( SELECT 1    FROM custom_kits k   WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid() AS uid))))) OR is_admin(( SELECT auth.uid() AS uid)))` |  |
| public.login_attempts | Devs can view login attempts | SELECT | PERMISSIVE | authenticated | `can_view_audit_logs(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.magazine_duplicate_requests | magazine_duplicate_requests_own_insert | INSERT | PERMISSIVE | authenticated |  | `(actor_id = ( SELECT auth.uid() AS uid))` |
| public.magazine_duplicate_requests | magazine_duplicate_requests_own_select | SELECT | PERMISSIVE | authenticated | `(actor_id = ( SELECT auth.uid() AS uid))` |  |
| public.magazine_duplicate_requests | magazine_duplicate_requests_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_items | magazine_items_via_owner_or_org | ALL | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_items.magazine_id) AND ((m.owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR ((m.organization_id IS NOT NULL) AND (EXISTS ( SELECT 1            FROM organization_members om           WHERE ((om.organization_id = m.organization_id) AND (om.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))))))` | `(EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_items.magazine_id) AND (m.owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| public.magazine_public_reactions | reactions_read_owner | SELECT | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_reactions.magazine_id) AND (m.owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |  |
| public.magazine_public_reactions | reactions_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events.magazine_id) AND (m.owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.magazine_public_view_events | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events_2026_07 | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events_2026_07.magazine_id) AND (m.owner_id = ( SELECT auth.uid() AS uid))))))` |  |
| public.magazine_public_view_events_2026_07 | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events_2026_08 | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events_2026_08.magazine_id) AND (m.owner_id = ( SELECT auth.uid() AS uid))))))` |  |
| public.magazine_public_view_events_2026_08 | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events_2026_09 | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events_2026_09.magazine_id) AND (m.owner_id = ( SELECT auth.uid() AS uid))))))` |  |
| public.magazine_public_view_events_2026_09 | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events_2026_10 | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events_2026_10.magazine_id) AND (m.owner_id = ( SELECT auth.uid() AS uid))))))` |  |
| public.magazine_public_view_events_2026_10 | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events_2026_11 | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events_2026_11.magazine_id) AND (m.owner_id = ( SELECT auth.uid() AS uid))))))` |  |
| public.magazine_public_view_events_2026_11 | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events_2026_12 | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events_2026_12.magazine_id) AND (m.owner_id = ( SELECT auth.uid() AS uid))))))` |  |
| public.magazine_public_view_events_2026_12 | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events_2027_01 | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events_2027_01.magazine_id) AND (m.owner_id = ( SELECT auth.uid() AS uid))))))` |  |
| public.magazine_public_view_events_2027_01 | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events_2027_02 | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events_2027_02.magazine_id) AND (m.owner_id = ( SELECT auth.uid() AS uid))))))` |  |
| public.magazine_public_view_events_2027_02 | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_public_view_events_default | view_events_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events_default.magazine_id) AND (m.owner_id = ( SELECT auth.uid() AS uid))))))` |  |
| public.magazine_public_view_events_default | view_events_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_reader_state | reader_state_owner_read | SELECT | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.magazine_reader_state | reader_state_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.magazine_templates | magazine_templates_delete | DELETE | PERMISSIVE | authenticated | `(owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.magazine_templates | magazine_templates_insert | INSERT | PERMISSIVE | authenticated |  | `(owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.magazine_templates | magazine_templates_select | SELECT | PERMISSIVE | authenticated | `((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR ((shared_in_org = true) AND (organization_id IS NOT NULL) AND (EXISTS ( SELECT 1    FROM organization_members om   WHERE ((om.organization_id = magazine_templates.organization_id) AND (om.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))` |  |
| public.magazine_templates | magazine_templates_update | UPDATE | PERMISSIVE | authenticated | `(owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.magazine_templates_catalog | templates_catalog_read | SELECT | PERMISSIVE | authenticated | `(is_active = true)` |  |
| public.magazine_view_rollup_watermark | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.magazines | magazines_delete | DELETE | PERMISSIVE | authenticated | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.magazines | magazines_insert | INSERT | PERMISSIVE | authenticated |  | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.magazines | magazines_select | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR ((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (deleted_at IS NULL)) OR ((organization_id IS NOT NULL) AND (deleted_at IS NULL) AND (EXISTS ( SELECT 1    FROM organization_members om   WHERE ((om.organization_id = magazines.organization_id) AND (om.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))` |  |
| public.magazines | magazines_update | UPDATE | PERMISSIVE | authenticated | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR ((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (deleted_at IS NULL)))` | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.magic_up_brand_kits | Users can create own Magic Up brand kits | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.magic_up_brand_kits | Users can delete own Magic Up brand kits | DELETE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.magic_up_brand_kits | Users can update own Magic Up brand kits | UPDATE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.magic_up_brand_kits | Users can view own Magic Up brand kits | SELECT | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.magic_up_campaigns | Users can create own Magic Up campaigns | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.magic_up_campaigns | Users can delete own Magic Up campaigns | DELETE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.magic_up_campaigns | Users can update own Magic Up campaigns | UPDATE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.magic_up_campaigns | Users can view own Magic Up campaigns | SELECT | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.magic_up_comments | Users can create comments on own Magic Up generations | INSERT | PERMISSIVE | authenticated |  | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) AND (EXISTS ( SELECT 1    FROM magic_up_generations g   WHERE ((g.id = magic_up_comments.generation_id) AND (g.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| public.magic_up_comments | Users can delete comments on own Magic Up generations | DELETE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.magic_up_comments | Users can update comments on own Magic Up generations | UPDATE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.magic_up_comments | Users can view comments on own Magic Up generations | SELECT | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.magic_up_generations | Users can manage own generations | ALL | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.magic_up_public_shares | Users can create own Magic Up public shares | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.magic_up_public_shares | Users can delete own Magic Up public shares | DELETE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.magic_up_public_shares | Users can update own Magic Up public shares | UPDATE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.magic_up_public_shares | Users can view own Magic Up public shares | SELECT | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.magic_up_reactions | Users can create reactions on own Magic Up generations | INSERT | PERMISSIVE | authenticated |  | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) AND (EXISTS ( SELECT 1    FROM magic_up_generations g   WHERE ((g.id = magic_up_reactions.generation_id) AND (g.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| public.magic_up_reactions | Users can delete reactions on own Magic Up generations | DELETE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.magic_up_reactions | Users can update reactions on own Magic Up generations | UPDATE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.magic_up_reactions | Users can view reactions on own Magic Up generations | SELECT | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.markup_configurations | auth_read_markup_configurations | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.markup_configurations | markup_configurations_delete | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.markup_configurations | markup_configurations_insert | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.markup_configurations | markup_configurations_update | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.material_equivalences | me_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.material_equivalences | me_select | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.material_groups | material_groups_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.material_groups | material_groups_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.material_groups | material_groups_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.material_groups | material_groups_select_own_org | SELECT | PERMISSIVE | public | `user_belongs_to_org(organization_id)` |  |
| public.material_reconcile_log_20260626 | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.material_types | material_types_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.material_types | mt_delete | DELETE | PERMISSIVE | public | `(organization_id IN ( SELECT material_types.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.material_types | mt_insert | INSERT | PERMISSIVE | public |  | `(organization_id IN ( SELECT material_types.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| public.material_types | mt_update | UPDATE | PERMISSIVE | public | `(organization_id IN ( SELECT material_types.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.material_variations | mv_delete | DELETE | PERMISSIVE | public | `(organization_id IN ( SELECT material_variations.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.material_variations | mv_insert | INSERT | PERMISSIVE | public |  | `(organization_id IN ( SELECT material_variations.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| public.material_variations | mv_select | SELECT | PERMISSIVE | public | `(organization_id IN ( SELECT material_variations.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.material_variations | mv_update | UPDATE | PERMISSIVE | public | `(organization_id IN ( SELECT material_variations.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.mcp_access_violations | Admins read mcp violations | SELECT | PERMISSIVE | authenticated | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mcp_api_keys | Devs read mcp_api_keys | SELECT | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mcp_api_keys | No direct delete via JWT | DELETE | PERMISSIVE | authenticated | `false` |  |
| public.mcp_api_keys | No direct insert via JWT | INSERT | PERMISSIVE | authenticated |  | `false` |
| public.mcp_api_keys | No direct update via JWT | UPDATE | PERMISSIVE | authenticated | `false` | `false` |
| public.mcp_full_grantors | Devs read mcp_full_grantors | SELECT | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mcp_full_grantors | mcp_full_grantors_admin_delete | DELETE | PERMISSIVE | public | `is_admin_strict(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mcp_full_grantors | mcp_full_grantors_admin_update | UPDATE | PERMISSIVE | public | `is_admin_strict(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_strict(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mcp_full_grantors | mcp_full_grantors_admin_write | INSERT | PERMISSIVE | public |  | `is_admin_strict(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mcp_key_auto_revocations | Devs can view auto-revocations | SELECT | PERMISSIVE | public | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mcp_kv | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mcp_sessions | mcp_sessions_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.medallion_coverage_snapshots | mcs_admin_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.mockup_approval_links | mal_authenticated_select | SELECT | PERMISSIVE | authenticated | `((is_active = true) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM mockup_generation_jobs j   WHERE ((j.id = mockup_approval_links.job_id) AND (j.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.mockup_approval_links | mal_delete_admin | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mockup_approval_links | mal_insert_own_jobs | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM mockup_generation_jobs j   WHERE ((j.id = mockup_approval_links.job_id) AND (j.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| public.mockup_approval_links | mal_public_select_active | SELECT | PERMISSIVE | anon | `(is_active = true)` |  |
| public.mockup_approval_links | mal_update_own_or_admin | UPDATE | PERMISSIVE | authenticated | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM mockup_generation_jobs j   WHERE ((j.id = mockup_approval_links.job_id) AND (j.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.mockup_credit_transactions | mct_select_own_or_coord | SELECT | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.mockup_credits | mc_admin_delete | DELETE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mockup_credits | mc_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mockup_credits | mc_admin_update | UPDATE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mockup_credits | mc_select_own_or_coord | SELECT | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.mockup_drafts | Users can manage own drafts | ALL | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mockup_generation_jobs | mgj_delete_dev | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mockup_generation_jobs | mgj_insert_self | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.mockup_generation_jobs | mgj_select_own_or_coord | SELECT | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.mockup_generation_jobs | mgj_update_own_or_coord | UPDATE | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.mockup_prompt_configs | Admins manage prompt configs | ALL | PERMISSIVE | public | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mockup_prompt_history | Admins insert prompt history | INSERT | PERMISSIVE | public |  | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mockup_prompt_history | Admins view prompt history | SELECT | PERMISSIVE | public | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mockup_templates | mt_admin_delete | DELETE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.mockup_templates | mt_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mockup_templates | mt_admin_update | UPDATE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.mockup_templates | mt_select_active_or_admin | SELECT | PERMISSIVE | authenticated | `((is_active = true) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.navigation_analytics | users_insert_own_nav_analytics | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.navigation_analytics | users_read_own_nav_analytics | SELECT | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.ncm_codes | auth_read_ncm_codes | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.notebook_features | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.notification_preferences | notification_preferences_delete | DELETE | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` |  |
| public.notification_preferences | notification_preferences_insert | INSERT | PERMISSIVE | authenticated |  | `(( SELECT auth.uid() AS uid) = user_id)` |
| public.notification_preferences | notification_preferences_select | SELECT | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` |  |
| public.notification_preferences | notification_preferences_update | UPDATE | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` | `(( SELECT auth.uid() AS uid) = user_id)` |
| public.notification_preferences | rls_restrictive_notification_preferences | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.notification_templates | notification_templates_delete | DELETE | PERMISSIVE | public | `false` |  |
| public.notification_templates | notification_templates_insert | INSERT | PERMISSIVE | public |  | `false` |
| public.notification_templates | notification_templates_select | SELECT | PERMISSIVE | authenticated | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.notification_templates | notification_templates_update | UPDATE | PERMISSIVE | public | `false` |  |
| public.notifications | users_update_own_notifications | UPDATE | PERMISSIVE | public | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.notifications | users_view_own_notifications | SELECT | PERMISSIVE | public | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.ops_grant_audit | audit_internal_only | ALL | RESTRICTIVE | public | `false` |  |
| public.optimization_queue | Devs manage optimization queue | ALL | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.optimization_queue_runs | Admins manage optimization runs | ALL | PERMISSIVE | authenticated | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.order_item_personalizations | order_item_p_select_scope | SELECT | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM (order_items oi      JOIN orders o ON ((o.id = oi.order_id)))   WHERE ((oi.id = order_item_personalizations.order_item_id) AND ((o.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR can_view_all_sales()))))` |  |
| public.order_items | order_items_delete | DELETE | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND is_org_owner_or_admin(o.organization_id))))` |  |
| public.order_items | order_items_insert | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND user_is_org_member(o.organization_id))))` |
| public.order_items | order_items_select | SELECT | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND user_is_org_member(o.organization_id))))` |  |
| public.order_items | order_items_update | UPDATE | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND user_is_org_member(o.organization_id))))` | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.id = order_items.order_id) AND user_is_org_member(o.organization_id))))` |
| public.orders | orders_delete | DELETE | PERMISSIVE | public | `is_org_owner_or_admin(organization_id)` |  |
| public.orders | orders_insert | INSERT | PERMISSIVE | authenticated |  | `user_is_org_member(organization_id)` |
| public.orders | orders_select | SELECT | PERMISSIVE | public | `user_is_org_member(organization_id)` |  |
| public.orders | orders_update | UPDATE | PERMISSIVE | public | `user_is_org_member(organization_id)` | `user_is_org_member(organization_id)` |
| public.organization_members | Insert org members: org admin/owner, bootstrap or sys admin | INSERT | PERMISSIVE | public |  | `(has_org_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), organization_id, 'owner'::org_role) OR has_org_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), organization_id, 'admin'::org_role) OR ((NOT org_has_any_members(organization_id)) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (role = 'owner'::org_role)) OR is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.organization_members | Members view own org memberships | SELECT | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.organization_members | org_members_admin_delete | DELETE | PERMISSIVE | public | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.organization_members | org_members_admin_update | UPDATE | PERMISSIVE | public | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.organizations | org_delete_admins | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(id)` |  |
| public.organizations | org_insert_service | INSERT | PERMISSIVE | service_role |  | `true` |
| public.organizations | org_select_members | SELECT | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM user_organizations uo   WHERE ((uo.organization_id = organizations.id) AND (uo.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |  |
| public.organizations | org_update_admins | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(id)` | `is_org_owner_or_admin(id)` |
| public.outbound_webhooks | Admins manage outbound_webhooks | ALL | PERMISSIVE | public | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.ownership_audit_reports | ownership_audit_reports_admin_delete | DELETE | PERMISSIVE | public | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |  |
| public.ownership_audit_reports | ownership_audit_reports_admin_insert | INSERT | PERMISSIVE | public |  | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |
| public.ownership_audit_reports | ownership_audit_reports_admin_select | SELECT | PERMISSIVE | public | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |  |
| public.ownership_repair_logs | Admins/devs read repair logs | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |  |
| public.packaging_compatibility_config | auth_read_packaging_compatibility_config | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.packaging_types | auth_read_packaging_types | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.packagings | auth_read_packagings | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.paper_colors | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.paper_formats | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.paper_rulings | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.paper_weights | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.password_reset_requests | Admins can update password reset requests | UPDATE | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role])))))` |  |
| public.password_reset_requests | Admins can view password reset requests | SELECT | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role])))))` |  |
| public.password_reset_requests | Anyone can request a password reset (validated) | INSERT | PERMISSIVE | anon, authenticated |  | `((email ~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'::text) AND ((length(email) >= 5) AND (length(email) <= 254)) AND (status = 'pending'::text) AND (reviewed_at IS NULL) AND (reviewed_by IS NULL) AND (reviewer_notes IS NULL) AND (user_id IS NULL))` |
| public.permissions | Authenticated read permissions | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.permissions | permissions_dev_delete | DELETE | PERMISSIVE | public | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.permissions | permissions_dev_insert | INSERT | PERMISSIVE | public |  | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.permissions | permissions_dev_update | UPDATE | PERMISSIVE | public | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.personalization_simulations | persim_delete_own_or_admin | DELETE | PERMISSIVE | authenticated | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.personalization_simulations | persim_insert_own | INSERT | PERMISSIVE | authenticated |  | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.personalization_simulations | persim_select_own_or_supervisor | SELECT | PERMISSIVE | authenticated | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.personalization_simulations | persim_update_own_or_admin | UPDATE | PERMISSIVE | authenticated | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.personalization_technique_mappings | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.personalization_techniques | personalization_techniques_anon_read | SELECT | PERMISSIVE | anon | `(is_active = true)` |  |
| public.personalization_techniques | pt_admin_delete | DELETE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.personalization_techniques | pt_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.personalization_techniques | pt_admin_update | UPDATE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.personalization_techniques | pt_select_active_or_admin | SELECT | PERMISSIVE | authenticated | `((is_active = true) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.pipeline_control | rls_infra_deny_public | ALL | PERMISSIVE | anon, authenticated | `false` |  |
| public.pipeline_health_log | pipeline_health_log_service_only | ALL | PERMISSIVE | public | `(( SELECT ( SELECT auth.role() AS role) AS role) = 'service_role'::text)` |  |
| public.pipeline_known_issues | rls_infra_deny_public | ALL | PERMISSIVE | anon, authenticated | `false` |  |
| public.pipeline_run_log | rls_infra_deny_public | ALL | PERMISSIVE | anon, authenticated | `false` |  |
| public.price_history | admin_read_price_history | SELECT | PERMISSIVE | public | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'supervisor'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'manager'::app_role))` |  |
| public.print_area_techniques | pat_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.print_area_techniques | pat_select_anon | SELECT | PERMISSIVE | anon | `(is_active = true)` |  |
| public.print_area_techniques | pat_select_auth | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.print_area_techniques | print_area_techniques_oa_del | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = print_area_techniques.product_id) AND is_org_owner_or_admin(p.organization_id))))` |  |
| public.print_area_techniques | print_area_techniques_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = print_area_techniques.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.print_area_techniques | print_area_techniques_oa_upd | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = print_area_techniques.product_id) AND is_org_owner_or_admin(p.organization_id))))` | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = print_area_techniques.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.product_ai_content | product_ai_content_authenticated_select | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_ai_content | product_ai_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.product_ai_content | rls_restrictive_product_ai_content | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.product_ai_history | auth_read_product_ai_history | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_attributes | pa_select_anon | SELECT | PERMISSIVE | anon | `((is_active = true) AND (is_visible = true))` |  |
| public.product_attributes | pa_select_authenticated_all | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_attributes | pa_write_service_role | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.product_badge_definitions | pbd_admin_delete | DELETE | PERMISSIVE | authenticated | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (is_system = false))` |  |
| public.product_badge_definitions | pbd_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_badge_definitions | pbd_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_badge_definitions | pbd_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.product_category_assignments | product_category_assignments_oa_del | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |  |
| public.product_category_assignments | product_category_assignments_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| public.product_category_assignments | product_category_assignments_oa_upd | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| public.product_category_assignments | product_category_assignments_select_org | SELECT | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE (uo.user_id = ( SELECT auth.uid() AS uid)))))))` |  |
| public.product_commemorative_dates | pcd_read_public | SELECT | PERMISSIVE | anon, authenticated | `(is_active = true)` |  |
| public.product_component_location_techniques | pcloctech_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.product_component_location_techniques | pcloctech_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_component_location_techniques | pcloctech_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_component_location_techniques | pcloctech_select_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_component_locations | Admins delete component locations | DELETE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |  |
| public.product_component_locations | Admins insert component locations | INSERT | PERMISSIVE | authenticated |  | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_component_locations | Admins update component locations | UPDATE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_component_locations | Authenticated view component locations | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_components | Admins delete components | DELETE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |  |
| public.product_components | Admins insert components | INSERT | PERMISSIVE | authenticated |  | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_components | Admins update components | UPDATE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_components | Authenticated users can read components | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_customization_prices | product_customization_prices_read_all | SELECT | PERMISSIVE | public | `true` |  |
| public.product_deactivation_requests | authenticated_select | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_deactivation_requests | service_role_full | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.product_deactivation_tokens | _deactivation_auth_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.product_faqs | product_faqs_public_read | SELECT | PERMISSIVE | public | `(is_active = true)` |  |
| public.product_fiscal | product_fiscal_authenticated_select | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_fiscal | product_fiscal_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.product_fiscal | rls_restrictive_product_fiscal | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.product_group_components | pgcomp_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.product_group_components | pgcomp_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_group_components | pgcomp_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_group_components | pgcomp_select_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_group_location_techniques | pgloctech_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.product_group_location_techniques | pgloctech_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_group_location_techniques | pgloctech_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_group_location_techniques | pgloctech_select_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_group_locations | pgloc_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.product_group_locations | pgloc_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_group_locations | pgloc_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_group_locations | pgloc_select_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_group_members | Admins delete group members | DELETE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |  |
| public.product_group_members | Admins insert group members | INSERT | PERMISSIVE | authenticated |  | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_group_members | Admins update group members | UPDATE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_group_members | Authenticated users can read members | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_groups | Admins delete groups | DELETE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |  |
| public.product_groups | Admins insert groups | INSERT | PERMISSIVE | authenticated |  | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_groups | Admins update groups | UPDATE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_groups | Authenticated users can read groups | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_images | product_images_delete | DELETE | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_images.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |  |
| public.product_images | product_images_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_images.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| public.product_images | product_images_oa_upd | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_images.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_images.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| public.product_images | product_images_select | SELECT | PERMISSIVE | public | `((is_active = true) OR (organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))` |  |
| public.product_included_packagings | product_included_packagings_public_read | SELECT | PERMISSIVE | public | `true` |  |
| public.product_kit_components | product_kit_components_delete | DELETE | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_kit_components.kit_product_id) AND is_org_owner_or_admin(p.organization_id))))` |  |
| public.product_kit_components | product_kit_components_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_kit_components.kit_product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.product_kit_components | product_kit_components_oa_upd | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_kit_components.kit_product_id) AND is_org_owner_or_admin(p.organization_id))))` | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_kit_components.kit_product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.product_kit_components | product_kit_components_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.product_materials | product_materials_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.product_materials | product_materials_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.product_materials | product_materials_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.product_materials | product_materials_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.product_materials | product_materials_service_role | ALL | PERMISSIVE | service_role | `true` |  |
| public.product_notebook_features | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.product_notebook_specs | ref_select_public | SELECT | PERMISSIVE | public | `true` |  |
| public.product_novelties | pn_anon_select_active | SELECT | PERMISSIVE | anon | `(is_active = true)` |  |
| public.product_novelties | pn_authenticated_select_active | SELECT | PERMISSIVE | authenticated | `(is_active = true)` |  |
| public.product_novelties | pn_service_role_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.product_packaging | product_packaging_read_all | SELECT | PERMISSIVE | public | `true` |  |
| public.product_packaging_compatibility | product_packaging_compatibility_public_read | SELECT | PERMISSIVE | public | `true` |  |
| public.product_packagings | auth_read_product_packagings | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_physical | product_physical_anon_select | SELECT | PERMISSIVE | anon | `true` |  |
| public.product_physical | product_physical_select | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_physical | product_physical_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.product_price_freshness_overrides | Admins can delete freshness overrides | DELETE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |  |
| public.product_price_freshness_overrides | Admins can insert freshness overrides | INSERT | PERMISSIVE | authenticated |  | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_price_freshness_overrides | Admins can update freshness overrides | UPDATE | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_price_freshness_overrides | Authenticated can read freshness overrides | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_print_positions | product_print_positions_read_all | SELECT | PERMISSIVE | public | `true` |  |
| public.product_properties | auth_read_product_properties | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_properties | product_properties_anon_read | SELECT | PERMISSIVE | anon | `fn_product_active_for_rls(product_id)` |  |
| public.product_qa_image_alerts | qa_alerts_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.product_qa_image_alerts | qa_alerts_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_qa_image_alerts | qa_alerts_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_qa_image_alerts | qa_alerts_read_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_relationships | product_relationships_oa_del | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_relationships.product_id) AND is_org_owner_or_admin(p.organization_id))))` |  |
| public.product_relationships | product_relationships_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_relationships.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.product_relationships | product_relationships_oa_upd | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_relationships.product_id) AND is_org_owner_or_admin(p.organization_id))))` | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_relationships.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.product_relationships | product_relationships_public_read | SELECT | PERMISSIVE | public | `true` |  |
| public.product_search_logs | search_logs_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_search_logs | search_logs_write | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) IS NOT NULL)` |
| public.product_seo | product_seo_authenticated_select | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_seo | product_seo_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.product_seo | rls_restrictive_product_seo | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.product_similarity_group_members | psgm_public_read | SELECT | PERMISSIVE | public | `true` |  |
| public.product_similarity_groups | psg_public_read | SELECT | PERMISSIVE | public | `true` |  |
| public.product_supply | product_supply_authenticated_select | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_supply | product_supply_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.product_supply | rls_restrictive_product_supply | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.product_sync_logs | Admins insert product sync logs | INSERT | PERMISSIVE | authenticated |  | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| public.product_sync_logs | Admins view product sync logs | SELECT | PERMISSIVE | authenticated | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |  |
| public.product_tags | product_tags_anon_read | SELECT | PERMISSIVE | anon | `fn_product_active_for_rls(product_id)` |  |
| public.product_tags | product_tags_oa_del | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND is_org_owner_or_admin(p.organization_id))))` |  |
| public.product_tags | product_tags_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.product_tags | product_tags_oa_upd | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND is_org_owner_or_admin(p.organization_id))))` | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.product_tags | product_tags_select_org | SELECT | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND user_belongs_to_org(p.organization_id))))` |  |
| public.product_target_audiences | auth_read_product_target_audiences | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_variants | product_variants_anon_read | SELECT | PERMISSIVE | anon | `(is_active = true)` |  |
| public.product_variants | product_variants_delete | DELETE | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_variants.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |  |
| public.product_variants | product_variants_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_variants.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| public.product_variants | product_variants_oa_upd | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_variants.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_variants.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| public.product_variants | product_variants_public_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.product_videos | product_videos_delete | DELETE | PERMISSIVE | public | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_videos.product_id) AND is_org_owner_or_admin(p.organization_id))))` |  |
| public.product_videos | product_videos_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_videos.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.product_videos | product_videos_oa_upd | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_videos.product_id) AND is_org_owner_or_admin(p.organization_id))))` | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_videos.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.product_videos | product_videos_select | SELECT | PERMISSIVE | public | `((is_active = true) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) IS NOT NULL))` |  |
| public.product_views | Users can insert own views | INSERT | PERMISSIVE | authenticated |  | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.product_views | anon_can_insert_product_views | INSERT | PERMISSIVE | anon |  | `(seller_id IS NULL)` |
| public.product_views | product_views_read | SELECT | PERMISSIVE | authenticated | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.products | products_anon_read | SELECT | PERMISSIVE | anon | `((is_active = true) AND (is_deleted IS NOT TRUE))` |  |
| public.products | products_authenticated_read | SELECT | PERMISSIVE | authenticated | `(((is_active = true) AND (is_deleted IS NOT TRUE)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.products | products_delete | DELETE | PERMISSIVE | public | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |  |
| public.products | products_insert | INSERT | PERMISSIVE | public |  | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| public.products | products_update | UPDATE | PERMISSIVE | public | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| public.produto_ramo_atividade | pra_delete_admin | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.produto_ramo_atividade | pra_insert_admin | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.produto_ramo_atividade | pra_insert_service_role | INSERT | PERMISSIVE | service_role |  | `true` |
| public.produto_ramo_atividade | pra_update_admin | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.produto_ramo_atividade | produto_ramo_atividade_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.produtos_padronizacao | pad_authenticated_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.produtos_padronizacao_variantes | pad_var_authenticated_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.produtos_padronizacao_variantes | pad_var_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.produtos_site_padronizacao | produtos_site_padronizacao_auth_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.profiles | profiles_insert | INSERT | PERMISSIVE | public |  | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) AND (( SELECT ( SELECT auth.uid() AS uid) AS uid) = id))` |
| public.profiles | profiles_select | SELECT | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.profiles | profiles_update | UPDATE | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.property_definitions | auth_read_property_definitions | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.public_token_failures | Admins read token failures | SELECT | PERMISSIVE | authenticated | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.public_token_failures | Service role inserts token failures | INSERT | PERMISSIVE | service_role |  | `true` |
| public.push_subscriptions | push_subscriptions_delete | DELETE | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` |  |
| public.push_subscriptions | push_subscriptions_insert | INSERT | PERMISSIVE | authenticated |  | `(( SELECT auth.uid() AS uid) = user_id)` |
| public.push_subscriptions | push_subscriptions_select | SELECT | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` |  |
| public.push_subscriptions | push_subscriptions_update | UPDATE | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` | `(( SELECT auth.uid() AS uid) = user_id)` |
| public.push_subscriptions | rls_restrictive_push_subscriptions | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.qa_image_coverage_log | qa_coverage_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.qa_image_coverage_log | qa_coverage_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.qa_image_coverage_log | qa_coverage_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.qa_image_coverage_log | qa_coverage_read_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.query_telemetry | query_telemetry_delete_dev | DELETE | PERMISSIVE | authenticated | `(is_dev(( SELECT auth.uid() AS uid)) AND (created_at < (now() - '7 days'::interval)))` |  |
| public.query_telemetry | query_telemetry_insert_any | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.query_telemetry | query_telemetry_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.quote_approval_tokens | qatokens_delete_scope | DELETE | PERMISSIVE | authenticated | `(can_view_all_sales() OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.quote_approval_tokens | qatokens_insert_scope | INSERT | PERMISSIVE | authenticated |  | `(can_view_all_sales() OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.quote_approval_tokens | qatokens_select_scope | SELECT | PERMISSIVE | authenticated | `(can_view_all_sales() OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.quote_approval_tokens | qatokens_update_scope | UPDATE | PERMISSIVE | authenticated | `(can_view_all_sales() OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` | `(can_view_all_sales() OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.quote_drafts | Users can manage own drafts | ALL | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.quote_history | Sellers and coord create quote_history | INSERT | PERMISSIVE | authenticated |  | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_history.quote_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))))` |
| public.quote_history | Sellers and coord view quote_history | SELECT | PERMISSIVE | authenticated | `(is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_history.quote_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))` |  |
| public.quote_item_personalizations | qip_delete_own_quote | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.quote_item_personalizations | qip_insert_own_quote | INSERT | PERMISSIVE | public |  | `(EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| public.quote_item_personalizations | qip_select_own_quote | SELECT | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.quote_item_personalizations | qip_update_own_quote | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.quote_items | quote_items_delete | DELETE | PERMISSIVE | authenticated | `can_access_quote(quote_id)` |  |
| public.quote_items | quote_items_insert | INSERT | PERMISSIVE | authenticated |  | `can_access_quote(quote_id)` |
| public.quote_items | quote_items_select | SELECT | PERMISSIVE | authenticated | `can_access_quote(quote_id)` |  |
| public.quote_items | quote_items_update | UPDATE | PERMISSIVE | authenticated | `can_access_quote(quote_id)` | `can_access_quote(quote_id)` |
| public.quote_templates | quote_templates_delete | DELETE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by)` |  |
| public.quote_templates | quote_templates_insert | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by)` |
| public.quote_templates | quote_templates_select | SELECT | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by) OR (is_default = true) OR (is_active = true))` |  |
| public.quote_templates | quote_templates_update | UPDATE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by)` |
| public.quote_versions | quote_versions_select_scope | SELECT | PERMISSIVE | authenticated | `can_access_quote(quote_id)` |  |
| public.quote_versions | qv_insert_service | INSERT | PERMISSIVE | service_role |  | `true` |
| public.quotes | org_admins_delete_quotes | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.quotes | org_members_create_quotes | INSERT | PERMISSIVE | authenticated |  | `(user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| public.quotes | quotes_select_scope | SELECT | PERMISSIVE | public | `(user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.quotes | quotes_update_scope | UPDATE | PERMISSIVE | public | `(user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` | `(user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| public.ramo_atividade | ra_admin_delete | DELETE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.ramo_atividade | ra_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.ramo_atividade | ra_admin_update | UPDATE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.ramo_atividade | ramo_atividade_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.ramo_atividade_filho | raf_admin_delete | DELETE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.ramo_atividade_filho | raf_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.ramo_atividade_filho | raf_admin_update | UPDATE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.ramo_atividade_filho | ramo_atividade_filho_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.recently_viewed_products | Users can delete their own recently viewed products | DELETE | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` |  |
| public.recently_viewed_products | Users can insert their own recently viewed products | INSERT | PERMISSIVE | authenticated |  | `(( SELECT auth.uid() AS uid) = user_id)` |
| public.recently_viewed_products | Users can update their own recently viewed products | UPDATE | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` | `(( SELECT auth.uid() AS uid) = user_id)` |
| public.recently_viewed_products | Users can view their own recently viewed products | SELECT | PERMISSIVE | authenticated | `(( SELECT auth.uid() AS uid) = user_id)` |  |
| public.recently_viewed_products | rls_restrictive_recently_viewed_products | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.request_rate_limits | Devs can read rate limits | SELECT | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.request_rate_limits | Service role can manage rate limits | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.rls_denial_log | Admins can delete old logs | DELETE | PERMISSIVE | authenticated | `is_admin_strict(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.rls_denial_log | Admins read rls denials | SELECT | PERMISSIVE | authenticated | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.rls_denial_log | Block direct insert | INSERT | PERMISSIVE | authenticated |  | `false` |
| public.rls_denial_log | Block direct update | UPDATE | PERMISSIVE | authenticated | `false` |  |
| public.role_migration_batches | No direct delete role_migration_batches | DELETE | PERMISSIVE | authenticated | `false` |  |
| public.role_migration_batches | No direct insert role_migration_batches | INSERT | PERMISSIVE | authenticated |  | `false` |
| public.role_migration_batches | No direct update role_migration_batches | UPDATE | PERMISSIVE | authenticated | `false` | `false` |
| public.role_migration_batches | Supervisors+ can read role_migration_batches | SELECT | PERMISSIVE | authenticated | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.role_migration_items | No direct delete role_migration_items | DELETE | PERMISSIVE | authenticated | `false` |  |
| public.role_migration_items | No direct insert role_migration_items | INSERT | PERMISSIVE | authenticated |  | `false` |
| public.role_migration_items | No direct update role_migration_items | UPDATE | PERMISSIVE | authenticated | `false` | `false` |
| public.role_migration_items | Supervisors+ can read role_migration_items | SELECT | PERMISSIVE | authenticated | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.role_permissions | Authenticated read role_permissions | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.role_permissions | role_permissions_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.role_permissions | role_permissions_dev_insert | INSERT | PERMISSIVE | authenticated |  | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.role_permissions | role_permissions_dev_update | UPDATE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.roles | roles_admin_all | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.sales_goals | sales_goals_owner_all | ALL | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.saved_filters | saved_filters_delete | DELETE | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.saved_filters | saved_filters_insert | INSERT | PERMISSIVE | public |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.saved_filters | saved_filters_select | SELECT | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.saved_filters | saved_filters_update | UPDATE | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.saved_trends_views | Users manage own saved trends views | ALL | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.scheduled_reports | Users can create own scheduled reports | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.scheduled_reports | Users can delete own scheduled reports | DELETE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.scheduled_reports | Users can update own scheduled reports | UPDATE | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.scheduled_reports | Users can view own scheduled reports | SELECT | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.schema_drift_allowlist | Admins manage drift allowlist | ALL | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = 'admin'::app_role))))` | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = 'admin'::app_role))))` |
| public.schema_drift_log | Admins read schema_drift_log | SELECT | PERMISSIVE | authenticated | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.schema_signature_baseline | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.schema_signature_drift_allowlist | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.schema_signature_drift_log | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.search_analytics | Authenticated users can log searches | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) IS NOT NULL)` |
| public.search_analytics | Managers and admins can read search analytics | SELECT | PERMISSIVE | authenticated | `is_manager_or_admin()` |  |
| public.search_analytics | anon_can_insert_search_analytics | INSERT | PERMISSIVE | anon |  | `(user_id IS NULL)` |
| public.search_queries | search_queries_insert_self | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.search_queries | search_queries_self_or_coord | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.secret_rotation_log | secret_rotation_log_dev_select | SELECT | PERMISSIVE | public | `is_dev()` |  |
| public.secret_rotation_log | secret_rotation_log_service_insert | INSERT | PERMISSIVE | public |  | `false` |
| public.security_settings | Admins manage security settings | ALL | PERMISSIVE | authenticated | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.seller_cart_items | Users can manage own cart items | ALL | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM seller_carts c   WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` | `(EXISTS ( SELECT 1    FROM seller_carts c   WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| public.seller_carts | Users can manage own carts | ALL | PERMISSIVE | authenticated | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.seller_discount_limits | sdl_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.seller_discount_limits | sdl_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.seller_discount_limits | sdl_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.seller_discount_limits | sdl_select_own_or_coord | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.seo_audit_log | seo_audit_log_select_supervisor_or_above | SELECT | PERMISSIVE | authenticated | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.seo_redirects | auth_read_seo_redirects | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.simulator_wizard_drafts | Users can delete own drafts | DELETE | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.simulator_wizard_drafts | Users can insert own drafts | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.simulator_wizard_drafts | Users can update own drafts | UPDATE | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.simulator_wizard_drafts | Users can view own drafts | SELECT | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.sm_category_pages | sm_cat_auth_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.sm_category_pages | sm_cat_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.sm_site_url_map | sm_url_map_auth_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.sm_site_url_map | sm_url_map_service_all | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.sm_worker_partitions | smwp_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.smoke_test_runs | smoke_insert_service_role | INSERT | PERMISSIVE | authenticated |  | `((( SELECT current_setting('request.jwt.claim.role'::text, true) AS current_setting) = 'service_role'::text) OR ( SELECT is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS is_admin_or_above))` |
| public.smoke_test_runs | smoke_test_runs_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.spot_health_log | spot_health_log_auth_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.spot_typecode_map | spot_typecode_map_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.step_up_audit_log | Users can view own audit logs | SELECT | PERMISSIVE | public | `(is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |  |
| public.step_up_challenges | Users can view own challenges | SELECT | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.step_up_challenges | step_up_challenges_delete_own_or_admin | DELETE | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.step_up_challenges | step_up_challenges_insert_own | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.step_up_challenges | step_up_challenges_update_own | UPDATE | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) AND (consumed = false) AND (expires_at > now()))` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.step_up_tokens | Users can view own tokens | SELECT | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.step_up_tokens | step_up_tokens_delete_admin | DELETE | PERMISSIVE | authenticated | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) AND (expires_at < now())))` |  |
| public.step_up_tokens | step_up_tokens_insert_own | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.step_up_tokens | step_up_tokens_update_own | UPDATE | PERMISSIVE | authenticated | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) AND (consumed = false) AND (expires_at > now()))` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.stock_daily_summary | auth_read_stock_daily_summary | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.stock_notes | stock_notes_delete_own | DELETE | PERMISSIVE | authenticated | `(created_by = auth.uid())` |  |
| public.stock_notes | stock_notes_insert_own | INSERT | PERMISSIVE | authenticated |  | `(created_by = auth.uid())` |
| public.stock_notes | stock_notes_select_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.stock_notes | stock_notes_update_own | UPDATE | PERMISSIVE | authenticated | `(created_by = auth.uid())` | `(created_by = auth.uid())` |
| public.stock_snapshots | auth_read_stock_snapshots | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_attribute_definitions | supplier_attribute_definitions_delete_policy | DELETE | PERMISSIVE | public | `(organization_id IN ( SELECT supplier_attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.supplier_attribute_definitions | supplier_attribute_definitions_insert_policy | INSERT | PERMISSIVE | public |  | `(organization_id IN ( SELECT supplier_attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| public.supplier_attribute_definitions | supplier_attribute_definitions_select_policy | SELECT | PERMISSIVE | public | `(organization_id IN ( SELECT supplier_attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.supplier_attribute_definitions | supplier_attribute_definitions_update_policy | UPDATE | PERMISSIVE | public | `(organization_id IN ( SELECT supplier_attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |  |
| public.supplier_branches | auth_read_supplier_branches | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_branches | supplier_branches_oa_del | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM suppliers p   WHERE ((p.id = supplier_branches.supplier_id) AND is_org_owner_or_admin(p.organization_id))))` |  |
| public.supplier_branches | supplier_branches_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM suppliers p   WHERE ((p.id = supplier_branches.supplier_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.supplier_branches | supplier_branches_oa_upd | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM suppliers p   WHERE ((p.id = supplier_branches.supplier_id) AND is_org_owner_or_admin(p.organization_id))))` | `(EXISTS ( SELECT 1    FROM suppliers p   WHERE ((p.id = supplier_branches.supplier_id) AND is_org_owner_or_admin(p.organization_id))))` |
| public.supplier_categories | auth_read_supplier_categories | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_category_mappings | auth_read_supplier_category_mappings | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_colors | supplier_colors_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.supplier_colors | supplier_colors_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.supplier_colors | supplier_colors_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.supplier_colors | supplier_colors_public_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_customization_options_raw | rls_infra_deny_public | ALL | PERMISSIVE | anon, authenticated | `false` |  |
| public.supplier_customization_raw | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.supplier_field_mappings | auth_read_supplier_field_mappings | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_field_priority | auth_read_supplier_field_priority | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_import_batches | auth_read_supplier_import_batches | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_materials | sm_delete | DELETE | PERMISSIVE | public | `(supplier_id IN ( SELECT suppliers.id    FROM suppliers   WHERE (suppliers.organization_id IN ( SELECT suppliers.organization_id            FROM profiles           WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.supplier_materials | sm_insert | INSERT | PERMISSIVE | public |  | `(supplier_id IN ( SELECT suppliers.id    FROM suppliers   WHERE (suppliers.organization_id IN ( SELECT suppliers.organization_id            FROM profiles           WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| public.supplier_materials | sm_select | SELECT | PERMISSIVE | public | `(supplier_id IN ( SELECT suppliers.id    FROM suppliers   WHERE (suppliers.organization_id IN ( SELECT suppliers.organization_id            FROM profiles           WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.supplier_materials | sm_update | UPDATE | PERMISSIVE | public | `(supplier_id IN ( SELECT suppliers.id    FROM suppliers   WHERE (suppliers.organization_id IN ( SELECT suppliers.organization_id            FROM profiles           WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |  |
| public.supplier_packagings | auth_read_supplier_packagings | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_products_raw | spr_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw | spr_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.supplier_products_raw_history | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.supplier_products_raw_history_p2026_08 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2026_08 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.supplier_products_raw_history_p2026_09 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2026_09 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.supplier_products_raw_history_p2026_10 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2026_10 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.supplier_products_raw_history_p2026_11 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2026_11 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2026_12 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2026_12 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_01 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_01 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_02 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_02 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_03 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_03 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_04 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_04 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_05 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_05 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_06 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_06 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_07 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_07 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_08 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_08 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_09 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_09 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_10 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_10 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_11 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_11 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_products_raw_history_p2027_12 | hist_all_service | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.supplier_products_raw_history_p2027_12 | hist_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT auth.uid() AS uid))` |  |
| public.supplier_property_mappings | auth_read_supplier_property_mappings | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_replenishment_events | auth read events | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_settings | auth_read_supplier_settings | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_sub_brands | supplier_sub_brands_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.supplier_subtype_category_map | auth_read_supplier_subtype_category_map | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_unit_conversions | auth_read_supplier_unit_conversions | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_value_mappings | auth_read_supplier_value_mappings | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.supplier_video_requirements | auth_read_supplier_video_requirements | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.suppliers | suppliers_anon_read | SELECT | PERMISSIVE | anon | `(active = true)` |  |
| public.suppliers | suppliers_authenticated_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.suppliers | suppliers_delete | DELETE | PERMISSIVE | public | `is_org_owner_or_admin(organization_id)` |  |
| public.suppliers | suppliers_insert | INSERT | PERMISSIVE | public |  | `is_org_owner_or_admin(organization_id)` |
| public.suppliers | suppliers_update | UPDATE | PERMISSIVE | public | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.system_changelog | changelog_read_all_authenticated | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.system_changelog | changelog_write_service_only | INSERT | PERMISSIVE | service_role |  | `true` |
| public.system_documentation | auth_read_system_documentation | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.system_kill_switches | kill_switches_delete_admin | DELETE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.system_kill_switches | kill_switches_insert_admin | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.system_kill_switches | kill_switches_update_admin | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.system_kill_switches | rls_restrictive_system_kill_switches | ALL | RESTRICTIVE | authenticated, service_role | `true` |  |
| public.system_kill_switches | system_kill_switches_authenticated_select | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.system_settings | system_settings_admin_delete | DELETE | PERMISSIVE | authenticated | `is_admin(( SELECT auth.uid() AS uid))` |  |
| public.system_settings | system_settings_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin(( SELECT auth.uid() AS uid))` |
| public.system_settings | system_settings_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin(( SELECT auth.uid() AS uid))` | `is_admin(( SELECT auth.uid() AS uid))` |
| public.system_settings | system_settings_anon_select | SELECT | PERMISSIVE | anon | `(key = 'maintenance_mode'::text)` |  |
| public.system_settings | system_settings_authenticated_select | SELECT | PERMISSIVE | authenticated | `((key = 'maintenance_mode'::text) OR is_admin(( SELECT auth.uid() AS uid)))` |  |
| public.tabela_preco_gravacao_oficial | tabela_preco_gravacao_oficial_public_read | SELECT | PERMISSIVE | anon, authenticated | `(ativo = true)` |  |
| public.tabela_preco_gravacao_oficial | tpgo_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.tabela_preco_gravacao_oficial | tpgo_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.tabela_preco_gravacao_oficial | tpgo_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.tabela_preco_gravacao_oficial_faixa | tabela_preco_gravacao_oficial_faixa_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.tabela_preco_gravacao_oficial_faixa | tpgof_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.tabela_preco_gravacao_oficial_faixa | tpgof_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.tabela_preco_gravacao_oficial_faixa | tpgof_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.tags | tags_anon_read | SELECT | PERMISSIVE | anon | `(is_active = true)` |  |
| public.tags | tags_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.tags | tags_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.tags | tags_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.tags | tags_select_org | SELECT | PERMISSIVE | authenticated | `user_belongs_to_org(organization_id)` |  |
| public.target_audiences | auth_read_target_audiences | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.tecnicas_gravacao | tecnicas_gravacao_public_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.tecnicas_gravacao | tg_admin_insert | INSERT | PERMISSIVE | authenticated |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.tecnicas_gravacao | tg_admin_update | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.tecnicas_gravacao | tg_dev_delete | DELETE | PERMISSIVE | authenticated | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.user_2fa_settings | user_2fa_delete_own_or_admin | DELETE | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.user_2fa_settings | user_2fa_insert_own_or_admin | INSERT | PERMISSIVE | authenticated |  | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.user_2fa_settings | user_2fa_select_own_or_admin | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.user_2fa_settings | user_2fa_update_own_or_admin | UPDATE | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.user_allowed_ips | user_allowed_ips_delete_own_or_admin | DELETE | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.user_allowed_ips | user_allowed_ips_insert_own_or_admin | INSERT | PERMISSIVE | authenticated |  | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.user_allowed_ips | user_allowed_ips_select_own_or_admin | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.user_allowed_ips | user_allowed_ips_update_own_or_admin | UPDATE | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.user_comparisons | users_delete_own_comparisons | DELETE | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.user_comparisons | users_insert_own_comparisons | INSERT | PERMISSIVE | public |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.user_comparisons | users_select_own_comparisons | SELECT | PERMISSIVE | public | `(((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now()))) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |  |
| public.user_comparisons | users_update_own_comparisons | UPDATE | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.user_favorites | users_create_own_favorites | INSERT | PERMISSIVE | public |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.user_favorites | users_delete_own_favorites | DELETE | PERMISSIVE | public | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.user_favorites | users_view_own_favorites | SELECT | PERMISSIVE | public | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.user_filter_presets | user_filter_presets_delete | DELETE | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.user_filter_presets | user_filter_presets_insert | INSERT | PERMISSIVE | public |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.user_filter_presets | user_filter_presets_select | SELECT | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.user_filter_presets | user_filter_presets_update | UPDATE | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.user_ip_allowlist | user_ip_allowlist_admin_delete | DELETE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))` |  |
| public.user_ip_allowlist | user_ip_allowlist_admin_insert | INSERT | PERMISSIVE | authenticated |  | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))` |
| public.user_ip_allowlist | user_ip_allowlist_admin_update | UPDATE | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))` | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role])))))` |
| public.user_ip_allowlist | user_ip_allowlist_select | SELECT | PERMISSIVE | authenticated | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'dev'::app_role]))))))` |  |
| public.user_known_devices | Users can manage their own devices | ALL | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.user_notification_preferences | unp_delete_own_or_admin | DELETE | PERMISSIVE | public | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.user_notification_preferences | unp_insert_self | INSERT | PERMISSIVE | public |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.user_notification_preferences | unp_select_own_or_admin | SELECT | PERMISSIVE | public | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.user_notification_preferences | unp_update_own_or_admin | UPDATE | PERMISSIVE | public | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| public.user_onboarding | Users can insert own onboarding | INSERT | PERMISSIVE | public |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.user_onboarding | Users can update own onboarding | UPDATE | PERMISSIVE | public | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.user_onboarding | Users can view own onboarding | SELECT | PERMISSIVE | public | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.user_organizations | uo_delete_admins | DELETE | PERMISSIVE | public | `(is_org_owner_or_admin(organization_id) AND CASE     WHEN (role = ANY (ARRAY['admin'::org_role, 'owner'::org_role])) THEN (EXISTS ( SELECT 1        FROM user_organizations me       WHERE ((me.organization_id = user_organizations.organization_id) AND (me.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (me.role = 'owner'::org_role))))     ELSE true END)` |  |
| public.user_organizations | uo_insert_admins | INSERT | PERMISSIVE | public |  | `(is_org_owner_or_admin(organization_id) AND CASE     WHEN (role = ANY (ARRAY['admin'::org_role, 'owner'::org_role])) THEN (EXISTS ( SELECT 1        FROM user_organizations me       WHERE ((me.organization_id = user_organizations.organization_id) AND (me.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (me.role = 'owner'::org_role))))     ELSE true END)` |
| public.user_organizations | uo_select_members | SELECT | PERMISSIVE | public | `user_is_org_member(organization_id)` |  |
| public.user_organizations | uo_update_admins | UPDATE | PERMISSIVE | public | `is_org_owner_or_admin(organization_id)` | `(is_org_owner_or_admin(organization_id) AND CASE     WHEN (role = ANY (ARRAY['admin'::org_role, 'owner'::org_role])) THEN (EXISTS ( SELECT 1        FROM user_organizations me       WHERE ((me.organization_id = user_organizations.organization_id) AND (me.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (me.role = 'owner'::org_role))))     ELSE true END)` |
| public.user_preferences | Users insert own preferences | INSERT | PERMISSIVE | public |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.user_preferences | Users update own preferences | UPDATE | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.user_preferences | Users view own preferences | SELECT | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.user_roles | Users read own roles | SELECT | PERMISSIVE | authenticated | `(is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |  |
| public.user_roles | user_roles_delete_guarded | DELETE | PERMISSIVE | authenticated | ` CASE     WHEN (role = 'dev'::app_role) THEN is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))     ELSE is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) END` |  |
| public.user_roles | user_roles_insert_guarded | INSERT | PERMISSIVE | authenticated |  | ` CASE     WHEN (role = 'dev'::app_role) THEN is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))     ELSE (EXISTS ( SELECT 1        FROM user_roles ur       WHERE ((ur.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (ur.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role]))))) END` |
| public.user_roles | user_roles_update_guarded | UPDATE | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | ` CASE     WHEN (role = 'dev'::app_role) THEN is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))     ELSE (EXISTS ( SELECT 1        FROM user_roles ur       WHERE ((ur.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (ur.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role]))))) END` |
| public.user_search_history | Users can manage their own search history | ALL | PERMISSIVE | public | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.user_token_revocations | Users can view own revocation | SELECT | PERMISSIVE | authenticated | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |  |
| public.user_token_revocations | revocations_supervisor_delete | DELETE | PERMISSIVE | public | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.user_token_revocations | revocations_supervisor_insert | INSERT | PERMISSIVE | public |  | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.user_token_revocations | revocations_supervisor_update | UPDATE | PERMISSIVE | authenticated | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.variant_commemorative_dates | Anyone can view variant commemorative dates | SELECT | PERMISSIVE | public | `true` |  |
| public.variant_commemorative_dates | vcd_admin_delete | DELETE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.variant_commemorative_dates | vcd_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.variant_commemorative_dates | vcd_admin_update | UPDATE | PERMISSIVE | public | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.variant_supplier_sources | variant_stocks_select_org | SELECT | PERMISSIVE | public | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE (uo.user_id = ( SELECT auth.uid() AS uid))))` |  |
| public.variant_supplier_sources | variant_supplier_sources_oa_del | DELETE | PERMISSIVE | authenticated | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |  |
| public.variant_supplier_sources | variant_supplier_sources_oa_ins | INSERT | PERMISSIVE | authenticated |  | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| public.variant_supplier_sources | variant_supplier_sources_oa_upd | UPDATE | PERMISSIVE | authenticated | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| public.variation_types | variation_types_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.variation_types | variation_types_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.variation_types | variation_types_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.variation_types | variation_types_select_org | SELECT | PERMISSIVE | public | `user_belongs_to_org(organization_id)` |  |
| public.variation_values | variation_values_oa_del | DELETE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` |  |
| public.variation_values | variation_values_oa_ins | INSERT | PERMISSIVE | authenticated |  | `is_org_owner_or_admin(organization_id)` |
| public.variation_values | variation_values_oa_upd | UPDATE | PERMISSIVE | authenticated | `is_org_owner_or_admin(organization_id)` | `is_org_owner_or_admin(organization_id)` |
| public.variation_values | variation_values_select_org | SELECT | PERMISSIVE | public | `user_belongs_to_org(organization_id)` |  |
| public.video_import_queue | auth_read_video_import_queue | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.video_sim_results | sim_read | SELECT | PERMISSIVE | anon, authenticated | `true` |  |
| public.video_types | auth_read_video_types | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.video_validation_log | auth_read_video_validation_log | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.video_variant_links | Authenticated users can read video variant links | SELECT | PERMISSIVE | authenticated | `true` |  |
| public.video_variant_links | vvl_admin_delete | DELETE | PERMISSIVE | public | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.video_variant_links | vvl_admin_insert | INSERT | PERMISSIVE | public |  | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.video_variant_links | vvl_admin_update | UPDATE | PERMISSIVE | public | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.visual_search_feedback | vsf_insert_authenticated | INSERT | PERMISSIVE | authenticated |  | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.visual_search_feedback | vsf_select_own_or_admin | SELECT | PERMISSIVE | public | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |  |
| public.voice_command_logs | Users can insert own voice logs | INSERT | PERMISSIVE | authenticated |  | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| public.voice_command_logs | Users can view own voice logs | SELECT | PERMISSIVE | authenticated | `(is_manager_or_admin() OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |  |
| public.webhook_deliveries | Admins delete webhook_deliveries | DELETE | PERMISSIVE | public | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.webhook_deliveries | Admins read webhook_deliveries | SELECT | PERMISSIVE | public | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.webhook_delivery_locks | admin_only | ALL | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.webhook_delivery_metrics | wdm_insert_service_role | INSERT | PERMISSIVE | service_role |  | `true` |
| public.webhook_delivery_metrics | wdm_select_admin | SELECT | PERMISSIVE | authenticated | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.webhook_dispatcher_log | Admins podem ler dispatcher_log | SELECT | PERMISSIVE | authenticated | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (profiles.role = 'admin'::text))))` |  |
| public.webhook_outbox | webhook_outbox_service_only | ALL | PERMISSIVE | authenticated | `false` |  |
| public.webhook_request_nonces | service_role_manage_webhook_request_nonces | ALL | PERMISSIVE | service_role | `true` | `true` |
| public.workspace_notifications | Authenticated can insert notifications for valid users | INSERT | PERMISSIVE | authenticated |  | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) IS NOT NULL) AND (user_id IS NOT NULL))` |
| public.workspace_notifications | Users can delete own notifications | DELETE | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.workspace_notifications | Users can read own notifications | SELECT | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.workspace_notifications | Users can update own notifications | UPDATE | PERMISSIVE | authenticated | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| public.xbz_gallery_staging | admin_read_xbz_gallery_staging | SELECT | PERMISSIVE | authenticated | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |  |
| public.xbz_upload_mapping | xbz_upload_mapping_auth_read | SELECT | PERMISSIVE | authenticated | `true` |  |
| storage.objects | Acesso de inserção para usuários autenticados em personaliza | INSERT | PERMISSIVE | authenticated |  | `(bucket_id = 'personalization-images'::text)` |
| storage.objects | Acesso de leitura para usuários autenticados em personalizatio | SELECT | PERMISSIVE | authenticated | `(bucket_id = 'personalization-images'::text)` |  |
| storage.objects | Admins can delete component media | DELETE | PERMISSIVE | public | `((bucket_id = 'component-media'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |  |
| storage.objects | Admins can delete personalization images | DELETE | PERMISSIVE | authenticated | `((bucket_id = 'personalization-images'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |  |
| storage.objects | Admins can delete videos | DELETE | PERMISSIVE | public | `((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |  |
| storage.objects | Admins can list protected buckets | SELECT | PERMISSIVE | public | `((bucket_id = ANY (ARRAY['supplier-logos'::text, 'product-videos'::text, 'personalization-images'::text, 'component-media'::text])) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |  |
| storage.objects | Admins can update component media | UPDATE | PERMISSIVE | public | `((bucket_id = 'component-media'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` | `((bucket_id = 'component-media'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| storage.objects | Admins can upload component media | INSERT | PERMISSIVE | public |  | `((bucket_id = 'component-media'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| storage.objects | Admins can upload videos | INSERT | PERMISSIVE | public |  | `((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| storage.objects | Anyone can read component media | SELECT | PERMISSIVE | public | `(bucket_id = 'component-media'::text)` |  |
| storage.objects | Authenticated direct read component-media | SELECT | PERMISSIVE | authenticated | `((bucket_id = 'component-media'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |  |
| storage.objects | Authenticated direct read personalization-images | SELECT | PERMISSIVE | authenticated | `((bucket_id = 'personalization-images'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |  |
| storage.objects | Authenticated direct read product-videos | SELECT | PERMISSIVE | authenticated | `((bucket_id = 'product-videos'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |  |
| storage.objects | Authenticated direct read supplier-logos | SELECT | PERMISSIVE | authenticated | `((bucket_id = 'supplier-logos'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |  |
| storage.objects | Authenticated users can delete own personalization images | DELETE | PERMISSIVE | authenticated | `((bucket_id = 'personalization-images'::text) AND (owner = ( SELECT auth.uid() AS uid)))` |  |
| storage.objects | Authenticated users can update own personalization images | UPDATE | PERMISSIVE | authenticated | `((bucket_id = 'personalization-images'::text) AND (owner = ( SELECT auth.uid() AS uid)))` | `((bucket_id = 'personalization-images'::text) AND (owner = ( SELECT auth.uid() AS uid)))` |
| storage.objects | Authenticated users can upload personalization images | INSERT | PERMISSIVE | authenticated |  | `(bucket_id = 'personalization-images'::text)` |
| storage.objects | Authenticated users can view mockup assets | SELECT | PERMISSIVE | authenticated | `((bucket_id = 'mockup-assets'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |  |
| storage.objects | Authenticated users can view personalization images | SELECT | PERMISSIVE | authenticated | `(bucket_id = 'personalization-images'::text)` |  |
| storage.objects | Authenticated users can view signatures | SELECT | PERMISSIVE | authenticated | `(bucket_id = 'signatures'::text)` |  |
| storage.objects | Only admins can delete supplier logos | DELETE | PERMISSIVE | public | `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |  |
| storage.objects | Only admins can manage supplier logos | ALL | PERMISSIVE | authenticated | `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` | `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| storage.objects | Only admins can update product videos | UPDATE | PERMISSIVE | public | `((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` | `((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| storage.objects | Only admins can update supplier logos | UPDATE | PERMISSIVE | public | `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` | `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| storage.objects | Only admins can upload supplier logos | INSERT | PERMISSIVE | public |  | `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| storage.objects | Public can view supplier logos | SELECT | PERMISSIVE | public | `(bucket_id = 'supplier-logos'::text)` |  |
| storage.objects | Service role full access protected buckets | SELECT | PERMISSIVE | service_role | `(bucket_id = ANY (ARRAY['supplier-logos'::text, 'product-videos'::text, 'personalization-images'::text, 'component-media'::text]))` |  |
| storage.objects | Users can delete their own art files | DELETE | PERMISSIVE | authenticated | `((bucket_id = 'mockup-art-files'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))` |  |
| storage.objects | Users can delete their own mockup assets | DELETE | PERMISSIVE | authenticated | `((bucket_id = 'mockup-assets'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))` |  |
| storage.objects | Users can update their own mockup assets | UPDATE | PERMISSIVE | authenticated | `((bucket_id = 'mockup-assets'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))` | `((bucket_id = 'mockup-assets'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))` |
| storage.objects | Users can upload own personalization images | INSERT | PERMISSIVE | authenticated |  | `((bucket_id = 'personalization-images'::text) AND ((( SELECT auth.uid() AS uid))::text = split_part(name, '/'::text, 1)))` |
| storage.objects | Users can upload their own art files | INSERT | PERMISSIVE | authenticated |  | `((bucket_id = 'mockup-art-files'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))` |
| storage.objects | Users can upload their own mockup assets | INSERT | PERMISSIVE | public |  | `((bucket_id = 'mockup-assets'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| storage.objects | Users can upload to their own mockup folder | INSERT | PERMISSIVE | authenticated |  | `((bucket_id = 'mockup-assets'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))` |
| storage.objects | Users can view their own or shared art files | SELECT | PERMISSIVE | authenticated | `((bucket_id = 'mockup-art-files'::text) AND (((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) OR is_supervisor_or_above(( SELECT auth.uid() AS uid))))` |  |
| storage.objects | Users delete own art files in storage | DELETE | PERMISSIVE | public | `((bucket_id = 'mockup-art-files'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))` |  |
| storage.objects | Users update own art files in storage | UPDATE | PERMISSIVE | public | `((bucket_id = 'mockup-art-files'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))` |  |
| storage.objects | Users upload own art files to storage | INSERT | PERMISSIVE | public |  | `((bucket_id = 'mockup-art-files'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))` |
| storage.objects | Users view own art files in storage | SELECT | PERMISSIVE | public | `((bucket_id = 'mockup-art-files'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))` |  |
| storage.objects | art_files_auth_delete | DELETE | PERMISSIVE | authenticated | `((bucket_id = 'art-files'::text) AND (owner = ( SELECT auth.uid() AS uid)))` |  |
| storage.objects | art_files_auth_insert | INSERT | PERMISSIVE | authenticated |  | `((bucket_id = 'art-files'::text) AND (owner = ( SELECT auth.uid() AS uid)))` |
| storage.objects | art_files_auth_update | UPDATE | PERMISSIVE | authenticated | `((bucket_id = 'art-files'::text) AND (owner = ( SELECT auth.uid() AS uid)))` | `((bucket_id = 'art-files'::text) AND (owner = ( SELECT auth.uid() AS uid)))` |
| storage.objects | art_files_public_read | SELECT | PERMISSIVE | public | `((bucket_id = 'art-files'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |  |
| storage.objects | avatars_auth_delete | DELETE | PERMISSIVE | authenticated | `((bucket_id = 'avatars'::text) AND (owner = ( SELECT auth.uid() AS uid)))` |  |
| storage.objects | avatars_auth_insert | INSERT | PERMISSIVE | authenticated |  | `(bucket_id = 'avatars'::text)` |
| storage.objects | avatars_auth_update | UPDATE | PERMISSIVE | authenticated | `((bucket_id = 'avatars'::text) AND (owner = ( SELECT auth.uid() AS uid)))` | `((bucket_id = 'avatars'::text) AND (owner = ( SELECT auth.uid() AS uid)))` |
| storage.objects | avatars_public_read | SELECT | PERMISSIVE | public | `((bucket_id = 'avatars'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |  |
| storage.objects | quarantine_delete_admin | DELETE | PERMISSIVE | authenticated | `((bucket_id = 'quarantine'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |  |
| storage.objects | quarantine_insert_service | INSERT | PERMISSIVE | authenticated |  | `((bucket_id = 'quarantine'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |
| storage.objects | quarantine_select_admin_or_service | SELECT | PERMISSIVE | authenticated | `((bucket_id = 'quarantine'::text) AND is_supervisor_or_above(( SELECT auth.uid() AS uid)))` |  |
| storage.objects | recibos_authenticated_update | UPDATE | PERMISSIVE | authenticated, service_role | `(bucket_id = 'recibos-entrega'::text)` | `(bucket_id = 'recibos-entrega'::text)` |
| storage.objects | recibos_authenticated_write | INSERT | PERMISSIVE | authenticated, service_role |  | `(bucket_id = 'recibos-entrega'::text)` |
