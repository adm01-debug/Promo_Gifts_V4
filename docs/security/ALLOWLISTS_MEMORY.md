# Security Allowlists — Documentação Canônica

> **Fonte da verdade** dos allowlists de segurança versionados em `.security/`.
> Este arquivo é referenciado pelo gate `check-allowlist-memory-crosscheck` (CI).
> Toda entrada em allowlist DEVE ter contrapartida documentada aqui — caso contrário, o gate falha.

Última atualização: 2026-09-03

---

## Modelo de acesso

- Plataforma fechada (sem signup público). Todo acesso passa por autenticação Supabase + RBAC via `has_role()` / `is_admin()` / `is_dev()`.
- SECURITY DEFINER em `public` é usado para: (a) helpers RBAC canônicos, (b) agregados públicos anônimos, (c) settings admin com checagem interna, (d) endpoints public_intent via token.
- `anon` NUNCA deve ter EXECUTE em SECURITY DEFINER (gate `secdef-anon`). Exceções documentadas caso a caso.
- Toda função em `public` DEVE declarar `SET search_path = public` (gate `lint-0011`).

## Nunca deve acontecer

- SECURITY DEFINER em `public` executável por `anon` sem justificativa documentada aqui.
- Função em `public` sem `SET search_path` fixo (vetor de search-path injection).
- Nova função RBAC/helper adicionada sem entrada correspondente na allowlist 0029 + rationale aqui.

## Riscos aceitos

### Allowlist 0029 — SECURITY DEFINER exec por signed-in (`authenticated`)

O snapshot live contém funções intencionais e grants preexistentes ainda em
revisão individual. A allowlist é um ratchet: documenta o estado observado e
bloqueia grants novos; ela não transforma automaticamente todo item em risco
aceito. As famílias já classificadas são:

- **RBAC helpers** (`has_role`, `is_admin`, `is_admin_strict`, `is_dev`, `is_manager_or_admin`, `is_supervisor_or_above`, `is_seller_only`, `is_org_member`, `has_org_role`, `get_user_org_ids`, `can_approve_discount`, `can_grant_mcp_full`, `can_manage_connections`, `can_manage_quotes`, `can_view_all_sales`, `can_view_audit_logs`, `can_view_connections`, `can_view_telemetry`, `is_kit_owner`, `is_kit_collaborator`) — padrão canônico Supabase para RLS sem recursão.
- **Quota AI** (`check_ai_quota`) — SELECT FOR UPDATE em `ai_usage_quotas`, precisa de SECURITY DEFINER para evitar race.
- **Painel admin de saúde** (`check_hardening_status`, `check_telemetry_regression`, `get_app_health_summary`, `get_platform_failure_metrics`, `get_auto_test_job_status`, `lookup_request_id`) — leitura agregada com checagem interna de role.
- **Execução e persistência de smoke tests** (`fn_run_and_persist_smoke_tests`) — executa bateria de smoke tests e persiste cada resultado em `smoke_test_runs`; **não é read-only**. SECURITY DEFINER deliberado (PR #1825, 2026-09-03): guard interno com `is_admin_or_above` bloqueia anon e authenticated não-admin; DEFINER necessário porque `fn_run_smoke_tests` não tem EXECUTE para `authenticated`; EXECUTE de anon revogado (20260903092000).
- **Bootstrap de usuário** (`ensure_default_favorite_list`, `log_user_logout`, `restore_seller_cart`) — self-scope via `auth.uid()`.
- **Agregados públicos anônimos** (`get_collections_weekly_count`, `get_favorites_weekly_count`, `get_top_collected_products`, `get_top_compared_products`, `get_top_favorited_products`, `get_industry_benchmark_stats`, `get_industry_top_products`, `get_bundle_suggestions`, `get_client_seasonality`, `get_client_top_products`, `get_user_recent_comparisons`) — não expõem PII; agregados apenas.
- **Settings admin** (`get_connection_failure_window_minutes`, `get_connections_auto_test_interval`, `set_connection_failure_window_minutes`, `set_connections_auto_test_interval`) — checam `is_admin()` internamente.
- **Batch admin** (`execute_role_migration_batch`, `repair_ownership_orphans`) — checam `is_admin_strict()` internamente, com auditoria.
- **Telemetria/logs self** (`log_rls_denial`, `record_dev_route_telemetry`) — insert em tabelas de log com self-scope.
- **Rerank de busca** (`search_records_rerank`) — read-only.

### Allowlist 0011 — Funções sem `SET search_path`

Snapshot atual: **0 entradas**. Qualquer nova função em `public` sem `SET search_path` faz o gate falhar. Adicionar aqui APENAS em casos legítimos (ex: função disparada por trigger que precisa herdar search_path do chamador) com `reason` explícito.

### Allowlist secdef-anon — SECURITY DEFINER exec por `anon`

Snapshot canônico de 2026-08-29: **10 entradas**, todas listadas literalmente
abaixo com o motivo de exposição. O conjunto cobre pré-autenticação, catálogo
público e respostas por token opaco; qualquer 11ª assinatura reprova o gate.

Adicionar entrada aqui exige justificativa forte (endpoint público via token com escopo mínimo) e documentação neste arquivo antes do merge.

## Snapshot literal reconciliado em 2026-08-29

As assinaturas abaixo são geradas a partir das allowlists versionadas e existem
aqui para revisão humana e para o cross-check automatizado. Alterar a allowlist
exige atualizar este inventário no mesmo PR.

### Allowlist 0029 — snapshot literal do `pg_catalog`

- `public.can_access_quote(_quote_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.check_hardening_status()` — Painel admin (leitura de hardening)
- `public.check_login_rate_limit(_email text, _ip text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.confirm_notifications_dispatched(p_ids uuid[])` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_anon_catalog_grant_audit_run()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_approve_product_deactivation(p_request_id uuid, p_notes text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_batch_update_cart_item_sort_order(p_updates jsonb)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_check_login_allowed(p_email text, p_ip_address text, p_city text, p_user_agent text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_all_leaf_categories()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_color_swatches_batch(p_product_ids uuid[])` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_conversion_funnel(p_user_id uuid, p_days integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_customization_price(p_area_id uuid, p_quantidade integer, p_num_cores integer, p_largura_cm numeric, p_altura_cm numeric, p_num_pontos integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_discontinued_products(p_supplier_code text, p_search text, p_status text, p_limit integer, p_offset integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_discontinued_stats()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_low_stock_alerts(p_limit integer, p_since date)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_navigation_patterns(p_user_id uuid, p_days integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_novelty_alerts(p_limit integer, p_since date)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_product_ai_context(p_product_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_product_customization_options(p_product_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_product_intelligence_all()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_recent_restocks(p_limit integer, p_since date)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_replenishment_stats()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_reposicao_listing(p_supplier_id uuid, p_category_id uuid, p_sort_by text, p_limit integer, p_offset integer, p_days integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_reposicao_metrics()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_reposicao_variants_summary(p_product_ids uuid[])` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_repressed_demand(p_user_id uuid, p_days integer, p_limit integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_stock_notification_counts(p_since date)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_get_stockout_alerts(p_limit integer, p_since date)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_global_search(p_term text, p_limit integer, p_types text[])` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_list_deactivation_requests(p_status text, p_limit integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_log_search_analytics(p_search_term text, p_results_count integer, p_search_context text, p_debounce_seconds integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_notify_user(_target_user_id uuid, _title text, _message text, _type text, _category text, _action_url text, _metadata jsonb)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_product_active_for_rls(p_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_products_quality_dashboard()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_qa_check_image_coverage()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_qa_scan_imageless_products()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_reject_product_deactivation(p_request_id uuid, p_rejection_reason text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_request_product_deactivation(p_product_id uuid, p_reason text, p_reason_code text, p_notes text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_rpc_exists(_fname text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_run_and_persist_smoke_tests()` — SECURITY DEFINER deliberado (2026-09-03, PR #1825): wrapper de smoke tests com guard interno de autorização (role do JWT + is_admin_or_above com coalesce; bloqueia anon e authenticated não-admin — validado em produção, not authorized). DEFINER é necessário porque a inner fn_run_smoke_tests não tem EXECUTE para authenticated; sem ele, admin passava no guard e quebrava na chamada interna. EXECUTE de anon revogado (20260903092000).
- `public.fn_rupture_by_level(p_nivel text, p_limit integer, p_offset integer, p_preferred boolean)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_rupture_quick_stats()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_super_filtro_facets(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_super_filtro_opcoes()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_super_filtro_price_range(p_brands text[], p_category_slug text, p_target_audiences text[], p_is_textil boolean, p_is_thermal boolean, p_only_in_stock boolean)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_super_filtro_product_ids(_datas text[], _tags text[], _ramos text[], _segmentos text[], _publico text[], _endomarketing text[])` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_super_filtro(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean, p_limit integer, p_offset integer, p_sort text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.fn_verify_anon_catalog_grants()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.get_catalog_bestseller_page(p_sort text, p_limit integer, p_offset integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.get_collections_weekly_count(_weeks integer)` — Agregado público (contagem semanal)
- `public.get_favorite_list_counts(_user_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.get_inventory_health()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.get_profile_and_roles(_user_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.get_promo_sales_90d_by_product()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.get_promo_sales_ranking()` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.get_supplier_reliability_history(_supplier_id uuid, _limit integer)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.get_top_collected_products(_days integer, _limit integer)` — Ranking público
- `public.is_admin_or_above(_user_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.is_coord_or_above(_user_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.is_dnd_active(p_user_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.is_org_member(_user_id uuid, _org_id uuid)` — RBAC helper (organizações)
- `public.is_org_owner_or_admin(org_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.mcp_kv_get(p_secret text, p_key text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.org_has_any_members(_org_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.registrar_entrada_estoque(p_variant_sku character varying, p_quantity integer, p_unit_cost numeric, p_supplier_name character varying, p_document_number character varying, p_notes text, p_user_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.registrar_saida_estoque(p_variant_sku character varying, p_quantity integer, p_movement_type character varying, p_document_number character varying, p_notes text, p_user_id uuid, p_allow_negative boolean)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.request_discount_approval_transactional(_quote_id uuid, _seller_notes text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.respond_discount_approval_transactional(_request_id uuid, _approved boolean, _admin_notes text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.restore_collection_item_from_trash(_item_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.restore_seller_cart(_snapshot jsonb)` — Restauração do próprio carrinho (auth.uid())
- `public.start_step_up_challenge(_action text, _target_ref text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.user_is_org_member(org_id uuid)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.
- `public.verify_step_up_password(_challenge_id uuid, _password_attempt text)` — Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog; requer revisão funcional individual e novos grants continuam bloqueados.

### Allowlist `secdef-anon` — snapshot literal do `pg_catalog`

- `public.check_login_rate_limit(_email text, _ip text)` — Fluxo pré-autenticação: aplica rate limit antes da sessão existir. Grant canônico confirmado em pg_catalog em 2026-08-29.
- `public.fn_check_login_allowed(p_email text, p_ip_address text, p_city text, p_user_agent text)` — Fluxo pré-autenticação: valida bloqueios de login antes da sessão existir. Grant canônico confirmado em pg_catalog em 2026-08-29.
- `public.fn_global_search(p_term text, p_limit integer, p_types text[])` — Busca do catálogo público; retorna somente projeções expostas ao visitante. Grant canônico confirmado em pg_catalog em 2026-08-29.
- `public.fn_product_active_for_rls(p_id uuid)` — Helper de RLS do catálogo público usado para filtrar produtos ativos. Grant canônico confirmado em pg_catalog em 2026-08-29.
- `public.fn_super_filtro_facets(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean)` — Facetas do superfiltro público do catálogo. Grant canônico confirmado em pg_catalog em 2026-08-29.
- `public.fn_super_filtro_price_range(p_brands text[], p_category_slug text, p_target_audiences text[], p_is_textil boolean, p_is_thermal boolean, p_only_in_stock boolean)` — Faixa de preços do superfiltro público do catálogo. Grant canônico confirmado em pg_catalog em 2026-08-29.
- `public.fn_super_filtro(p_search_term text, p_category_slug text, p_category_id uuid, p_brands text[], p_only_in_stock boolean, p_min_price numeric, p_max_price numeric, p_target_audiences text[], p_is_kit boolean, p_is_textil boolean, p_is_thermal boolean, p_has_gift_box boolean, p_material_groups text[], p_technique_groups text[], p_color_groups text[], p_date_slugs text[], p_endomarketing boolean, p_limit integer, p_offset integer, p_sort text)` — Consulta paginada do superfiltro público do catálogo. Grant canônico confirmado em pg_catalog em 2026-08-29.
- `public.get_catalog_bestseller_page(p_sort text, p_limit integer, p_offset integer)` — Ranking paginado do catálogo público. Grant canônico confirmado em pg_catalog em 2026-08-29.
- `public.get_quote_token_by_value(_token text)` — Visualização pública de orçamento protegida por token opaco. Grant canônico confirmado em pg_catalog em 2026-08-29.
- `public.get_quote_token_public(_token text)` — Portal de aprovação de orçamento (SEC-009, 2026-09-04): substituto seguro de get_quote_token_by_value. Campos retornados: token, quote_id, client_name, signer_name, response_notes. Campos redactados: client_email, signer_document, signer_ip, signer_user_agent, signature_hash. Grant anon intencional — portal acessado via link de token sem autenticação.
- `public.submit_quote_response(_token text, _response text, _response_notes text)` — Resposta pública de orçamento protegida por token opaco e validação interna. Grant canônico confirmado em pg_catalog em 2026-08-29.
