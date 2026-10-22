# Seção 1 — Inventário Completo
**Projeto:** `doufsxqlfjyuvxuezpln` (GESTÃO DE PRODUTOS — Promo Gifts V4)  
**Data da auditoria:** 2026-10-22  
**Modo:** somente leitura — nenhuma escrita realizada

---

## 1.1 Schemas (24 não-sistema)

| Schema | Finalidade |
|---|---|
| `analytics` | Dados analíticos agregados |
| `api` | Camada de API |
| `auth` | Autenticação (Supabase Auth) |
| `cf_recon` | Reconciliação Cloudflare |
| `classification_audit` | Auditoria de classificação |
| `cron` | Jobs agendados (pg_cron) |
| `extensions` | Extensões PostgreSQL |
| `graphql` / `graphql_public` | GraphQL |
| `internal` | Funções internas Supabase |
| `net` | HTTP (pg_net) |
| `pgbouncer` | Pool de conexões |
| `pgmq` | Message queue |
| `prod_audit` | Auditoria de produção |
| `public` | Schema principal da aplicação |
| `realtime` | Realtime subscriptions |
| `repack` | pg_repack (reorganização online) |
| `storage` | Storage (buckets) |
| `supabase_functions` | Edge functions metadata |
| `supabase_migrations` | Ledger de migrations |
| `supplier_stricker` | Dados fornecedor Stricker |
| `vault` | Vault (secrets) |

---

## 1.2 Extensões (18)

| Extensão | Versão | Schema |
|---|---|---|
| http | — | extensions |
| hypopg | — | extensions |
| index_advisor | — | extensions |
| moddatetime | — | extensions |
| **pg_cron** | **1.6.4** | cron |
| pg_graphql | — | graphql |
| **pg_net** | **0.19.5** | extensions |
| pg_repack | — | extensions |
| pg_stat_statements | — | extensions |
| pg_trgm | — | public |
| pgcrypto | — | extensions |
| **pgmq** | **1.5.1** | pgmq |
| pgstattuple | — | extensions |
| plpgsql | — | pg_catalog |
| **supabase_vault** | **0.3.1** | vault |
| unaccent | — | extensions |
| uuid-ossp | — | extensions |
| wrappers | 0.5.7 | extensions |

---

## 1.3 Tabelas (schema public)

Total: **~388 tabelas** no schema `public` com RLS habilitado em todas.

> Evidência: `SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relkind='r'` → 388 rows  
> Evidência RLS: `SELECT COUNT(*) FROM pg_class WHERE relrowsecurity = false AND relnamespace = 'public'::regnamespace AND relkind = 'r'` → 0 (todas com RLS)

Seleção de tabelas críticas confirmadas presentes:
- ✅ `products`, `product_variants`, `suppliers`, `supplier_products_raw`
- ✅ `personalization_techniques`
- ✅ `magazines`, `magazine_items`, `magazine_templates`
- ✅ `organizations`, `organization_members`
- ✅ `orders`, `order_items`
- ✅ `stock_snapshots`

---

## 1.4 Views (194 views no schema public)

Total: 194 views. Classificação por `security_invoker`:
- **185 com `security_invoker=true`** ✅ (rodam como chamador — correto)
- **9 SEM `security_invoker`** ⚠️ (rodam como dono da view — bypass potencial de RLS)

### Views sem security_invoker (rodam como owner):

| View | Risco |
|---|---|
| `v_kit_component_media_public` | Médio — dados de mídia pública |
| `v_product_compositions_public` | Médio — composição de produtos |
| `v_product_properties_public` | Médio — propriedades de produto |
| `v_product_tags_public` | Baixo — tags públicas |
| `v_products_public` | **Alto** — catálogo público completo, acesso direto do frontend |
| `v_suppliers_public` | Médio — dados de fornecedores |
| `v_system_health_dashboard` | **Alto** — métricas internas do sistema |
| `v_tabela_preco_gravacao_oficial_public` | Médio — tabela de preço de gravação |
| `v_variant_sale_prices_public` | Médio — preços de venda públicos |

> ⚠️ **Achado A-V01**: Essas views herdam permissões do owner (geralmente `postgres`), podendo expor dados sem aplicar RLS das tabelas subjacentes para o papel `anon`. Requer confirmação com `SET ROLE anon; SELECT * FROM v_products_public LIMIT 1` em contexto não-produção.

---

## 1.5 Triggers

Total: **>100 triggers** no schema `public` + 1 no schema `auth`.

### Trigger crítico:
- **`on_auth_user_created`** (schema `auth`, tabela `users`, AFTER INSERT): executa `handle_new_user()` — cria perfil automaticamente no signup.

### Padrões identificados:
- Maioria são triggers `BEFORE UPDATE` para atualizar `updated_at` (usando `fn_set_updated_at()`, `set_updated_at()`, `moddatetime()` ou variantes)
- Triggers de rate guard: `trg_anon_rate_guard` em `analytics_events` e `catalog_analytics` (INSERT, BEFORE) — protege inserção anônima
- Triggers de auditoria: `fn_audit_row_change()` em `discount_approval_requests`
- Triggers de integridade: `prevent_category_loops`, `trg_dar_forbid_reopen`
- Trigger de soft delete: `move_collection_item_to_trash` (tabela `collection_items`)
- Trigger de owner enforcement: `enforce_user_id_owner()`, `enforce_seller_id_owner()`

---

## 1.6 Enums (15)

| Enum | Valores (resumo) |
|---|---|
| `app_role` | admin, seller, buyer, … |
| `categoria_cor_enum` | tipos de cor |
| `conversation_event_type` | eventos de conversa |
| `familia_cor_enum` | famílias de cores |
| `magazine_reaction_kind` | reações em magazines |
| `magazine_status` | estados de publicação |
| `org_role` | admin, member, … |
| `payment_status` | pending, paid, … |
| `produtos_padronizacao_status` | pipeline de padronização |
| `role_migration_item_status` | status de migração de role |
| `role_migration_status` | status de batch de migração |
| `silver_norm_status` | normalização Silver |
| `step_up_action` | ações de step-up auth |
| `supplier_raw_status` | status Bronze |
| `tipo_cor_enum` | tipos de cor |

---

## 1.7 Sequences (23)

Todas as sequences estão com utilização < 0,01% do limite de `bigint`. Nenhuma próxima de overflow.

---

## 1.8 Crons (pg_cron)

Total: **~100 jobs ativos** + **7+ jobs inativos** (active=false).

Jobs inativos identificados (possíveis órfãos):
- `dispatcher-log-sync`
- `monitor-connections`
- `pipeline-classify-categories`
- `refresh-analytics-mv-product-intelligence`
- `refresh-analytics-mv-stock-velocity`
- `generate-blurhashes`
- `process-webhook-outbox`

> ⚠️ **Achado A-C01**: Job `image-dimensions-backfill` (jobid=235) chama edge function `run-script` sem nenhum header de autenticação. Se a função não valida internamente, qualquer chamada não autenticada consegue executá-la.

---

## 1.9 Edge Functions (109 publicadas)

Total: **109 edge functions** com status ACTIVE.

Por `verify_jwt`:
- `verify_jwt=true`: 73 funções (protegidas por JWT)
- `verify_jwt=false`: **36 funções** ⚠️

### Funções de alto risco com verify_jwt=false:
| Função | Risco |
|---|---|
| `mcp-server` | **CRÍTICO** — servidor MCP sem autenticação JWT |
| `external-db-inspect` | **CRÍTICO** — inspeção de DB externo sem JWT |
| `crm-db-bridge` | **ALTO** — ponte para CRM sem JWT |
| `sync-external-db` | **ALTO** — sincronização de BD externo sem JWT |
| `e2e-cleanup` | **ALTO** — limpa dados (ação destrutiva) sem JWT |
| `magazine-reader-state-write` | **ALTO** — escrita de estado sem JWT |

> ⚠️ **Achado A-EF01**: 36 funções com verify_jwt=false. Necessário verificar se cada uma implementa validação própria de autorização.

---

## 1.10 Buckets de Storage (11)

| Bucket | Público? | Observação |
|---|---|---|
| `avatars` | **Sim** ⚠️ | Imagens de avatar |
| `mockup-assets` | **Sim** ⚠️ | Assets de mockup |
| `art-files` | Não | Arquivos de arte |
| `categories` | Não | Imagens de categorias |
| `generated-mockups` | Não | Mockups gerados |
| `magazines` | Não | Magazines |
| `private-assets` | Não | Assets privados |
| `product-images` | Não | Imagens de produto |
| `products` | Não | Arquivos de produto |
| `supplier-assets` | Não | Assets de fornecedor |
| `user-uploads` | Não | Uploads do usuário |

> **Nota**: Buckets públicos `avatars` e `mockup-assets` expõem URLs diretamente sem autenticação. Verificar policies de storage (seção 9 — Agente D).

---

## 1.11 Publicações Realtime (2)

| Publicação | puballtables | INSERT | UPDATE | DELETE | TRUNCATE |
|---|---|---|---|---|---|
| `supabase_realtime` | false | ✅ | ✅ | ✅ | ✅ |
| `supabase_realtime_messages_publication` | false | ✅ | ✅ | ✅ | ✅ |

> `puballtables=false` significa que apenas tabelas explicitamente adicionadas recebem eventos Realtime. Verificar quais tabelas estão na publicação (query de `pg_publication_tables` falhou por timeout; a ser reanalisada pela Seção 9).

---

## 1.12 Grants Anon em Tabelas Públicas

Total: **~200 tabelas** com pelo menos um privilege de WRITE (INSERT/UPDATE/DELETE) concedido ao papel `anon`.

> ⚠️ **Achado A-G01 (ALTO)**: O papel `anon` (usuário não autenticado) possui GRANT de INSERT/UPDATE/DELETE em aproximadamente 200 tabelas do schema `public`. A proteção real depende exclusivamente das RLS policies. Tabelas de alto risco com grants excessivos para anon:

| Tabela | anon_select | anon_insert | anon_update | anon_delete |
|---|---|---|---|---|
| `ai_function_routing` | ❌ | ✅ | ✅ | ✅ |
| `ai_models` | ❌ | ✅ | ✅ | ✅ |
| `orders` | ❌ | ✅ | ✅ | ✅ |
| `organizations` | ❌ | ✅ | ✅ | ✅ |
| `organization_members` | ❌ | ✅ | ✅ | ✅ |
| `permissions` | ❌ | ✅ | ✅ | ✅ |
| `role_permissions` | ❌ | ✅ | ✅ | ✅ |
| `user_organizations` | ❌ | ✅ | ✅ | ✅ |
| `system_settings` | ✅ | ✅ | ✅ | ✅ |
| `color_synonym_map` | ✅ | ✅ | ✅ | ✅ |
| `content_articles` | ✅ | ✅ | ✅ | ✅ |
| `favorite_items` | ✅ | ✅ | ✅ | ✅ |

> **Nota**: Em Supabase, é padrão conceder todos os privilégios ao anon e controlar acesso via RLS. A verificação real das policies RLS está na Seção 11 (Agente D).

---

## 1.13 Migrations Aplicadas

- Total no ledger: **2.538 migrations**
- Mais recente: `20261019000000` — `mirror_oob_frontend_telemetry_v_system_health_dashboard`
- Mais antiga numerada: `20241231000000`
- Versões especiais: `001`–`005` (migrações legadas sem timestamp)

---

## 1.14 Resumo de Achados da Seção 1

| ID | Tipo | Severidade | Descrição |
|---|---|---|---|
| A-V01 | Views sem security_invoker | MÉDIO | 9 views sem security_invoker=true podem expor dados via permissões do owner |
| A-C01 | Cron sem autenticação | CRÍTICO | `image-dimensions-backfill` chama edge function sem headers de auth |
| A-EF01 | verify_jwt=false | ALTO | 36 edge functions publicadas sem verificação JWT, incluindo mcp-server e external-db-inspect |
| A-G01 | Grants excessivos anon | ALTO | ~200 tabelas com anon INSERT/UPDATE/DELETE; proteção depende 100% de RLS |
| A-B01 | Buckets públicos | MÉDIO | 2 buckets públicos (avatars, mockup-assets) sem restrição de URL |
| A-M01 | Crons inativos | BAIXO | 7+ jobs desativados (possíveis órfãos) |
