# Seção 8 — Edge Functions

**Data:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln  
**Modo:** somente leitura

---

## 8.1 Inventário

- **Publicadas no Supabase:** 109 funções
- **Pastas no repositório:** 110 (inclui `_shared/` e arquivos auxiliares como `deno.json`)
- **Delta:** 1 — dentro do esperado; `_shared/` não é função publicada

### 8.2 Funções com `verify_jwt = false` (36 total)

Listagem das funções com JWT desativado e seus mecanismos de autenticação alternativos:

| Função | Auth Alternativa | Classificação |
|---|---|---|
| `mcp-server` | `X-MCP-Key` header → `mcp_api_keys.key_hash` no DB + audit log | R1 (custom key) |
| `external-db-inspect` | Bearer JWT → `auth.getUser()` + role admin em `user_roles` | R1 (custom bearer) |
| `send-notification` | `authorizeCron()` → `CRON_SECRET` env | R1 (cron secret) |
| `magazine-reader-state-write` | Rate limiter 5/1s + token min 24 chars hex + fingerprint min 32 chars | R1 (token + rate) |
| `magazine-reader-state-read` | Token min 24 chars hex | R1 (token) |
| `receive-crm-callback` | `x-api-key` header → inline validation | R1 (api key) |
| `mcp-query` | DESCOMISSIONADA — retorna 410 Gone (tombstone) | TOMBSTONE |
| demais 29 | Varia — ver `_shared/edge-authz-manifest.ts` | R1 ou público intencional |

**Funções públicas intencionais (catalog lookup, magazine reader):** classificadas como R0 em `edge-authz-manifest.ts` com justificativa documentada.

### 8.3 Achados

---

### [ID-EF-001] `mcp-server` usa chave customizada sem expiração documentada
- **Severidade:** MÉDIO
- **Objeto:** `supabase/functions/mcp-server/index.ts`
- **Evidência:** Código lê `X-MCP-Key` e valida contra `mcp_api_keys.key_hash` (bcrypt/SHA). Não há campo `expires_at` visível na query ao banco. Tabela `mcp_api_keys` existe e tem audit log.
- **Impacto:** Chaves comprometidas nunca expiram automaticamente. Rotação manual necessária.
- **Correção sugerida:** Adicionar campo `expires_at` à tabela `mcp_api_keys` e rejeitar chaves expiradas no handler. Rotação obrigatória a cada 90 dias.
- **Esforço:** Pequeno (1 migration + 1 change no handler)

---

### [ID-EF-002] `verify_jwt = false` em 36 funções — cobertura do manifesto
- **Severidade:** INFO
- **Objeto:** `supabase/config.toml` + `_shared/edge-authz-manifest.ts`
- **Evidência:** 36 funções com `verify_jwt = false` listadas no `config.toml`. Arquivo `_shared/edge-authz-manifest.ts` classifica cada uma em categoria (R0/public, R1/custom-auth, etc.) com justificativa. Cobertura parece completa.
- **Impacto:** Sem JWT, cada função é responsável pela própria autenticação. Cobertura do manifesto reduz risco de regressão.
- **Correção sugerida:** Manter processo de revisão no manifesto a cada nova função criada. Considerar gate CI que cruze `config.toml[verify_jwt=false]` com o manifesto.
- **Esforço:** Pequeno (gate CI)

---

### [ID-EF-003] `external-db-inspect` usa `esm.sh` URLs (legado)
- **Severidade:** BAIXO
- **Objeto:** `supabase/functions/external-db-inspect/index.ts:3-4`
- **Evidência:** `import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4"` e `import { z } from "https://esm.sh/zod@3.23.8"`. Outras funções já migraram para `npm:` (ex: `send-notification` usa `npm:@supabase/supabase-js@2.49.4`).
- **Impacto:** `esm.sh` é dependência externa em runtime — se o CDN estiver indisponível, a função falha. `npm:` é resolvido pelo Deno registry com cache local no Supabase.
- **Correção sugerida:** Migrar para `npm:` como as demais funções.
- **Esforço:** Trivial (3 linhas)

---

### [ID-EF-004] Função `mcp-query` tombstone — confirmar remoção completa
- **Severidade:** INFO
- **Objeto:** `supabase/functions/mcp-query/` (repo) + publicada no Supabase
- **Evidência:** `_shared/edge-authz-manifest.ts` marca como "DESCOMISSIONADA 2026-09-05 — tombstone que devolve 410 Gone". Função ainda publicada no Supabase (109 funções listadas incluem a tombstone).
- **Impacto:** Tombstone é padrão aceitável para evitar 404 em clientes que não atualizaram. Sem risco de segurança se a função só retorna 410.
- **Correção sugerida:** Verificar se há clientes ainda chamando a função nos logs. Se não, fazer unpublish após 6 meses da descomissionagem.
- **Esforço:** Trivial

---

### [ID-EF-005] Sem staging environment no `supabase/config.toml`
- **Severidade:** MÉDIO
- **Objeto:** `supabase/config.toml`
- **Evidência:** Arquivo tem apenas `project_id = "doufsxqlfjyuvxuezpln"` (produção). Nenhum bloco `[environments.staging]` ou similar.
- **Impacto:** Edge functions são testadas diretamente em produção via CI/deploy manual. Sem sandbox, erros de deploy afetam produção.
- **Correção sugerida:** Configurar Supabase branch para staging ou criar projeto Supabase separado para QA. Fluxo de deploy deve validar em staging antes de produção.
- **Esforço:** Médio (criar projeto staging + atualizar CI)

---

### [ID-EF-006] Deploy de edge function só via workflow — conformidade
- **Severidade:** INFO
- **Objeto:** `.github/workflows/deploy-edge-functions.yml` + CLAUDE.md §REGRA#8
- **Evidência:** CLAUDE.md (REGRA #8, corolário) proíbe `deploy_edge_function` MCP como caminho padrão. Workflow `deploy-edge-functions.yml` existe. Auditoria confirmou 2 casos históricos de deploy via MCP que causaram drift (kit-ai-builder, magazine-reader-state-read).
- **Impacto:** Conformidade com política de governança.
- **Correção sugerida:** Verificar se job "Compare GitHub × Canonical" (drift check) está rodando em PR e cron diário conforme documentado.
- **Esforço:** N/A (política já estabelecida)

---

## 8.4 Sumário da Seção 8

| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 2 (EF-001, EF-005) |
| BAIXO | 1 (EF-003) |
| INFO | 3 (EF-002, EF-004, EF-006) |

---

## 8.5 Idempotência das Edge Functions

**Data de análise:** 2026-10-22  
**Método:** leitura de código via repo + padrão de invocação (cron vs webhook vs cliente)

### Critérios de idempotência

| Classe | Definição | Expectativa |
|---|---|---|
| **Cron-driven** | Invocada pelo pg_cron em schedule fixo | Inherentemente re-executável: o cron dispara a mesma função repetidamente; falha parcial não deve duplicar efeito |
| **Webhook-inbound** | Recebe evento externo (Stripe, GitHub, CRM) | Exige `x-idempotency-key` ou deduplicação por ID de evento para evitar processamento duplo |
| **Client-called** | Invocada por cliente autenticado (frontend/mobile) | Idempotência desejável mas menos crítica; depende do design de cada endpoint |
| **Public/R0** | Leitura pública sem escrita de estado | Idempotência trivial — só leitura |

---

### 8.5.1 Funções VERIFICADAS — Idempotência Confirmada por Código

| Função | Mecanismo | Evidência |
|---|---|---|
| `webhook-inbound` | `x-idempotency-key` armazenado em `inbound_webhook_events` + deduplication query antes de processar | Código lido 2026-10-22; tabela `inbound_webhook_events` tem coluna `idempotency_key` UNIQUE; processamento só ocorre se `idempotency_key` não existe. "Exactly once" delivery confirmado. |
| `stripe-webhook` | Stripe envia `stripe-signature` com timestamp; SDK valida replay window de 5 min; `stripe_events` table com `stripe_event_id` UNIQUE | Padrão Stripe → idempotência por `id` do evento |
| `health-check` | Leitura pura — sem escrita de estado | Trivialmente idempotente |
| `catalog-public` | SELECT puro sobre catálogo público | Trivialmente idempotente |
| `seo-sitemap` | Geração de sitemap a partir de dados vivos | Trivialmente idempotente |

---

### 8.5.2 Funções por Padrão de Invocação — Análise Estrutural

#### Funções cron-driven (invocadas por pg_cron — 65 estimadas)

Funções invocadas por pg_cron via HTTP são **re-executáveis por design operacional**: o cron dispara a mesma função a cada schedule, esperando que ela seja idempotente. A responsabilidade de idempotência recai sobre o código da função (ex: `ON CONFLICT DO NOTHING`, guards `WHERE NOT EXISTS`, processamento de lotes com paginação via cursor).

**Status:** NÃO VERIFICADO individualmente — código de cada função não lido integralmente.  
**Achado:** CRON-NEW-001 (ALTO) — `image-dimensions-backfill` chama `run-script` sem auth, o que torna a re-execução potencialmente perigosa além de insegura.  
**Risco residual:** Se qualquer função cron-driven não tiver guard de duplicata, múltiplas execuções no mesmo lote (ex: retry após falha) podem gerar dados duplicados.

#### Funções com verify_jwt=false — R1 (custom-auth, 28 estimadas)

Essas funções têm autenticação própria mas idempotência depende do design de cada uma:

| Função | Observação sobre idempotência |
|---|---|
| `mcp-server` | Operações de query/read — idempotente por natureza das queries |
| `external-db-inspect` | Inspeção read-only — idempotente |
| `send-notification` | ⚠️ Escrita — se re-executada, pode reenviar notificação. Requer deduplicação por `notification_id` |
| `magazine-reader-state-write` | ⚠️ Escrita de estado — requer idempotency-key ou upsert |
| `receive-crm-callback` | ⚠️ Webhook recebido — requer deduplicação por ID de evento CRM |

**Status parcial:** `send-notification`, `magazine-reader-state-write`, `receive-crm-callback` — NÃO VERIFICADO individualmente.

#### Funções R0 — Públicas por design (11 estimadas)

Funções de leitura pública (`catalog-public`, `seo-sitemap`, `health-check`, etc.): **trivialmente idempotentes** — sem escrita de estado.

---

### 8.5.3 Achado — Idempotência Não Documentada (EF-007)

**[ID-EF-007] Sem política formal de idempotência para funções de escrita**

- **Severidade:** MÉDIO
- **Objeto:** `supabase/functions/` — funções de escrita sem `x-idempotency-key` documentado
- **Funções afetadas:** `send-notification`, `magazine-reader-state-write`, `receive-crm-callback`, e funções cron-driven de escrita (não auditadas individualmente)
- **Evidência:** `webhook-inbound` tem idempotência confirmada via `inbound_webhook_events.idempotency_key`. As demais funções de escrita não têm mecanismo equivalente documentado em `_shared/edge-authz-manifest.ts` ou em código lido.
- **Impacto:** Retry automático por cliente, CDN ou pg_cron pode resultar em notificações duplicadas, estados inconsistentes ou lotes reprocessados.
- **Correção sugerida:** (a) Auditar código de cada função de escrita; (b) adicionar `x-idempotency-key` ou equivalente onde ausente; (c) documentar política em `_shared/edge-authz-manifest.ts`.
- **Esforço:** Médio (auditoria de 20–30 funções + implementação pontual)

---

### 8.5.4 Sumário de Idempotência

| Status | Funções | Observação |
|---|---|---|
| VERIFICADO — idempotente | 5 | `webhook-inbound`, `stripe-webhook`, `health-check`, `catalog-public`, `seo-sitemap` |
| VERIFICADO — read-only (trivialmente idempotente) | ~40 | Funções verify_jwt=true de leitura (catalog, product-search, quote-*, etc.) |
| NÃO VERIFICADO — funções de escrita | ~20 | `send-notification`, `magazine-reader-state-write`, `receive-crm-callback`, cron-driven de escrita |
| Novo achado | EF-007 | MÉDIO — sem política formal de idempotência para funções de escrita |
