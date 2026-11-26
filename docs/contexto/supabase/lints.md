# Lints de segurança e performance

Verificações objetivas feitas no catálogo. Um agente deve ler isto antes de propor mudanças em RLS, functions ou índices.

| severidade | código | objeto | detalhe |
|---|---|---|---|
| ALTA | view_security_definer | public.categories_tree_visual | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.mv_product_cards | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.mv_product_compositions | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.mv_product_intelligence | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.mv_stock_velocity | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_compras_catalogo | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_compras_precos_faixa | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_compras_precos_variante | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_kit_component_media_public | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_product_compositions_public | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_products_public | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_suppliers_public | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_system_health_dashboard | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_tabela_preco_gravacao_oficial_public | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.v_variant_sale_prices_public | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| ALTA | view_security_definer | public.vw_system_health_quick | View em public sem security_invoker: executa como owner e ignora RLS das tabelas base. |
| MÉDIA | rls_no_policies | public.crm_seller_identity_links | RLS ligado sem policies: inacessível via API (só service_role). |
| BAIXA | extension_in_public | pg_repack | Extensão instalada no schema public (recomendado: schema extensions). |
| BAIXA | extension_in_public | pgstattuple | Extensão instalada no schema public (recomendado: schema extensions). |
| BAIXA | fk_without_index | public.frontend_telemetry.frontend_telemetry_user_id_fkey | FK sem índice nas colunas ['user_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.kit_component_enrichment_raw.kit_component_enrichment_raw_kit_component_id_fkey | FK sem índice nas colunas ['kit_component_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.kit_component_enrichment_raw.kit_component_enrichment_raw_kit_product_id_fkey | FK sem índice nas colunas ['kit_product_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.kit_component_enrichment_raw.kit_component_enrichment_raw_promoted_component_id_fkey | FK sem índice nas colunas ['promoted_component_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.kit_component_enrichment_raw.kit_component_enrichment_raw_promoted_padronizacao_id_fkey | FK sem índice nas colunas ['promoted_padronizacao_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.kit_component_padronizacao.fk_kcpad_raw_id | FK sem índice nas colunas ['raw_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.kit_component_padronizacao.kit_component_padronizacao_kit_product_id_fkey | FK sem índice nas colunas ['kit_product_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.print_area_techniques.print_area_techniques_tabela_preco_id_fkey | FK sem índice nas colunas ['tabela_preco_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.product_commemorative_dates.product_commemorative_dates_category_id_fkey | FK sem índice nas colunas ['category_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.product_fiscal.product_fiscal_ncm_id_fkey | FK sem índice nas colunas ['ncm_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.product_kit_components.product_kit_components_color_id_fkey | FK sem índice nas colunas ['color_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.product_kit_components.product_kit_components_component_product_id_fkey | FK sem índice nas colunas ['component_product_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.product_kit_components.product_kit_components_padronizacao_id_fkey | FK sem índice nas colunas ['padronizacao_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.product_kit_components.product_kit_components_secondary_material_type_id_fkey | FK sem índice nas colunas ['secondary_material_type_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.product_properties.product_properties_property_definition_id_fkey | FK sem índice nas colunas ['property_definition_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.products.products_ncm_id_fkey | FK sem índice nas colunas ['ncm_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.products.products_padronizacao_id_fkey | FK sem índice nas colunas ['padronizacao_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.products.products_sub_brand_id_fkey | FK sem índice nas colunas ['sub_brand_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.produto_ramo_atividade.produto_ramo_atividade_ramo_atividade_filho_id_fkey | FK sem índice nas colunas ['ramo_atividade_filho_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.produtos_padronizacao.produtos_padronizacao_sub_brand_id_fkey | FK sem índice nas colunas ['sub_brand_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.produtos_padronizacao_variantes.produtos_padronizacao_variantes_pad_id_fkey | FK sem índice nas colunas ['pad_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.produtos_site_padronizacao.produtos_site_padronizacao_raw_id_fkey | FK sem índice nas colunas ['raw_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.stock_daily_summary.stock_daily_summary_supplier_branch_id_fkey | FK sem índice nas colunas ['supplier_branch_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.stock_daily_summary.stock_daily_summary_supplier_id_fkey | FK sem índice nas colunas ['supplier_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.supplier_import_batches.supplier_import_batches_supplier_id_fkey | FK sem índice nas colunas ['supplier_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.supplier_products_raw.supplier_products_raw_import_batch_id_fkey | FK sem índice nas colunas ['import_batch_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.supplier_products_raw.supplier_products_raw_variant_id_fkey | FK sem índice nas colunas ['variant_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.variant_supplier_sources.variant_supplier_sources_supplier_branch_id_fkey | FK sem índice nas colunas ['supplier_branch_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | policy_auth_fn_not_wrapped | public.saved_stock_views.saved_stock_views_delete_own | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.saved_stock_views.saved_stock_views_insert_own | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.saved_stock_views.saved_stock_views_select_own | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.saved_stock_views.saved_stock_views_update_own | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users can upload their own mockup assets | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| INFO | rpc_anon_executable | public.check_login_rate_limit(_email text, _ip text) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.fn_product_active_for_rls(p_id uuid) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.fn_super_filtro(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean, p_limit integer, p_offset integer, p_sort text) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.fn_super_filtro_facets(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.fn_super_filtro_price_range(p_brands text[], p_category_slug text, p_target_audiences text[], p_is_textil boolean, p_is_thermal boolean, p_only_in_stock boolean) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.get_catalog_bestseller_page(p_sort text, p_limit integer, p_offset integer) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.get_sitemap_public(p_limit integer, p_offset integer) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.request_password_reset(p_email text) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.submit_quote_response(_token text, _response text, _response_notes text) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
