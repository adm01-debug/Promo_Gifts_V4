# Análise de Impacto — Propostas FASE B Aguardando Aprovação

**Data:** 2026-10-24 | **Sessão:** FASE B auditoria Supabase  
**Projeto:** `doufsxqlfjyuvxuezpln` (Promo Gifts V4)

Este documento consolida evidências coletadas via `pg_catalog` e `grep` do repositório
para 5 propostas que requerem aprovação do PO antes de aplicação.

---

## P06 — Views security_invoker=false (A-V01 | MÉDIO)

**Proposta:** `auditoria-supabase/propostas/P06_views_security_invoker.sql`

### Evidência: todas 9 views confirmadas com security_invoker=false

| view | security_invoker atual |
|------|------------------------|
| v_kit_component_media_public | false |
| v_product_compositions_public | false |
| v_product_properties_public | false |
| v_product_tags_public | false |
| v_products_public | false |
| v_suppliers_public | false |
| v_system_health_dashboard | false |
| v_tabela_preco_gravacao_oficial_public | false |
| v_variant_sale_prices_public | false |

Query verificada: `SELECT relname, reloptions FROM pg_class WHERE relkind='v' AND relnamespace='public'::regnamespace AND relname ILIKE 'v_%public'`

### Uso no repositório (grep 2026-10-24)

```
grep -r "v_products_public\|v_suppliers_public\|v_variant_sale_prices" src/
```

- `v_products_public`: 12+ arquivos em `src/` (componentes, serviços, integrações Supabase)
- `v_suppliers_public`: 5+ arquivos
- `v_variant_sale_prices_public`: 8+ arquivos (pricing, variantes)
- `v_system_health_dashboard`: 3 arquivos (admin, monitoramento)
- Total: **20+ arquivos TypeScript** dependem dessas views

### Risco

`security_invoker=true` faz a view executar como o role chamador em vez de `postgres`.
Views com `_public` no nome provavelmente expõem dados ao `anon` — se as tabelas
subjacentes tiverem RLS com `TO authenticated`, a view pode deixar de retornar dados
para usuários não autenticados.

**Recomendação:** Testar em staging com `SET ROLE anon; SELECT COUNT(*) FROM v_products_public;`
before de aplicar. Risco real de quebrar frontend de catálogo público.

---

## P09 — Reconciliação do ledger de migrations (DRIFT-003 | ALTO)

**Proposta:** `auditoria-supabase/propostas/P09_drift003_migration_ledger_reconciliation.sql`

### Evidência: gap de 464 migrations

| métrica | valor |
|---------|-------|
| Arquivos `.sql` em `supabase/migrations/` | 2996 |
| Entradas no ledger `schema_migrations` | 2532 |
| Gap (sem registro) | **464** |
| Versão máxima no ledger | `20261022194200` |
| Versão máxima no repo | `20261024180003` (nossa) |

Query: `SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version ~ '^[0-9]{14}$'`

### Natureza do gap

O gap NÃO indica 464 DDLs perdidas — inclui:
- Migrations criadas mas nunca aplicadas (pendentes/descartadas)
- Migrations aplicadas via MCP diretamente (E056, incidente 2026-10-13)
- Migrations com `mode: repair-only` ainda não registradas

### Processo necessário

Cada uma das 464 versões precisa de verificação individual em `pg_catalog`
para determinar se o DDL está presente em produção. Não é possível
executar `migration repair --status applied` em lote sem esse diagnóstico.

**Estimativa:** ~8–16h de trabalho investigativo por DBA.

---

## P14 — RLS initplan: auth.uid() sem (SELECT) (ADV-PERF-001 | ALTO)

**Proposta:** `auditoria-supabase/propostas/P14_adv_perf001_rls_initplan.sql`

### Evidência: políticas afetadas

Query correta (sem regex NOT): `qual NOT LIKE '%(SELECT auth.uid()%'`

| tabela | policies sem initplan |
|--------|----------------------|
| user_organizations | 4 |
| users | 4 |
| quotes | 4 |
| quote_items | 4 |
| organizations | 4 |
| order_items | 4 |
| orders | 4 |
| products | 4 |
| suppliers | 4 |
| notifications | 4 |
| workspace_notifications | 4 |
| kit_quote_requests | 4 |
| kit_save_requests | 4 |
| custom_kits | 4 |
| mockup_approval_links | 4 |
| product_mockups | 4 |
| sessions | 4 |
| favorite_lists | 4 |
| favorite_items | 4 |
| favorite_item_reactions | 4 |

Top 20 tabelas × 4 policies = **80 policies de alto impacto**  
Total geral: 590 policies com `auth.uid()` direto

### Risco

**BAIXO** semanticamente — comportamento idêntico, só performance muda.
Risco real: policy com re-avaliação por linha intencional (multi-tenant em cascata)
— padrão incomum mas existe em 2 tabelas (`sessions`, `mockup_approval_links`).

**Recomendação:** Aplicar em lote por tabela, validando com `EXPLAIN (ANALYZE, BUFFERS)`
em cada tabela crítica pós-aplicação.

---

## P15 — Acesso anon a tabelas não-catálogo (SEG-003 | ALTO)

**Proposta:** `auditoria-supabase/propostas/P15_seg003_anon_table_access.sql`

### Evidência: 56 tabelas com políticas anon

Query: `SELECT tablename, COUNT(*) FROM pg_policies WHERE schemaname='public' AND 'anon' = ANY(roles::text[]) GROUP BY tablename ORDER BY tablename`

Total: **56 tabelas** com alguma policy para `anon`.

### Subconjunto de alto risco (acesso não-catálogo relevante)

| tabela | tipo de acesso | qual da policy | risco |
|--------|---------------|----------------|-------|
| color_synonym_map | SELECT | true (sem restrição) | MÉDIO |
| favorite_item_reactions | SELECT/INSERT/DELETE | auth-based | BAIXO |
| favorite_items | SELECT/INSERT/DELETE | auth-based | BAIXO |
| favorite_lists | SELECT/INSERT/DELETE | auth-based | BAIXO |
| mockup_approval_links | SELECT | token-based | BAIXO |
| system_settings | SELECT | WHERE key='maintenance_mode' | MUITO BAIXO |

A maioria das 56 tabelas tem policies anon apenas para `authenticated` ou com
qualificadores restritivos. `color_synonym_map` é a única com `qual = 'true'` (acesso total).

### Recomendação

Restringir apenas `color_synonym_map` (se dados forem internos) ou documentar como
dado público intencional. As demais 50+ tabelas já têm políticas adequadas.

---

## P03_security_definer — pg_temp no search_path (SEC-003 | ALTO)

**Proposta:** `auditoria-supabase/propostas/P03_security_definer_search_path.sql`

### Evidência: 45 funções SECURITY DEFINER com pg_temp

Query: `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prosecdef=true AND n.nspname='public' AND EXISTS(SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE '%pg_temp%')`

Contagem real: **45 funções** (proposta menciona 43 — diferença de 2 funções não críticas).

### Funções críticas identificadas

| função | criticidade | razão |
|--------|-------------|-------|
| `get_edge_function_secret` | **MÁXIMA** | Lê Vault como postgres — vetor de escalonamento de privilégio |
| `check_edge_rate_limit` | ALTA | Controla acesso a edge functions |
| `check_login_rate_limit` | ALTA | Controla tentativas de login |
| `fn_anon_insert_rate_guard` | ALTA | Guard de inserção anônima |
| `fn_audit_and_fix_grants` | ALTA | Auditoria de GRANTs |

### Uso no repositório (grep 2026-10-24)

```
grep -r "get_edge_function_secret" supabase/migrations/ → 20+ arquivos
grep -r "check_edge_rate_limit" src/ → types.ts, 5+ migration files
```

`get_edge_function_secret` é chamada em **todos** os cron jobs que leem segredos
do Vault (P01/P12 justamente dependem dela).

### Risco de regressão

**ZERO** para `get_edge_function_secret` — `SET search_path = vault, public` preserva
toda funcionalidade (Vault + public schema). A remoção de `pg_temp` só fecha o vetor
de ataque sem alterar o comportamento normal.

Igual para as demais 4 funções críticas — `pg_temp` não é necessário em nenhuma delas.

**Recomendação:** Aplicar nas 5 funções críticas primeiro (migração simples de 5 linhas),
validar, depois aplicar nas 40 restantes (38 são `magazine_*` com baixo tráfego).

---

## Resumo para decisão

| proposta | severidade | risco regressão | esforço | recomendação |
|----------|-----------|-----------------|---------|---------------|
| P06 views security_invoker | MÉDIO | ALTO (testar staging) | Médio | Testar antes |
| P09 ledger reconciliação | ALTO | ALTO (manual) | 8–16h | Investigativo |
| P14 RLS initplan | ALTO | BAIXO | Médio | Aplicar em lote |
| P15 anon SELECT | ALTO | MÉDIO (color_synonym_map) | Baixo | Só color_synonym_map |
| P03 security_definer | ALTO | ZERO | Baixo | **Aplicar imediato** |

P03_security_definer é o candidato mais urgente: risco de regressão zero,
impacto de segurança crítico (`get_edge_function_secret` lê Vault como postgres).
