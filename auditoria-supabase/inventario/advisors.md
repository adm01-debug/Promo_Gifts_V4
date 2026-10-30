# A.3 / A.5 — Supabase Advisors

Data: 2026-10-27

## SECURITY ADVISORS

### Totais por nível
- ERROR: 1 categoria
- WARN: 5 categorias

---

### [ERROR] security_definer_view — Security Definer View

**count: 8 views**

Views com SECURITY DEFINER — executam com permissões do criador, contornando RLS do usuário atual.

Objetos afetados:
- `public.v_products_public`
- `public.v_tabela_preco_gravacao_oficial_public`
- `public.v_product_compositions_public`
- + 5 outras views

Remediação: Revisar se o SECURITY DEFINER é intencional; se não, remover a propriedade.

---

### [WARN] anon_security_definer_function_executable — Public Can Execute SECURITY DEFINER Function

**count: 10 funções acessíveis pelo role `anon`**

Funções críticas:
- `public.check_login_rate_limit(_email, _ip)` — anon pode chamar via RPC
- `public.fn_global_search(p_term, p_limit, p_types)` — busca global pública com SECURITY DEFINER
- `public.fn_product_active_for_rls(p_id)` — helper RLS acessível publicamente

Remediação: Revogar EXECUTE do anon ou converter para SECURITY INVOKER.

---

### [WARN] authenticated_security_definer_function_executable — Signed-In Users Can Execute SECURITY DEFINER Function

**count: 100 funções**

Funções críticas expostas ao role `authenticated`:
- `public.admin_active_sessions()` — listagem de sessões admin
- `public.admin_revoke_user_sessions(_user_id)` — revogação de sessões
- `public.can_access_quote(_quote_id)` — verificação de acesso

Remediação: Verificar se cada função admin deve ser acessível a todo usuário autenticado.

---

### [WARN] pg_graphql_anon_table_exposed — Public Can See Object in GraphQL Schema

**count: 58 objetos visíveis ao anon via GraphQL**

Exemplos:
- `internal.mv_product_leaf_category` (materialized view)
- `public.categories` (table)
- `public.collection_products` (table)

Remediação: Revogar SELECT do anon nos objetos que não devem ser públicos.

---

### [WARN] pg_graphql_authenticated_table_exposed — Signed-In Users Can See Object in GraphQL Schema

**count: 455 objetos visíveis ao authenticated via GraphQL**

Exemplos:
- `analytics.categories_tree_visual` (mat view)
- `analytics.mv_product_cards`
- `analytics.mv_product_compositions`

Remediação: Revogar SELECT do authenticated em objetos sensíveis.

---

### [WARN] extension_in_public — Extension in Public Schema

**count: 2 extensões no schema public**

- `pgstattuple` no schema `public`
- `pg_repack` no schema `public`

Remediação: Mover para schema separado (`extensions`).

---

## PERFORMANCE ADVISORS

### Totais por nível
- WARN: 1 categoria
- INFO: 4 categorias

---

### [WARN] auth_rls_initplan — Auth RLS Initialization Plan

**count: 8 tabelas**

Tabelas com políticas RLS re-avaliando `auth.uid()` / `current_setting()` por linha:
- `public.ai_usage_quotas` (4 policies)
- `public.art_file_attachments`
- + outras

Remediação: Substituir `auth.uid()` por `(select auth.uid())` nas policies.

---

### [INFO] unused_index — Unused Index

**count: 456 índices não utilizados**

Exemplos:
- `idx_sm_url_map_supplier_id` em `sm_site_url_map`
- `idx_search_analytics_seller_created` em `search_analytics`
- `idx_search_analytics_seller_term_created` em `search_analytics`

---

### [INFO] unindexed_foreign_keys — Unindexed Foreign Keys

**count: 2 FKs sem índice**

- `kit_quote_requests.kit_quote_requests_user_id_fkey`
- `kit_save_requests.kit_save_requests_user_id_fkey`

---

### [INFO] table_bloat — Table Bloat

**count: 1**

- `net._http_response` com bloat excessivo (pg_net responses acumuladas)

---

### [INFO] auth_db_connections_absolute — Auth DB Connection Strategy

Auth configurado com max **10 conexões absolutas** (não percentual). Escalar instância não melhora Auth sem ajuste manual.
