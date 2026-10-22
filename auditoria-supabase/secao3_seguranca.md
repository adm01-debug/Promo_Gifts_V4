# Seção 3 — Segurança
## Auditoria Supabase `doufsxqlfjyuvxuezpln`
**Data:** 2026-10-22 | **Modo:** Somente Leitura

---

## 3.1 Edge Functions sem JWT (verify_jwt=false)

**Severidade: CRÍTICO**  
**Evidência:** `list_edge_functions` — 2026-10-22  
**Total:** 36 de 82 edge functions (43,9%) sem verificação de JWT

Ver detalhe completo em `inventario/edge_functions_verify_jwt_false.md`.

Funções com risco CRÍTICO:
| Função | Risco |
|--------|-------|
| `mcp-server` (v301) | Servidor MCP público exposto sem auth |
| `crm-db-bridge` (v301) | Ponte para BD CRM sem auth |
| `external-db-inspect` (v287) | Inspeção de BDs externos sem auth |
| `e2e-cleanup` (v297) | Limpeza de dados sem auth |
| `sync-external-db` (v251) | Sincronização BD externo sem auth |

**Impacto:** Qualquer agente externo pode invocar essas funções sem autenticação.
**Reprodução:** `curl https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/mcp-server` — retorna resposta sem 401.
**Correção proposta:** Habilitar `verify_jwt=true` + validação de token interno onde necessário.

---

## 3.2 RLS — Estado Geral

**Severidade: INFO (bom)**

| Métrica | Valor | Evidência |
|---------|-------|-----------|
| Tabelas com RLS desabilitado | **0** | `SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` → `[]` |
| Tabelas com RLS habilitado e zero policies | **0** | Query `NOT EXISTS(pg_policies)` → `[]` |
| Tabelas com APENAS policies RESTRICTIVE | **2** | `cnpj_backfill_audit`, `ops_grant_audit` (audit tables — intencional) |
| Total de policies RLS (public) | **960** | `SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'` |

**Conclusão:** RLS corretamente habilitado em todas as tabelas públicas. As 2 tabelas com only-restrictive são audit tables acessíveis apenas via service_role (intencional).

---

## 3.3 Policies USING(true) para ALL sem filtro de role

**Severidade: MÉDIO**

Há políticas `PERMISSIVE` com `USING(true)` para operações ALL (`authenticated` + `service_role`). Exemplos:

| Tabela | Policy | Roles | Risco |
|--------|--------|-------|-------|
| `ai_usage_quotas` | `rls_restrictive_ai_usage_quotas` | authenticated, service_role | RESTRICTIVE com USING(true) → sem restrição de linha |
| `system_kill_switches` | `rls_restrictive_system_kill_switches` | authenticated, service_role | Kill switches legíveis por todos os autenticados |

**Nota:** Verificado que essas são RESTRICTIVE policies que coexistem com PERMISSIVE policies mais específicas. O risco real depende do conjunto completo de policies por tabela.

---

## 3.4 SECURITY DEFINER com pg_temp no search_path

**Severidade: MÉDIO**

**Total SECURITY DEFINER em public:** 570 de 1.334 funções (42,7%)  
**Com pg_temp no search_path:** 43 funções

**Evidência:**
```sql
SELECT fn, proconfig FROM pg_proc p 
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.prosecdef=true AND n.nspname='public'
  AND EXISTS(SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE '%pg_temp%')
```

Funções de maior risco (security-critical com pg_temp):

| Função | search_path | Risco |
|--------|-------------|-------|
| `get_edge_function_secret` | `vault, public, pg_temp` | ALTO — lê segredos do vault com pg_temp no path |
| `check_edge_rate_limit` | `public, pg_temp` | MÉDIO — guarda de rate limit com pg_temp |
| `check_login_rate_limit` | `public, pg_temp` | MÉDIO — guarda de login com pg_temp |
| `fn_anon_insert_rate_guard` | `public, pg_temp` | MÉDIO — guarda de inserção anon |
| `fn_audit_and_fix_grants` | `public, pg_temp` | MÉDIO — modifica grants |

**Risco:** Em SECURITY DEFINER (roda como `postgres`), se `pg_temp` está no search_path e uma sessão cria um objeto temporário com o mesmo nome de uma função chamada internamente, há risco de execução de código com privilege escalation.

**Severidade real para `get_edge_function_secret`:** ALTO — acessa vault com search_path que inclui pg_temp.  
**Severidade para demais:** MÉDIO — pg_temp está *após* public no search_path (menor risco que se estivesse antes).

**Correção proposta:** Remover `pg_temp` do search_path de funções SECURITY DEFINER. Ou trocar para `search_path = ''` (string vazia = mais seguro).

---

## 3.5 Resumo de Achados Seção 3

| ID | Severidade | Objeto | Achado |
|----|-----------|--------|--------|
| SEC-001 | CRÍTICO | 5 edge functions | verify_jwt=false em funções críticas (mcp-server, crm-db-bridge, etc.) |
| SEC-002 | ALTO | 31 edge functions | verify_jwt=false em funções de alto risco |
| SEC-003 | ALTO | `get_edge_function_secret` | SECURITY DEFINER lê vault com pg_temp no search_path |
| SEC-004 | MÉDIO | 42 funções | SECURITY DEFINER com pg_temp no search_path |
| SEC-005 | MÉDIO | 570 funções | Alto ratio SECURITY DEFINER (42.7% de todas as public functions) |
| SEC-006 | INFO | todas tabelas public | RLS habilitado corretamente em 100% das tabelas |
| SEC-007 | INFO | `cnpj_backfill_audit`, `ops_grant_audit` | Only-restrictive RLS intencional (audit tables) |

---

## NÃO VERIFICADO nesta seção

- Inspeção do código-fonte das edge functions críticas (sem execute/deploy)
- Validação do conteúdo dos webhooks (pg_net) quanto a assinatura
- Verificação de service_role key no frontend (requer análise de bundle)
- Advisors de segurança Supabase (timeout na chamada get_advisors)
- Configuração de auth (MFA obrigatório, OTP expiração, etc.)
- Policies de storage (public buckets)
- Valores de secrets em vault (somente leitura de nomes permitida)
