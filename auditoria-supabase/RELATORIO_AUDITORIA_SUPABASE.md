# Relatório de Auditoria Supabase — Promo Gifts V4

**Projeto:** `doufsxqlfjyuvxuezpln`  
**Data:** 2026-10-27  
**Auditor:** Claude Code (sessão: session_01VXkRxX4vkrqFTfH53NAEBx)  
**Repo:** `adm01-debug/Promo_Gifts_V4`

---

## Status por Seção

| Seção | Título | Status | Achados |
|-------|--------|--------|---------|
| A.0 | Baseline inventário | PARCIAL (agente em background) | — |
| A.1 | Inventário completo | PARCIAL (agente em background) | — |
| A.2 | Drift repo↔produção | PARCIAL (agente em background) | — |
| A.3 | Segurança (RLS, secrets) | CONCLUÍDO | 4 achados |
| A.4 | Integridade estrutural | PARCIAL | — |
| A.5 | Performance | PARCIAL (agente em background) | — |
| A.6 | Cron jobs | NÃO VERIFICADO (agente inventário pendente) | — |
| A.7 | DB functions | NÃO VERIFICADO (agente inventário pendente) | — |
| A.8 | Edge functions | CONCLUÍDO | 7 achados |
| A.9 | Auth/Storage/Realtime | PARCIAL (agente em background) | — |
| A.10 | Logs 7d | PARCIAL — logs 24h consultados | — |
| A.11 | RLS na prática | NÃO VERIFICADO — requer query read-only com ROLLBACK | — |
| A.12 | Lacunas operacionais | PARCIAL (ver achados abaixo) | — |

---

## Contagem por Severidade

| Severidade | Qtd |
|------------|-----|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 2 |
| BAIXO | 6 |
| INFO | 4 |
| OPERACIONAL | 2 |

---

## A.3 — Segurança: RLS, Policies, Secrets

### Evidências positivas (o que está OK)

**RLS universalmente ativo:**
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;
-- Resultado: [] (vazio) — TODAS as tabelas têm RLS habilitado
```

**Sem "deny-all" silencioso:**
```sql
SELECT t.tablename FROM pg_tables t WHERE t.schemaname='public' AND t.rowsecurity=true
  AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname=t.schemaname AND p.tablename=t.tablename);
-- Resultado: [] (vazio) — não há tabelas com RLS ativo e zero policies
```

### Achados A.3

**SEC-DB-001 — MÉDIO: 8 views com SECURITY DEFINER expostas ao role `anon`**

**Evidência (Supabase Advisor `security_definer_view` = ERROR):**
- `v_products_public`
- `v_tabela_preco_gravacao_oficial_public`
- `v_product_compositions_public`
- `v_product_tags_public`
- `v_variant_sale_prices_public`
- `v_product_properties_public`
- `v_kit_component_media_public`
- `v_suppliers_public`

Views SECURITY DEFINER executam com os privilégios do dono da view (normalmente `postgres` ou `authenticator`), não do chamador. Se uma dessas views tiver lógica com `auth.uid()` ou `current_user`, o comportamento pode ser inesperado. Pior: se a view acessar dados sensíveis, um exploit na query pode escalar para outros schemas.

**Avaliação contextual:** As views têm sufixo `_public`, sugerindo que são intencionalmente públicas para o catálogo. O risco real depende da definição de cada uma. **Recomendação:** migrar para `security_invoker = true` onde possível (PG17 suporta).

---

**SEC-DB-002 — BAIXO: `submit_quote_response` executável pelo role `anon`**

**Evidência:**
```sql
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
WHERE p.prosecdef=true AND n.nspname='public'
  AND has_function_privilege('anon', p.oid, 'EXECUTE');
-- Resultado inclui: submit_quote_response, check_login_rate_limit, get_quote_token_public, get_sitemap_public, fn_super_filtro, fn_global_search, fn_product_active_for_rls, ...
```

`submit_quote_response` (SECURITY DEFINER, executável por anon) merece revisão: um usuário não autenticado chamar uma função de submissão de resposta de orçamento é no mínimo incomum. As demais (`get_sitemap_public`, `fn_super_filtro`, catálogo) são publicáveis por design.

---

**SEC-DB-003 — INFO: Advisor `extension_in_public` (WARN)**  
Extensões instaladas no schema `public` (em vez de schema dedicado). Pode causar conflitos de nome com tabelas/funções do usuário. Sem impacto direto de segurança se não há extensões críticas como `pg_cron` no schema public.

---

**SEC-DB-004 — INFO: Advisor `pg_graphql_anon_table_exposed` (WARN)**  
Tabelas do catálogo visíveis via GraphQL para `anon`. Para um catálogo B2B isso pode ser intencional. Verificar se dados sensíveis (preços, margens) estão acessíveis. Sem evidência de dado sensível exposto — NÃO VERIFICADO em profundidade.

---

## A.8 — Edge Functions: Segurança

**Total publicadas:** 109  
**Com verify_jwt=false:** 36  
**Sem auth algum (verify_jwt=false E sem in-code auth):** 0

### Achados A.8

**SEC-EF-001 — MÉDIO: Comparação de segredo não-constant-time em `webhook-dispatcher`**

**Evidência:**
```
supabase/functions/webhook-dispatcher/index.ts:56
if (!incoming || incoming !== dispatcherSecret) {
```
Usa operador `!==` (direto), não `constantTimeEqual()` que existe no módulo `_shared/dispatcher-auth.ts`. Permite timing attack para brute-force do `WEBHOOK_DISPATCHER_SECRET`.  
**Mitigação atual:** `authorizeDispatcher()` (chamada logo após) usa `constantTimeEqual` corretamente — é a barreira real.  
**Correção:** substituir `incoming !== dispatcherSecret` por `constantTimeEqual(incoming, dispatcherSecret)`.

---

**SEC-EF-002 — BAIXO: `log-login-attempt` sem auth obrigatória**

Endpoint aberto por design (captura eventos pré-autenticação). Rate limit 10/min/IP. Risco: poluição da tabela `login_attempts` com eventos falsos se essa tabela alimenta alertas de segurança.

---

**SEC-EF-003 — BAIXO: `mcp-server` opera com `SUPABASE_SERVICE_ROLE_KEY`**

**Evidência:** `supabase/functions/mcp-server/index.ts:27` — `createClient(..., Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)`.  
Bypassa RLS em todas as operações. Gated por `X-MCP-Key` header + `mcp_api_keys.key_hash` no banco + audit log em `admin_audit_log`. Risco residual: key comprometida = acesso com service_role até revogação manual.  
**Recomendação:** documentar SLA de rotação de MCP keys; adicionar alerta em `mcp_api_keys` com `last_used_at > N dias`.

---

**SEC-EF-004 — BAIXO: `receive-crm-callback` rate limiter `failClosed: false`**

**Evidência:** `supabase/functions/receive-crm-callback/index.ts` — `new RateLimiter({ ..., failClosed: false })`.  
Se o storage do rate limiter falhar, requests passam sem limite. Para um endpoint de callback CRM (tipicamente baixo volume), risco é baixo.

---

**SEC-EF-005 — BAIXO: `magazine-reader-state-write` escreve via `service_role` sem ownership check**

Endpoint público por design (B.2 spec). Token validado contra `magazines.public_token`. `viewer_fingerprint` vem do body — attacker com token válido pode escrever states para fingerprints arbitrários (até rate limit 5/min). Dado escrito é apenas estado de leitura anônimo.

---

**SEC-EF-006 — INFO: `get-visitor-info` envia IPs para ip-api.com (terceiro)**

**Evidência:** `supabase/functions/get-visitor-info/index.ts` — `fetchWithBreaker('ip-api', 'https://ip-api.com/json/${ip}...')`.  
IP é dado pessoal (LGPD). Envio para serviço externo gratuito sem contrato formal. Circuit breaker presente. Verificar se há DPA (Data Processing Agreement) com ip-api.com.

---

**SEC-EF-007 — INFO: `xbz-image-uploader` no repo mas não publicado**

Função presente em `supabase/functions/xbz-image-uploader/` mas ausente no manifesto publicado. Código morto ou função em desenvolvimento. Verificar se contém credenciais hardcoded.

---

## A.10 — Logs 24h (edge functions)

**Fonte consultada:** `function_edge_logs` — últimas 24h (2026-10-26 a 2026-10-27).

**Query:**
```sql
SELECT log_attributes['function_id'] as fn, log_attributes['status_code'] as status, count(*) as cnt
FROM logs WHERE source = 'function_edge_logs' AND timestamp > now() - interval 24 hour
  AND log_attributes['status_code'] NOT IN ('200','204','301','302')
GROUP BY fn, status ORDER BY cnt DESC LIMIT 30
```

**Resultado:** Campos `status_code` retornam vazios nos registros de `function_edge_logs` — não foi possível filtrar por status HTTP. Os registros com `status = ""` indicam requests sem status HTTP registrado (possivelmente requests OPTIONS ou errors pré-handler).

**Achado LOG-001 — OPERACIONAL:** Logs de edge functions não registram status HTTP nos campos do ClickHouse consultados. Para monitoramento de 4xx/5xx por edge function, o fluxo atual depende de logs de aplicação em `function_logs` — que também não retornou erros nas 24h consultadas (zero rows com `event_message LIKE '%error%'`). Pode ser que logs estejam em outro campo ou que não houve erros recentes.

---

## A.12 — Lacunas Operacionais

**GAP-001 — OPERACIONAL: Dependência de ip-api.com sem SLA/contrato**  
`get-visitor-info` usa serviço gratuito externo sem garantias de disponibilidade ou privacidade. Se ip-api.com ficar offline ou mudar sua política, o circuit breaker retorna 503 aos visitantes.

**GAP-002 — OPERACIONAL: `xbz-image-uploader` não publicada — estado indefinido**  
Função no repo sem estar publicada pode significar: (a) em desenvolvimento, (b) foi removida da produção mas não do repo, (c) esquecida. Sem rastreabilidade clara.

---

## Seções NÃO VERIFICADAS com Motivo

| Seção | Motivo |
|-------|--------|
| A.0 Baseline | Agente em background ainda executando as 18 queries SQL de inventário |
| A.1 Inventário | Idem A.0 — mesmo agente |
| A.2 Drift | Agente de análise de código ainda executando |
| A.5 Performance | Agente em background; `pg_stat_statements` requer credenciais |
| A.6 Crons | Aguarda inventário completo do A.1 |
| A.7 DB functions | Aguarda inventário completo do A.1 |
| A.9 Auth/Storage | Agente em background |
| A.11 RLS na prática | Requer query de contagem com `SET ROLE anon; SELECT...; ROLLBACK` — SOMENTE LEITURA mas precisa autorização para mudança de role temporária |

---

## Top 10 Achados por Impacto

| # | ID | Sev | Descrição | Evidência |
|---|----|-----|-----------|-----------|
| 1 | SEC-EF-001 | MÉDIO | webhook-dispatcher: comparação non-constant-time no early guard | `webhook-dispatcher/index.ts:56` |
| 2 | SEC-DB-001 | MÉDIO | 8 views SECURITY DEFINER expostas a anon (advisor ERROR) | `pg_views` + Supabase Advisor |
| 3 | SEC-DB-002 | BAIXO | `submit_quote_response` executável por anon (SECURITY DEFINER) | `has_function_privilege('anon', oid, 'EXECUTE')` |
| 4 | SEC-EF-003 | BAIXO | mcp-server usa service_role para todo tool call | `mcp-server/index.ts:27` |
| 5 | SEC-EF-002 | BAIXO | log-login-attempt sem auth obrigatória | `log-login-attempt/index.ts` |
| 6 | SEC-EF-004 | BAIXO | receive-crm-callback rate limiter fail-open | `receive-crm-callback/index.ts` |
| 7 | SEC-EF-005 | BAIXO | magazine-reader-state-write escreve via service_role sem ownership | `magazine-reader-state-write/index.ts` |
| 8 | SEC-DB-003 | INFO | Extensões no schema public | Advisor `extension_in_public` |
| 9 | SEC-EF-006 | INFO | get-visitor-info envia IPs para ip-api.com | `get-visitor-info/index.ts` |
| 10 | GAP-001 | OPER | ip-api.com sem SLA/DPA | `get-visitor-info/index.ts` |

---

## Prova de Não-Modificação na Produção

Todas as consultas executadas foram estritamente de leitura:
- `SELECT` via `execute_sql` (sem INSERT/UPDATE/DELETE/DDL)
- `query_logs` (read-only ClickHouse)
- `list_edge_functions`, `get_advisors` (listagens)
- Leituras de arquivo no repo local (sem push/commit)

Nenhuma edge function foi invocada. Nenhuma migration foi aplicada.

---

## Arquivos Gerados

- `auditoria-supabase/progresso.json`
- `auditoria-supabase/inventario/edge_functions.md` — classificação R0/R1/R2 das 36 funções verify_jwt=false
- `auditoria-supabase/RELATORIO_AUDITORIA_SUPABASE.md` — este arquivo

---

*Auditoria parcialmente concluída — 5 agentes em background não retornaram (A.0, A.1, A.2, A.5, A.9). As seções A.3 e A.8 foram concluídas diretamente. Sessão atingiu limite de contexto antes da conclusão de todas as 12 seções.*
