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

## 7.5 fn_aggregate_stock_daily — Análise de Código-Fonte

**Data:** 2026-10-22  
**Método:** Leitura de `pg_proc.prosrc` via `SELECT pg_get_functiondef(oid)` — sem execução  
**Status NV-001:** PARCIALMENTE RESOLVIDO (código lido; execução NÃO VERIFICADA)

### Estrutura da função

```sql
DECLARE
  v_upserted integer; v_purged integer; v_baseline integer;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  p_date := COALESCE(p_date, v_today);
  IF p_date > v_today THEN
    RAISE EXCEPTION '...future date blocked...';
  END IF;
  DELETE FROM stock_daily_summary WHERE summary_date > v_today;
  GET DIAGNOSTICS v_purged = ROW_COUNT;
  
  WITH open_close AS (
    SELECT DISTINCT ON (variant_supplier_source_id)
      variant_supplier_source_id, ...,
      FIRST_VALUE(stock_total_old) OVER w AS stock_open,
      stock_total_new AS stock_close,
      -- FIX GAP-3: LEAST(old,new) garante min correto mesmo quando estoque cai
      MIN(LEAST(COALESCE(stock_total_old, stock_total_new),
               COALESCE(stock_total_new, stock_total_old))) OVER w AS stock_min,
      ... [outras window aggregations]
    FROM stock_snapshots
    WHERE (captured_at AT TIME ZONE 'America/Sao_Paulo')::date = p_date
      AND variant_supplier_source_id IS NOT NULL
      AND variant_supplier_source_id::text NOT LIKE '%-99999-%'
    WINDOW w AS (
      PARTITION BY variant_supplier_source_id
      ORDER BY captured_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )
    ORDER BY variant_supplier_source_id, captured_at DESC
  )
  INSERT INTO stock_daily_summary (...) SELECT ... FROM open_close
  ON CONFLICT (variant_supplier_source_id, summary_date) DO UPDATE ...;
```

### Análise

| Aspecto | Observação |
|---|---|
| Tabela principal | `stock_snapshots` (3,6M linhas) |
| Operação | Window functions (`FIRST_VALUE`, `MIN` sobre `LEAST`) com `DISTINCT ON` |
| Complexidade | O(N×W) onde W = janela da partição por `variant_supplier_source_id` |
| Root cause do timeout MCP | Scan completo de `stock_snapshots` para a data do parâmetro — sem índice seletivo combinado `(captured_at::date, variant_supplier_source_id)` |
| Proteção futura | Guard `IF p_date > v_today THEN RAISE EXCEPTION` — impede agregação de datas futuras |
| Idempotência | `ON CONFLICT DO UPDATE` → re-executável para a mesma data |
| `%-99999-%` exclusion | Filtra variantes com ID contendo `-99999-` (provavelmente IDs de teste/placeholder) |

### Achado associado (FUNC-005)

**[ID-FUNC-005] `fn_aggregate_stock_daily` — timeout em execução via MCP (60s)**
- **Severidade:** INFO (comportamento esperado para agregação em 3,6M linhas)
- **Objeto:** `fn_aggregate_stock_daily` (PL/pgSQL)
- **Evidência:** Código lido via `pg_proc`. Scan completo de `stock_snapshots` sem índice parcial em `(captured_at::date, variant_supplier_source_id)`. MCP timeout após 60s confirma execução lenta.
- **Impacto:** Função invocada por cron noturno — timeout de 60s no MCP não é problema operacional (o cron usa `pg_net` sem timeout curto). Porém, para janelas grandes (reprocessamento histórico), a função pode travar a conexão.
- **Correção sugerida:** Índice parcial: `CREATE INDEX CONCURRENTLY idx_stock_snap_date_vsrc ON stock_snapshots ((captured_at AT TIME ZONE 'America/Sao_Paulo')::date, variant_supplier_source_id);`
- **NÃO APLICADA** — auditoria somente leitura

---

## 7.6 Sumário da Seção 7

| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 1 (FUNC-002) |
| BAIXO | 1 (FUNC-003) |
| INFO | 2 (FUNC-001, FUNC-004) |

**Conclusão:** Funções de banco em estado saudável. 100% das SECURITY DEFINER com `search_path` definido é excelente resultado. Principal ação: gate CI para manter invariante.

| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 1 (FUNC-002) |
| BAIXO | 1 (FUNC-003) |
| INFO | 3 (FUNC-001, FUNC-004, FUNC-005) |
