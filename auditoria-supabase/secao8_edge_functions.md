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
