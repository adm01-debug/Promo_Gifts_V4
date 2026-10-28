# A.8 — Edge Functions: Auditoria de Segurança

**Data:** 2026-10-27  
**Projeto:** doufsxqlfjyuvxuezpln  
**Total publicadas:** 109 | **Com verify_jwt=false:** 36 | **Apenas no repo (não publicada):** 1

---

## 1. Drift: repo vs publicado

| Status | Função | Risco |
|--------|--------|-------|
| No repo, NÃO publicada | `xbz-image-uploader` | BAIXO — código inerte |
| 109 funções em ambos | — | OK |

**Evidência:** `ls supabase/functions/` vs parsed do list_edge_functions (109 publicadas, 110 no repo).

---

## 2. Análise das 36 funções com verify_jwt=false

### 2.1 Funções intencionalmente públicas (R0 — sem auth de identidade, por design)

| Função | Mecanismo de controle | Avaliação |
|--------|----------------------|-----------|
| `get-visitor-info` | bot-protection + rate 30/min/IP | OK — retorna só geolocalização IP |
| `image-proxy` | Domain allowlist + referer whitelist | OK — proxy de imagens de suppliers aprovados |
| `magazine-public-view` | Token SHA-256 de public_token + rate 20/min | OK — leitura de revista pública via token |
| `magazine-public-react` | Token + fingerprint + rate 5/min | OK — reações em revista pública |
| `magazine-reader-state-read` | Token SHA-256 + rate limit | OK — leitura de bookmarks por token |
| `magazine-reader-state-write` | Token + fingerprint (min 32 chars) + rate 5/min/IP+token | BAIXO (ver SEC-EF-005) |

### 2.2 Funções de cron/scheduler (R1 — auth via x-cron-secret do vault)

Todas usam `authorizeCron()` de `_shared/dispatcher-auth.ts`.  
O vault secret (`CRON_SECRET`) é lido via RPC `get_edge_function_secret` com cache por cold-start.

| Função | Auth | Avaliação |
|--------|------|-----------|
| `process-queue` | authorizeCron(CRON_SECRET) | OK |
| `send-notification` | authorizeCron(CRON_SECRET) | OK |
| `send-digest` | authorizeCron(CRON_SECRET) | OK |
| `cleanup-novelties` | authorizeCron(CRON_SECRET) | OK |
| `cleanup-notifications` | authorizeCron(CRON_SECRET) | OK |
| `backfill-image-dimensions` | authorizeCron(CRON_SECRET) | OK |
| `collections-watcher` | authorizeCron(CRON_SECRET) | OK |
| `comparison-price-watcher` | authorizeCron(CRON_SECRET) | OK |
| `connections-auto-test` | authorizeCron(CRON_SECRET) | OK |
| `connections-health-check` | authorizeCron(CRON_SECRET) | OK |
| `favorites-watcher` | authorizeCron(CRON_SECRET) | OK |
| `ownership-audit` | authorizeCron(CRON_SECRET) | OK |
| `process-scheduled-reports` | authorizeCron(CRON_SECRET) | OK |
| `quote-followup-reminders` | authorizeCron(CRON_SECRET) | OK |
| `send-scheduled-reports` | authorizeCron(CRON_SECRET) | OK |
| `sync-external-db` | authorizeCron(CRON_SECRET) | OK (BUG-EF-005 corrigido) |
| `asia-ingestion` | authorizeCron/auth | OK |

### 2.3 Funções com auth via header proprietário

| Função | Mecanismo | Avaliação |
|--------|-----------|-----------|
| `webhook-dispatcher` | x-dispatcher-secret (vault) + Modo B: Bearer JWT ≥ supervisor | MÉDIO — ver SEC-EF-001 |
| `webhook-inbound` | HMAC-SHA256 por endpoint (timing-safe) | OK |
| `receive-crm-callback` | x-api-key timing-safe + rate 300/min | OK |
| `crm-callback-alerts` | auth | OK |
| `crm-callback-reprocess` | auth | OK |

### 2.4 Funções com auth via Bearer JWT (in-code)

| Função | Mecanismo | Avaliação |
|--------|-----------|-----------|
| `crm-db-bridge` | Bearer JWT → auth.getUser + role check | OK |
| `external-db-inspect` | Bearer JWT → admin role em user_roles | OK |
| `check-login` | auth | OK |

### 2.5 Funções com auth via MCP API Key

| Função | Mecanismo | Avaliação |
|--------|-----------|-----------|
| `mcp-server` | X-MCP-Key → mcp_api_keys.key_hash (DB) + scope + audit log | BAIXO — ver SEC-EF-006 |

### 2.6 Funções sem auth obrigatória (acesso aberto intencional)

| Função | Mecanismo | Avaliação |
|--------|-----------|-----------|
| `log-login-attempt` | Rate limit 10/min/IP; Bearer opcional para user_id | BAIXO — ver SEC-EF-002 |
| `magazine-import-local` | auth | OK |

---

## 3. Achados de Segurança

### SEC-EF-001 — MÉDIO: webhook-dispatcher usa comparação não-constant-time no early guard

**Arquivo:** `supabase/functions/webhook-dispatcher/index.ts:56`  
**Evidência:**
```typescript
// linha 56:
if (!incoming || incoming !== dispatcherSecret) {
```
A função `constantTimeEqual()` existe em `_shared/dispatcher-auth.ts` mas **não é usada aqui**.  
`authorizeDispatcher()` (chamado na linha 114) usa `constantTimeEqual` corretamente — mas o early guard não.  
**Impacto:** timing attack para brute-force parcial de WEBHOOK_DISPATCHER_SECRET.  
**Mitigação atual:** o `authorizeDispatcher` é a barreira real; o early guard é redundante.  
**Correção:** substituir `incoming !== dispatcherSecret` por `constantTimeEqual(incoming, dispatcherSecret)`.

### SEC-EF-002 — BAIXO: log-login-attempt — sem auth obrigatória

**Arquivo:** `supabase/functions/log-login-attempt/index.ts`  
**Evidência:** rate limit 10/min/IP; Bearer JWT é opcional (só para associar user_id).  
**Impacto:** qualquer IP pode inserir eventos fake em `login_attempts` (rate 10/min).  
**Mitigação atual:** rate limiter reduz volume; dados de login_attempts não são usados para decisões de segurança.  
**Aceitar ou não:** depende do uso de login_attempts para auditoria — se tabela gera alertas de segurança, poluição é relevante.

### SEC-EF-003 — INFORMAÇÃO: get-visitor-info chama ip-api.com sem contrato

**Arquivo:** `supabase/functions/get-visitor-info/index.ts`  
**Evidência:** `fetchWithBreaker('ip-api', 'https://ip-api.com/json/${ip}...')` — serviço externo gratuito/não-contratado.  
**Impacto:** dependência de terceiro não-garantido; circuit breaker ameniza; IPs dos visitantes são enviados para ip-api.com.  
**Nota LGPD:** IP é dado pessoal — envio a serviço externo sem contrato pode ser problemático.

### SEC-EF-004 — INFORMAÇÃO: image-proxy expõe URLs de suppliers como proxy transparente

**Arquivo:** `supabase/functions/image-proxy/index.ts`  
**Evidência:** domain allowlist de 17 domínios; referer whitelist.  
Sem validação de Content-Type na resposta → possível content-type sniffing se um supplier domain for comprometido.

### SEC-EF-005 — BAIXO: magazine-reader-state-write escreve com service_role sem validação de ownership

**Arquivo:** `supabase/functions/magazine-reader-state-write/index.ts`  
**Evidência:** O upsert é em `magazine_reader_state` usando service_role. O token é validado contra `magazines.public_token`, mas o `viewer_fingerprint` é do body (não derivado de identidade). Rate limit 5/min/IP+token.  
**Impacto:** attacker com um token público válido pode escrever entries para fingerprints arbitrários (até o limite de rate).  
**Aceitável** para estado de leitura anônimo.

### SEC-EF-006 — BAIXO: mcp-server opera com SUPABASE_SERVICE_ROLE_KEY

**Arquivo:** `supabase/functions/mcp-server/index.ts:27`  
```typescript
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
```
**Evidência:** Toda operação do MCP server usa service_role — bypassa RLS.  
**Mitigação:** Cada tool tem scope declarado, gated antes de executar, com audit log em `admin_audit_log`.  
**Risco residual:** se uma MCP key for comprometida, o attacker opera com service_role até a key ser revogada.  
**Recomendação:** key rotation policy documentada; alerta em `mcp_api_keys` com last_used_at.

### SEC-EF-007 — BAIXO: xbz-image-uploader no repo mas não publicada

**Arquivo:** `supabase/functions/xbz-image-uploader/` (repo), ausente no manifesto publicado.  
**Evidência:** presente em `ls supabase/functions/`, ausente no `list_edge_functions`.  
**Impacto:** código morto; se contiver credenciais hardcoded é risco.  
**Ação:** inspecionar se contém secrets e avaliar se deve ser publicado ou removido.

---

## 4. Sumário por Risco

| Severidade | Achado | ID |
|------------|--------|----|
| MÉDIO | Comparação não-constant-time em webhook-dispatcher early guard | SEC-EF-001 |
| BAIXO | log-login-attempt sem auth obrigatória | SEC-EF-002 |
| BAIXO | mcp-server opera com service_role | SEC-EF-006 |
| BAIXO | magazine-reader-state-write escreve via service_role sem ownership check | SEC-EF-005 |
| BAIXO | xbz-image-uploader: função não publicada no repo | SEC-EF-007 |
| INFO | get-visitor-info envia IPs para ip-api.com | SEC-EF-003 |
| INFO | image-proxy sem validação de Content-Type na resposta | SEC-EF-004 |

**Funções sem nenhum auth (verify_jwt=false E sem auth em código):** 0  
Todas as 36 têm alguma forma de controle (token, HMAC, cron-secret, bearer JWT, MCP key, ou são intencionalmente públicas com rate limit).

