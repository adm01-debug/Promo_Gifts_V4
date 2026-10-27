# Advisors Supabase — doufsxqlfjyuvxuezpln
_Gerado em 2026-10-27. Somente leitura — nenhuma alteração aplicada._

## ERROR (bloqueante)

### Security Definer View — 8 ocorrência(s)
Detects views defined with the SECURITY DEFINER property. These views enforce Postgres permissions and row level security policies (RLS) of the view creator, rather than that of the querying user

- View \`public.v_products_public\` is defined with the SECURITY DEFINER property
- View \`public.v_tabela_preco_gravacao_oficial_public\` is defined with the SECURITY DEFINER property
- View \`public.v_product_compositions_public\` is defined with the SECURITY DEFINER property
- View \`public.v_product_tags_public\` is defined with the SECURITY DEFINER property
- View \`public.v_variant_sale_prices_public\` is defined with the SECURITY DEFINER property
- View \`public.v_product_properties_public\` is defined with the SECURITY DEFINER property
- View \`public.v_kit_component_media_public\` is defined with the SECURITY DEFINER property
- View \`public.v_suppliers_public\` is defined with the SECURITY DEFINER property

## WARN

### Extension in Public — 2 ocorrência(s)
Detects extensions installed in the \`public\` schema.

- Extension \`pgstattuple\` is installed in the public schema. Move it to another schema.
- Extension \`pg_repack\` is installed in the public schema. Move it to another schema.

### Public Can See Object in GraphQL Schema — 58 ocorrência(s)
Detects tables, views, materialized views, and foreign tables that are visible in the GraphQL schema to anyone using your public anon key. Revoke `SELECT` from `anon` for objects that should not be discoverable before sign-in, and check lint 0027 for the matching signed-in-user exposure.

- materialized view `internal.mv_product_leaf_category` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if i
- table `public.categories` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discoverable
- table `public.collection_products` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be dis
- table `public.collections` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discoverabl
- table `public.color_groups` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discoverab
- table `public.color_nuances` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discovera
- table `public.color_synonym_map` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be disco
- table `public.color_variations` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discov
- table `public.content_articles` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discov
- table `public.favorite_item_reactions` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be
- table `public.favorite_items` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discover
- table `public.favorite_lists` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discover
- table `public.kit_component_print_areas` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not 
- table `public.kit_typical_dims` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discov
- table `public.material_types` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be discover
- view `public.mv_product_compositions` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be 
- table `public.personalization_techniques` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not
- table `public.print_area_techniques` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be d
- table `public.product_ai_content` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be disc
- table `public.product_attributes` is visible in the GraphQL schema because the `anon` role can `SELECT` it. Revoke `SELECT` from `anon` if it should not be disc
  ... e mais 38 ocorrências

### Signed-In Users Can See Object in GraphQL Schema — 455 ocorrência(s)
Detects tables, views, materialized views, and foreign tables that are visible in the GraphQL schema to signed-in users. Revoke `SELECT` from `authenticated` for objects that signed-in users should not discover, and check lint 0026 for the matching public exposure.

- materialized view `analytics.categories_tree_visual` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revok
- materialized view `analytics.mv_product_cards` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SEL
- materialized view `analytics.mv_product_compositions` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revo
- materialized view `analytics.mv_product_intelligence` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revo
- materialized view `analytics.mv_stock_velocity` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SE
- materialized view `internal.mv_product_leaf_category` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revo
- table `public.access_blocked_log` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `au
- table `public.access_security_settings` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` fr
- table `public.admin_audit_log` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `authe
- table `public.admin_settings` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `authen
- table `public.ai_function_routing` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `a
- table `public.ai_models` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `authenticat
- table `public.ai_providers` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `authenti
- table `public.ai_routing_decisions` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `
- table `public.ai_usage_events` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `authe
- table `public.ai_usage_logs` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `authent
- table `public.ai_usage_quotas` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `authe
- table `public.analytics_events` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `auth
- table `public.anon_catalog_grant_audit_log` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT
- table `public.art_file_attachments` is visible in the GraphQL schema to signed-in users because the `authenticated` role can `SELECT` it. Revoke `SELECT` from `
  ... e mais 435 ocorrências

### Public Can Execute SECURITY DEFINER Function — 10 ocorrência(s)
Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.

- Function `public.check_login_rate_limit(_email text, _ip text)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/check_logi
- Function `public.fn_global_search(p_term text, p_limit integer, p_types text[])` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/
- Function `public.fn_product_active_for_rls(p_id uuid)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/fn_product_active_f
- Function `public.fn_super_filtro(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_
- Function `public.fn_super_filtro_facets(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price nume
- Function `public.fn_super_filtro_price_range(p_brands text[], p_category_slug text, p_target_audiences text[], p_is_textil boolean, p_is_thermal boolean, p_only
- Function `public.get_catalog_bestseller_page(p_sort text, p_limit integer, p_offset integer)` can be executed by the `anon` role as a `SECURITY DEFINER` functio
- Function `public.get_quote_token_public(_token text)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/get_quote_token_publ
- Function `public.get_sitemap_public(p_limit integer, p_offset integer)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/ge
- Function `public.submit_quote_response(_token text, _response text, _response_notes text)` can be executed by the `anon` role as a `SECURITY DEFINER` function v

### Signed-In Users Can Execute SECURITY DEFINER Function — 100 ocorrência(s)
Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.

- Function `public.admin_active_sessions()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/admin_active_sessions`.
- Function `public.admin_revoke_user_sessions(_user_id uuid)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/admin
- Function `public.can_access_quote(_quote_id uuid)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/can_access_quo
- Function `public.check_hardening_status()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/check_hardening_status
- Function `public.check_login_rate_limit(_email text, _ip text)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/c
- Function `public.check_telemetry_regression()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/check_telemetry_re
- Function `public.confirm_notifications_dispatched(p_ids uuid[])` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/
- Function `public.fn_anon_catalog_grant_audit_run()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/fn_anon_catal
- Function `public.fn_approve_product_deactivation(p_request_id uuid, p_notes text)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function 
- Function `public.fn_backfill_queue_reap_stuck(p_stuck_minutes integer, p_max_attempts integer)` can be executed by the `authenticated` role as a `SECURITY DEFIN
- Function `public.fn_batch_update_cart_item_sort_order(p_updates jsonb)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/
- Function `public.fn_detect_recurring_errors_last_hour(_min_occurrences integer)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function vi
- Function `public.fn_get_all_leaf_categories()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/fn_get_all_leaf_ca
- Function `public.fn_get_color_swatches_batch(p_product_ids uuid[])` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/r
- Function `public.fn_get_conversion_funnel(p_user_id uuid, p_days integer)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/re
- Function `public.fn_get_customization_price(p_area_id uuid, p_quantidade integer, p_num_cores integer, p_largura_cm numeric, p_altura_cm numeric, p_num_pontos i
- Function `public.fn_get_discontinued_products(p_supplier_code text, p_search text, p_status text, p_limit integer, p_offset integer)` can be executed by the `au
- Function `public.fn_get_discontinued_stats()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/fn_get_discontinued
- Function `public.fn_get_low_stock_alerts(p_limit integer, p_since date)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest
- Function `public.fn_get_navigation_patterns(p_user_id uuid, p_days integer)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/
  ... e mais 80 ocorrências
