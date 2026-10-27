# Classificação — Edge Functions com `verify_jwt = false`

> Gerado em 2026-10-27 · Evidência: leitura direta dos fontes em `supabase/functions/`  
> Fonte de verdade: `supabase/config.toml`  
> Total: **26 funções** com `verify_jwt = false` (config.toml). O MCP `list_edge_functions`  
> reportava 36 — divergência se deve ao estado deployado × config local. Config.toml é SSOT.

## Categorias

| Categoria | Critério |
|---|---|
| **(a) Interno — auth própria** | Cron/webhook com `authorizeCron`, `verifyHmac`, `x-cron-secret`, `MCP_KEY`, `API_KEY` ou outro token não-JWT |
| **(b) Público por design** | Endpoint pré-autenticação ou proxy, sem contexto de usuário, com rate limit/bot protection |
| **(c) Erro — precisa JWT** | Exposto sem proteção adequada; requer `verify_jwt = true` |

---

## Categoria (a) — Interno com validação própria (22 funções)

| Função | Mecanismo de auth | Observação |
|---|---|---|
| `connections-auto-test` | `authorizeCron` (CONNECTIONS_AUTO_TEST_SECRET) | ⚠️ BUG: cron envia CRON_SECRET — ver migration `20261027120000` |
| `asia-ingestion` | `authorizeCron` + `resolveCredential` | Ingestão de produtos ASIA |
| `backfill-image-dimensions` | `authorizeCron` | Backfill interno |
| `cleanup-novelties` | `authorizeCron` + `x-cron-secret` | Limpeza agendada |
| `collections-watcher` | `authorizeCron` + `x-cron-secret` | Watcher de coleções |
| `comparison-price-watcher` | `authorizeCron` + `x-cron-secret` | Watcher de preços |
| `connections-health-check` | `authorizeCron` + `x-cron-secret` | Health check de conexões |
| `e2e-cleanup` | `x-e2e-cleanup-token` (timing-safe) + allowlist | Limpeza de dados E2E |
| `favorites-watcher` | `authorizeCron` + `x-cron-secret` | Watcher de favoritos |
| `ownership-audit` | `authorizeCron` + `x-cron-secret` + service_role | Auditoria de ownership |
| `process-queue` | `authorizeCron` + `x-cron-secret` | Processamento de fila |
| `process-scheduled-reports` | `authorizeCron` + `x-cron-secret` + `resolveCredential` | Relatórios agendados |
| `quote-followup-reminders` | `authorizeCron` + `x-cron-secret` | Lembretes de follow-up |
| `send-digest` | `authorizeCron` + `x-cron-secret` | Envio de digest |
| `send-notification` | `authorizeCron` + `x-cron-secret` + service_role | Envio de notificações |
| `send-scheduled-reports` | `authorizeCron` + `x-cron-secret` + `API_KEY` | Relatórios por email |
| `sync-external-db` | `authorizeCron` + `x-cron-secret` | Sync DB externo |
| `webhook-inbound` | `runBotProtection` + `verifyHmac` | Recebe webhooks externos com HMAC |
| `webhook-dispatcher` | `Authorization` header (bearer) | Dispatch interno autenticado |
| `mcp-server` | `MCP_KEY` (API key) | Servidor MCP com chave própria |
| `external-db-inspect` | `runBotProtection` + `Authorization` | Inspeção de DB externo |
| `ai-recommendations` | `API_KEY` + `resolveCredential` | Recomendações IA com chave |

---

## Categoria (b) — Público por design (4 funções)

| Função | Proteção | Justificativa |
|---|---|---|
| `check-login` | Marcada explicitamente `public` | Estado pré-autenticação — não há JWT ainda |
| `get-visitor-info` | `runBotProtection` | Info de visitante anônimo; sem dados sensíveis |
| `image-proxy` | `runBotProtection` | Proxy público de imagens; sem contexto de usuário |
| `log-login-attempt` | Rate limit 10/min/IP + schema validation (Zod) | Loga tentativas pré-auth; IP derivado do gateway (não forjável) |

---

## Categoria (c) — Erro / precisa JWT

**Nenhuma função classificada nesta categoria.** Todas as 26 funções com `verify_jwt = false`  
possuem mecanismo de autenticação próprio ou são intencionalmente públicas.

---

## Bugs ativos encontrados durante a classificação

| # | Função | Problema | Referência |
|---|---|---|---|
| 1 | `connections-auto-test` | Cron envia `CRON_SECRET` mas função verifica `CONNECTIONS_AUTO_TEST_SECRET` → 401 a cada 15min desde implantação | Migration `20261027120000_fix_connections_auto_test_cron_secret.sql` |
| 2 | `image-dimensions-backfill` | Cron chama `/functions/v1/run-script` que não existe → 404 a cada 3h | `run-script` nunca foi deployada; cron deve ser desativado ou redirecionado |

---

## Problema operacional (não de segurança)

| # | Job | Problema | Impacto |
|---|---|---|---|
| 1 | `xbz-site-scrape` + `xbz-stock-sync` | `fn_xbz_site_tick` chama API de IA (uid c9695548) com saldo insuficiente → 402 a cada :01/:31 | Scraping de produtos XBZ falha silenciosamente; dados de estoque não atualizados |
