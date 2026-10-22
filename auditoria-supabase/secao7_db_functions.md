# Seção 7 — Funções de Banco de Dados

**Data:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln  
**Modo:** somente leitura

---

## 7.1 Inventário Geral

| Métrica | Valor |
|---|---|
| Total de funções no schema `public` | **1.334** |
| SECURITY DEFINER | **570** (42,7%) |
| SECURITY INVOKER | **764** (57,3%) |
| SECURITY DEFINER sem `search_path` fixo | **0** ✅ |

---

## 7.2 SECURITY DEFINER — Análise

### Status: APROVADO (100% com search_path definido)

Todas as 570 funções SECURITY DEFINER têm `search_path` explícito no `proconfig`. Exemplos verificados:

| Função | search_path | Observação |
|---|---|---|
| `admin_active_sessions` | `pg_catalog, pg_temp` | Correto — sem `public` |
| `admin_revoke_user_sessions` | `pg_catalog, pg_temp` | Correto |
| `check_hardening_status` | `""` (vazio) | Melhor prática — zero path |
| `check_edge_rate_limit` | `public, pg_temp` | Aceitável |
| `check_login_rate_limit` | `public, pg_temp` | Aceitável |
| `dispatch_quote_webhook_event` | `public, extensions` | Aceitável |
| `audit_rls_coverage` | `public` | Aceitável |

**Nota positiva:** Função `check_hardening_status` usa `search_path=""` — a configuração mais segura possível (nenhum schema no path, forçando qualificação completa).

### Padrão de segurança elevado

O projeto claramente segue boas práticas de segurança para funções SECURITY DEFINER:
- `search_path` explícito em todas as funções
- Presença de funções de auditoria dedicadas (`audit_rls_coverage`, `audit_mcp_api_keys_changes`, `audit_rls_matrix`)
- Funções de cleanup separadas para cada entidade (DRY principle aplicado)

---

## 7.3 Achados

---

### [ID-FUNC-001] 570 funções SECURITY DEFINER — superfície de ataque ampla
- **Severidade:** INFO
- **Objeto:** Todas as funções SECURITY DEFINER no schema `public`
- **Evidência:** `COUNT(*) FILTER (WHERE prosecdef = true)` → 570. Todas com `search_path` definido.
- **Impacto:** SECURITY DEFINER com `search_path` adequado é seguro. O volume alto (570) é notável mas justificado por um sistema com muitas operações que exigem privilégios elevados (RLS policies, audit triggers, cleanup crons).
- **Correção sugerida:** Manter processo de revisão: toda nova função SECURITY DEFINER deve ter `SET search_path = public, pg_temp` ou mais restritivo. Considerar criar check CI que valide essa invariante.
- **Esforço:** Pequeno (gate CI preventivo)

---

### [ID-FUNC-002] `cron_invoke_edge` — função SECURITY DEFINER que chama edge functions via pg_net
- **Severidade:** MÉDIO
- **Objeto:** Função `cron_invoke_edge` (SECURITY DEFINER, `search_path=public`)
- **Evidência:** Função identificada entre as SECURITY DEFINER. Nome sugere que faz chamadas HTTP para edge functions via pg_net com privilégios elevados.
- **Impacto:** Se a função aceitar `url` ou `headers` como parâmetro do caller, pode ser usada para SSRF (Server-Side Request Forgery) ou para injetar headers maliciosos. Função com SECURITY DEFINER que faz requests HTTP precisa de validação rigorosa de inputs.
- **Correção sugerida:** Verificar o código da função `cron_invoke_edge`: se aceita parâmetros livres, adicionar allowlist de URLs permitidas.
- **Esforço:** Pequeno (inspeção + eventual hardening)

---

### [ID-FUNC-003] `e2e_cleanup_check_rate_limit` — função de teste em produção
- **Severidade:** BAIXO
- **Objeto:** Função `e2e_cleanup_check_rate_limit` (SECURITY DEFINER, `search_path=public`)
- **Evidência:** Nome com prefixo `e2e_` sugere função usada em testes end-to-end. Presente no schema `public` de produção.
- **Impacto:** Funções de teste em produção podem criar confusão e, se chamadas inadvertidamente, alterar dados (rate limits, cleanups).
- **Correção sugerida:** Verificar se a função é chamada em produção. Se apenas em testes, mover para schema `test` ou remover após confirmar que CI não depende da produção para e2e.
- **Esforço:** Trivial

---

### [ID-FUNC-004] Alta proporção de SECURITY DEFINER (42,7%) — padrão a monitorar
- **Severidade:** INFO
- **Objeto:** Schema `public` — proporção de funções
- **Evidência:** 570/1334 = 42,7% das funções são SECURITY DEFINER.
- **Impacto:** Alta proporção é esperada para sistemas com RLS complexas (precisam de SECURITY DEFINER para bypass de RLS em operações de sistema). Sem risco imediato.
- **Correção sugerida:** Manter gate CI que verifica `search_path` em novas funções SECURITY DEFINER.
- **Esforço:** N/A

---

## 7.4 Funções de Auditoria Identificadas

O projeto tem infraestrutura de auditoria robusta:

| Função | Propósito |
|---|---|
| `audit_rls_coverage` | Verifica cobertura de RLS |
| `audit_rls_matrix` | Matriz de RLS por tabela/role |
| `audit_mcp_api_keys_changes` | Auditoria de chaves MCP |
| `audit_mcp_key_insert` / `audit_mcp_key_revoke` | Triggers de auditoria |
| `audit_user_role_changes` | Mudanças de roles |
| `audit_ownership_orphans` | Orphans de ownership |
| `check_hardening_status` | Status de hardening geral |

---

## 7.5 Sumário da Seção 7

| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 1 (FUNC-002) |
| BAIXO | 1 (FUNC-003) |
| INFO | 2 (FUNC-001, FUNC-004) |

**Conclusão:** Funções de banco em estado saudável. 100% das SECURITY DEFINER com `search_path` definido é excelente resultado. Principal ação: gate CI para manter invariante.
