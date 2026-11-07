# SEGREDOS.md — Inventário de Segredos e Variáveis dos Workflows

> **SSOT (E98/E40).** Qualquer PR que adicione `secrets.NOVO_SEGREDO` a um workflow
> DEVE incluir uma linha neste arquivo com dono, escopo e rotação declarados.
> Referência: CLAUDE.md § CI — "Inventário de segredos — E98".
>
> Este arquivo é validado pelo script `scripts/check-secrets-inventory.mjs` (E40).
> Rodar: `node scripts/check-secrets-inventory.mjs --gate` para verificar completude.

Última atualização: 2026-11-07 (Gate 1.14 — SUPABASE_TEST_BYPASS_TOKEN adicionado; ci-freight-quality.yml)

---

## Segredos obrigatórios (gates bloqueantes)

| Segredo | Dono | Escopo | Rotação | Workflows consumidores principais |
|---|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | DevOps/PO | Repo | 6 meses | `deploy-gates.yml`, `supabase-security-gate.yml`, `supabase-linter-gate.yml`, `db-apply-migration.yml`, `schema-snapshot-export.yml`, `capacity-growth-report.yml` |
| `SUPABASE_SERVICE_ROLE_KEY` | DevOps/PO | Repo | 6 meses | `deploy-gates.yml` (restore-cart-rpc-gate), `cart-header-quality-gate.yml`, `ci-security-drift.yml` |
| `SUPABASE_DB_PASSWORD` | DevOps/PO | Repo | 6 meses | `schema-snapshot-export.yml`, `db-schema-drift-check.yml`, `db-apply-migration.yml` |
| `SUPABASE_ANON_KEY` | DevOps/PO | Repo | — | `cart-header-quality-gate.yml`, `ci-security-drift.yml`, `restore-seller-cart-rpc.yml` |
| `SUPABASE_URL` | DevOps/PO | Repo | — | `cart-header-quality-gate.yml`, `ci-security-drift.yml`, `restore-seller-cart-rpc.yml` |
| `PGHOST` | DevOps/PO | Repo | — | `db-apply-migration.yml`, `drafts-index-check.yml`, `migration-dry-run.yml`, `contexto.yml` |
| `PGUSER` | DevOps/PO | Repo | — | `db-apply-migration.yml`, `drafts-index-check.yml`, `contexto.yml` |
| `PGPASSWORD` | DevOps/PO | Repo | 6 meses | `db-apply-migration.yml`, `drafts-index-check.yml`, `migration-dry-run.yml`, `contexto.yml` |
| `PGDATABASE` | DevOps/PO | Repo | — | `db-apply-migration.yml`, `drafts-index-check.yml`, `contexto.yml` |
| `PGPORT` | DevOps/PO | Repo | — | `db-apply-migration.yml` (3 refs), `drafts-index-check.yml`, `migration-dry-run.yml`, `contexto.yml` — fallback: `5432` se ausente |

> **Nota `SUPABASE_ANON_KEY` vs `VITE_SUPABASE_PUBLISHABLE_KEY`:** dois nomes para o mesmo valor (chave anon/publishable de `doufsxqlfjyuvxuezpln`). Workflows mais antigos usam `SUPABASE_ANON_KEY`; novos usam `VITE_SUPABASE_PUBLISHABLE_KEY`. Ambos são de conhecimento público por design do Supabase — RLS é a camada de segurança real.
>
> **Nota `SUPABASE_URL` vs `VITE_SUPABASE_URL`:** dois nomes para `https://doufsxqlfjyuvxuezpln.supabase.co`. Workflows mais antigos usam `SUPABASE_URL`; novos usam `VITE_SUPABASE_URL`.

---

## Credenciais E2E (testes de integração/staging)

Estes segredos são credenciais de usuários de teste — nunca são de produção real.
São usados em workflows de E2E/integração que **não fazem parte do Gate Final**.

| Segredo | Dono | Escopo | Rotação | Papel / Workflows |
|---|---|---|---|---|
| `E2E_USER_EMAIL` | DevOps | Repo | Anual | Usuário comprador padrão — 50 refs em workflows de E2E/integração |
| `E2E_USER_PASSWORD` | DevOps | Repo | Anual | Senha do usuário comprador padrão — 45 refs em workflows de E2E/integração |
| `E2E_ADMIN_EMAIL` | DevOps | Repo | Anual | Usuário administrador de testes — deploy-gates.yml, e2e-cart-*.yml (13 refs) |
| `E2E_ADMIN_PASSWORD` | DevOps | Repo | Anual | Senha do admin de testes — 13 refs |
| `E2E_DEV_EMAIL` | DevOps | Repo | Anual | Usuário developer (edge-integration-all.yml) — 1 ref |
| `E2E_DEV_PASSWORD` | DevOps | Repo | Anual | Senha do developer de testes — 1 ref |
| `SUPABASE_TEST_BYPASS_TOKEN` | DevOps | Repo | Semestral | Token de bypass de segurança para testes de carga/stress — `ci-freight-quality.yml` (1 ref), `scripts/massive-load-test.mjs`, `scripts/fuzz-testing.mjs`, `scripts/stress-burst.mjs`, `scripts/freight-quest-load-test.mjs`. **Deve ser o segredo mais controlado do repo** — contorna regras RLS em ambiente de teste |

---

## Configuração do Supabase (cliente Vite)

| Segredo | Dono | Escopo | Rotação | Observação |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | DevOps | Repo | — | `https://doufsxqlfjyuvxuezpln.supabase.co` — não rotar sem mudança de projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | DevOps | Repo | — | Chave anon/publishable pública de `doufsxqlfjyuvxuezpln` — 53 refs |
| `VITE_SUPABASE_PROJECT_ID` | DevOps | Repo | — | `doufsxqlfjyuvxuezpln` — `kit-coverage-integration.yml` |
| `KIT_FIXTURE_ID` | DevOps | Repo | A cada fixture | UUID do fixture de kit usado em `kit-coverage-integration.yml` |

---

## Deploy Vercel

| Segredo | Dono | Escopo | Rotação | Workflows |
|---|---|---|---|---|
| `VERCEL_TOKEN` | DevOps | Repo | 12 meses | `deploy-vercel.yml` — token de API Vercel para deploy |
| `VERCEL_ORG_ID` | DevOps | Repo | — | `deploy-vercel.yml` — ID da organização Vercel |
| `VERCEL_PROJECT_ID` | DevOps | Repo | — | `deploy-vercel.yml` — ID do projeto Vercel |

---

## Cart / Testes de carrinho

| Segredo | Dono | Escopo | Rotação | Observação |
|---|---|---|---|---|
| `TEST_SELLER_A_JWT` | DevOps | Repo | 6 meses | JWT de teste do vendedor A — `cart-header-quality-gate.yml` |
| `TEST_SELLER_B_JWT` | DevOps | Repo | 6 meses | JWT de teste do vendedor B — `cart-header-quality-gate.yml` |
| `CART_TUNE_PAT` | DevOps | Repo | 6 meses | PAT com `repo` scope para commits de tune — `cart-invariants-smoke.yml` |

---

## Integrações e callbacks

| Segredo | Dono | Escopo | Rotação | Observação |
|---|---|---|---|---|
| `CRM_CALLBACK_API_KEY` | DevOps/PO | Repo | 12 meses | Chave de API para callback CRM — `e2e-crm-callback-approved.yml` |
| `V4_CALLBACK_URL` | DevOps/PO | Repo | — | URL de callback do Promo Gifts V4 — `e2e-crm-callback-approved.yml` |
| `SENTINEL_SLACK_WEBHOOK` | DevOps | Repo | — | Webhook Slack para alertas do sentinel — `branch-protection-sentinel.yml`, `prod-health.yml` |

---

## Token automático do GitHub Actions

Gerado automaticamente em cada run — não armazenado como secret no repositório.

| Token | Escopo | Observação |
|---|---|---|
| `GITHUB_TOKEN` (via `secrets.GITHUB_TOKEN`) | Repo | Permissões mínimas (R1 do Padrão E12). Workflows que escrevem devem declarar o escopo explicitamente. |

---

## Segredos opcionais (gates advisory/opcionais)

| Segredo | Dono | Escopo | Rotação | Observação |
|---|---|---|---|---|
| `LHCI_GITHUB_APP_TOKEN` | DevOps | Repo | Nunca (GitHub App) | Gate 4 Lighthouse CI (`continue-on-error: true`) — allowlistado em check-workflow-contracts |
| `RELEASE_PLEASE_TOKEN` | PO/DevOps | Repo | Anual | PAT com escopo `repo` para `release-please.yml` criar releases/tags em repos com branch protection. Fallback: `GITHUB_TOKEN` (pode falhar com "Resource not accessible by integration"). Criado manualmente em Settings → Secrets → Actions. |

---

## Variáveis (vars.*) — não são segredos, mas precisam de documentação

| Variável | Dono | Escopo | Observação |
|---|---|---|---|
| `vars.CART_TOTAL_SHARDS` | DevOps | Repo | Número de shards em `cart-invariants-smoke.yml` — default 4 |
| `vars.E2E_BASE_URL` | DevOps | Repo | URL base para E2E em `ci-freight-quality.yml` |
| `vars.CI_SKIP_FREIGHT_E2E` | DevOps | Repo | Flag para pular E2E de frete em `freight-quality-gates.yml` |
| `vars.KIT_FIXTURE_ID` | DevOps | Repo | UUID do fixture de kit (alternativa ao secret) — `kit-coverage-integration.yml` |

---

## Allowlist (sem valor obrigatório — falha graciosamente)

Estes segredos são referenciados nos workflows mas com fallback ou em contexto de template.
Não precisam de entrada na tabela acima; estão no allowlist de `check-secrets-inventory.mjs`.

| Segredo | Motivo do allowlist |
|---|---|
| `PGPORT` | Fallback hardcoded: `${{ secrets.PGPORT \|\| '5432' }}` — porta padrão 5432 usada se ausente |
| `BRANCH_PROTECTION_READ_TOKEN` | Fallback: `${{ secrets.BRANCH_PROTECTION_READ_TOKEN \|\| github.token }}` |
| `LHCI_GITHUB_APP_TOKEN` | Gate 4 opcional (Lighthouse) — allowlistado também em check-workflow-contracts |

---

## Segredos de Edge Functions (E194)

> **Atenção:** estes segredos são configurados via `supabase secrets set` (não em GitHub Actions Secrets).
> São acessados em runtime via `Deno.env.get("NOME")` nas edge functions em `supabase/functions/`.
> O script `check-secrets-inventory.mjs` verifica edge functions automaticamente (E194 — `--scan-edge`).
>
> Última atualização: 2026-10-19 (E194 — P200 Onda 19)

### Auto-injetados pelo Supabase (sempre disponíveis)

Estes segredos são injetados automaticamente pelo Supabase em toda edge function — não precisam de `supabase secrets set`.

| Segredo | Tipo | Usado em |
|---|---|---|
| `SUPABASE_URL` | Supabase Auto | 81+ funções (praticamente todas) |
| `SUPABASE_ANON_KEY` | Supabase Auto | 32+ funções via `_shared/credentials.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Auto | 73+ funções via `_shared/credentials.ts` |
| `SUPABASE_DB_URL` | Supabase Auto | `cnpj-lookup`, `tests/` |

### Segredos de serviços externos

Configurados via `supabase secrets set`; obrigatórios para as funções listadas.

| Segredo | Tipo | Rotação | Funções consumidoras |
|---|---|---|---|