# RELATÓRIO DE PRs ABERTOS — adm01-debug/Promo_Gifts_V4

**Gerado em:** 2026-10-24  
**Main SHA início da sessão:** `9079c82e6c3f58ae5d2cdf8c7eb2deef979ee9d8`  
**Main SHA fim da sessão:** `c8ba40e9d65ba2d1ffa63bb19cbb2e6d9a56ff60`  
**Total PRs analisados:** 19 (17 originais + 2 novos #2441/#2443 identificados nesta sessão)  
**Merges autônomos realizados:** 6 (#2426, #2427, #2434, #2436, #2414, #2439)  
**PRs restantes abertos:** 12 (todos DECISÃO HUMANA ou JÁ IMPLEMENTADA)

---

## Baseline CI (por nome de job/step)

Arquivo detalhado com step-level granularity: `analise-prs/baseline/ci-per-test-name.md`

### Deploy Gates — Run #40127820215 (SHA `e9a4764c`) — ✅ SUCCESS

Todos os 17 jobs GREEN. Principais gates:

| Gate | Job/Step | Status |
|---|---|---|
| Gate 0 — SSOT | `ssot-gate` | ✅ success |
| Gate 0.5 — npm audit | `npm-audit-gate` | ✅ success |
| Gate 1 — Lint+TSC | `static-gates` | ✅ success |
| Gate 1.1–1.18 | steps em `static-gates` | ✅ success (todos) |
| Gate E23 — Secrets | `security-audit` | ✅ success |
| Gate 2 — vitest | `unit-tests` | ✅ success |
| Gate 2.5 — DB Integrity | `database-integrity` | ✅ success |
| Gate 3 — E2E Smoke | `e2e-smoke` | ✅ success |
| Gate 5 — SEO | `seo-sanity` | ✅ success |
| Gate 5.5 — RPC | `restore-cart-rpc-gate` | ✅ success |
| Gate 6 — Build Vite | `build` | ✅ success |
| **Gate Final** | `deploy-ready` | ✅ **success** |

### CI Security & Drift — Run #40129973781 (SHA `ec736c90`) — ❌ FAILURE (não é required check)

| Job | Step | Status | Detalhe |
|---|---|---|---|
| `quality-gate` | Step 1–3 | ✅ success | setup, checkout, node |
| `quality-gate` | **Step 4** | ❌ **failure** | "Dependency vulnerability policy" — GHSA-mrhx-c7xc-m3w5 (zod DoS, isDirect:false, via chromium-bidi) |
| `quality-gate` | Step 5–26 | ⏭ skipped | bloqueados pelo step 4 |
| `security-audit` | todos | ✅ success | — |

**Falha pré-existente confirmada:** `check-dependency-audit.mjs` detecta advisory GHSA-mrhx-c7xc-m3w5 (zod DoS) como `isDirect:false` após upgrade Zod 3→4 via PR #2401. Não bloqueia merge (ci-security-drift.yml não é required check no Gate Final).

**Deploy Gates em main `7061adab` (fim sessão):** run #40128149143 → **success** (Gate Final verde).

---

## git cherry / patch-id — evidência de implementação prévia

Verificação se commits dos PRs já estão em main via `git cherry`:

| PR | Método | Resultado |
|---|---|---|
| #2414 | cherry | 14 commits — todos `+` (não estão em main) |
| #2415 | cherry | 6 commits — todos `+` (não estão em main) |
| #2417 | N/A | NO_MERGE_BASE — branch órfã (28 commits, sem ancestral comum com main) |
| #2418 | N/A | NO_MERGE_BASE — branch órfã (20 commits) |
| #2419 | N/A | NO_MERGE_BASE — branch órfã (33 commits) |
| #2420 | N/A | NO_MERGE_BASE — branch órfã (17 commits) |
| #2422 | N/A | NO_MERGE_BASE — branch órfã (19 commits) |
| #2424 | cherry | 3 commits `+`, base=`74ac36f1` |
| #2428 | cherry | 1 commit `+`, base=`71d624e8` |

Nenhum commit dos PRs abertos está já em main. Todos os PRs trazem mudanças únicas.

---

## SINGU (pqpdolkaeqlyzpdpbizo) — verificação read-only [LEGACY_INFORMATIVO]

Busca por adições (`+`) de referências ao projeto proibido `pqpdolkaeqlyzpdpbizo` em cada PR:

| PR | Refs adicionadas | Detalhe |
|---|---|---|
| #2414 | 1 ref (docs only) | `analise-branches/` — texto de dossiê menciona "probe que varre refs a `pqpdolkaeqlyzpdpbizo`" [LEGACY_INFORMATIVO]. Sem escrita ao projeto. |
| #2415 | 0 | Limpo |
| #2417–#2422 | 0 | Limpos |
| #2424 | 0 | Limpo |
| #2428 | 0 | Limpo |

**Conclusão:** Nenhum PR escreve no projeto SINGU. A referência em #2414 é documental (menciona o ID ao descrever o probe de auditoria).

---

## Confirmação de produção — cors.ts (#2427)

PR #2427 mergeado (SHA `26641b0a`) altera `supabase/functions/_shared/cors.ts` (módulo compartilhado — não é função standalone).

**Deploy status:**
- Run #40132059704 (dispatch com `function_name: _shared/cors`): `cancelled` — input inválido (`_shared/cors` não é slug de função)
- Run #40132411991 (dispatch sem `function_name` — redeploy completo): **NÃO VERIFICADO — RUN STUCK/PENDING** (despachado às `2026-10-24T21:01:53Z`, nunca saiu de `pending`, main avançou para `c8ba40e9` depois). PO deve verificar GitHub Actions queue e re-disparar se necessário via `deploy-edge-functions.yml` sem `function_name`.

**Funções que importam `_shared/cors.ts`:** todas as edge functions que usam headers CORS (arquivo é shared module importado pelo entrypoint de cada função via import map).

**Estado:** Deploy de todas as funções disparado via `deploy-edge-functions.yml` workflow_dispatch em main `4c8193b9`. Run #40132411991 ficou stuck em `pending` e nunca iniciou — produção pode não ter recebido o `CORS_WILDCARD_ORIGIN = String.fromCharCode(42)`. **AÇÃO REQUERIDA DO PO.**

---

## Resumo dos Merges

| PR | SHA do merge | Motivo |
|---|---|---|
| #2426 | `7f5d410a233246c94ee05bc0be6c10be11a3f126` | worktree PASSOU, 1 arquivo QA, sem Rule 8 |
| #2427 | `26641b0a0cb8855f45755cd4734af4c53d52ba5d` | cors.ts + webhook-schemas, sem Rule 8, mergeable:true |
| #2434 | `53ba69b53fd8a8a021e13feb3af485f4ee4de73b` | docs-only analise-prs/, sem Rule 8 |
| #2436 | `4c8193b9b655694635956a2c5702af33051164ad` | atualização deliverables (progresso.json, dossiês), docs |
| #2414 | `7061adab51e13ff2a10c0737014aef20b72b010d` | docs-only analise-branches/, sem Rule 8, conflitos resolvidos via update-branch |
| #2439 | `b3c8f2f33ece1d0da87a841396ecb5dcc8da0db8` | PR de deliverables intermediário (ci-per-test-name.md + dossies #2432/#2435) |

---

## Dossiês por PR

### PR #2426 — MERGEADO ✓

**Título:** chore(qa): probe E184 — varre catálogo vivo por refs legadas pqpdolkae  
**SHA merge:** `7f5d410a233246c94ee05bc0be6c10be11a3f126`  
**Método:** squash

---

### PR #2427 — MERGEADO ✓ (deploy em andamento)

**Título:** fix(cors): CORS_WILDCARD_ORIGIN + magazine-reader-state-read no webhook-schemas  
**SHA merge:** `26641b0a0cb8855f45755cd4734af4c53d52ba5d`  
**Método:** squash  
**Pós-merge:** Deploy de edge functions disparado (run #40132411991)

---

### PR #2434 — MERGEADO ✓

**Título:** chore(análise): relatório completo de PRs abertos — 11/11 analisados  
**SHA merge:** `53ba69b53fd8a8a021e13feb3af485f4ee4de73b`  
**Método:** squash

---

### PR #2436 — MERGEADO ✓

**Título:** chore(análise): atualiza deliverables — 3 merges realizados (#2426 #2427 #2434)  
**SHA merge:** `4c8193b9b655694635956a2c5702af33051164ad`  
**Método:** squash

---

### PR #2414 — MERGEADO ✓

**Título:** chore(análise): dossiês completos + relatório final de branches (Fase 2)  
**Branch:** `claude_05/youthful-goodall-kihjbv`  
**SHA merge:** `7061adab51e13ff2a10c0737014aef20b72b010d`  
**Método:** squash  
**Patch-id:** `c109a6a0ecae3ecb12fa7c01a7ed21baa907c393`  
**SINGU:** 1 ref em docs (menciona ID proibido em texto de auditoria — sem escrita)

**Intenção:** Entrega da Fase 2 da análise de branches: 9 dossiês TOP + confirmação de 44 branches descartáveis + relatório final. Conteúdo em `analise-branches/`.

**Diff verificado:** +6688 linhas, 0 remoções, 26 arquivos — todos em `analise-branches/` (docs/markdown). Nenhum código de produção, migration, workflow CI, secret ou infra.

**Histórico:** PR estava dirty desde main `ad21b02b`. Conflitos resolvidos via update-branch; CI verde confirmado pré-merge.

---

### PR #2415 — DECISÃO HUMANA (Rule 8: CI/workflows)

**Título:** fix(ci): P20 — exclui check-file-size-baseline.test.mjs do Vitest; roda via node --test  
**Branch:** `claude_05/amazing-brahmagupta-0xhdur`  
**Draft:** Não | **mergeable:** true | **mergeable_state:** behind  
**git cherry:** 6 commits, todos `+` (não em main)  
**SINGU:** 0 refs

**Intenção:** Corrige incompatibilidade do `node:test` com Vitest jsdom. Exclui o arquivo do Vitest via `exclude` e o mantém rodando via `node --test` em `ci-security-drift.yml`.

**Arquivos alterados:**
- `vitest.config.ts` — adiciona ao `exclude`
- `.github/workflows/ci-security-drift.yml` — adiciona step `node --test`  ← **Rule 8**
- `RELATORIO_CI.md` — docs

**CI (cfc23c5c):** Supabase Preview: failure (`categories.level` — pre-existing, não relacionado).

**Rule 8:** `.github/workflows/ci-security-drift.yml` → **DECISÃO HUMANA**.

---

### PR #2417 — DECISÃO HUMANA + DIRTY + SEM MERGE BASE

**Título:** fix(cors+ci): CORS wildcard via String.fromCharCode + gitleaks allowlist  
**Draft:** Sim | **mergeable:** false (dirty)  
**git cherry:** NO_MERGE_BASE — 28 commits, branch órfã  
**SINGU:** 0 refs

**Rule 8:** Workflows CI + edge function. **NÃO VERIFICADO** (sem merge base — diff entre histórias completamente separadas).  
**Ação:** Fechar em favor de #2427 (já mergeado) + #2428.

---

### PR #2418 — DECISÃO HUMANA + DIRTY + SEM MERGE BASE

**Título:** fix(gates): gitleaks allowlist FPs + deploy-gates fix  
**Draft:** Sim | **mergeable:** false (dirty)  
**git cherry:** NO_MERGE_BASE — 20 commits, branch órfã  
**SINGU:** 0 refs

**Rule 8:** `deploy-gates.yml` é o gate principal. **NÃO VERIFICADO** (sem merge base).  
**Ação:** Fechar em favor de #2428.

---

### PR #2419 — DECISÃO HUMANA + DIRTY + SEM MERGE BASE

**Título:** fix(security): audit_security_definer_acl — pg_get_userbyid substituindo cast regrole  
**Draft:** Sim | **mergeable:** false (dirty)  
**git cherry:** NO_MERGE_BASE — 33 commits, branch órfã  
**SINGU:** 0 refs

**Rule 8:** Altera gate de segurança (`check-security-definer-acl.mjs`). **NÃO VERIFICADO** (sem merge base).  
**Ação:** Após decisão humana, rebase em main.

---

### PR #2420 — DECISÃO HUMANA + DIRTY + SEM MERGE BASE

**Título:** fix(rollback): header preflight + rollback script para 20261024163500  
**Draft:** Sim | **mergeable:** false (dirty)  
**git cherry:** NO_MERGE_BASE — 17 commits, branch órfã  
**SINGU:** 0 refs

**Rule 8:** `supabase/rollbacks/` adjacente a migrations. **NÃO VERIFICADO** (sem merge base).  
**Ação:** Após decisão humana, rebase + CI.

---

### PR #2422 — DRAFT (sem trigger Rule 8, dirty)

**Título:** chore(sync): MIGRATIONS_SYNC_LOG + PGPORT no SEGREDOS + fix zodResolver cast  
**Draft:** Sim | **mergeable:** false (dirty)  
**git cherry:** NO_MERGE_BASE — 19 commits, branch órfã  
**SINGU:** 0 refs

**Diff verificado (via API):**
1. `docs/ci/SEGREDOS.md` — adiciona `PGPORT` (+1 linha)
2. `scripts/check-secrets-inventory.mjs` — indenta comentário + `secrets.EXAMPLE_API_KEY` ao allowlist
3. `src/components/admin/products/ProductFormFullscreen.tsx` — `as unknown as Resolver<ProductFormData>` (fix TS)
4. `supabase/MIGRATIONS_SYNC_LOG.md` — recibo migration OOB

**Rule 8:** Nenhum trigger direto. Mas branch órfã + dirty.  
**Ação:** Autor deve rebasear em main e converter para pronto; então elegível para merge.

---

### PR #2424 — DECISÃO HUMANA (Rule 8: DDL + CI/workflows)

**Título:** feat(db): migration 20261024163500 + db-schema-drift-check workflow  
**Draft:** Sim | merge base: `74ac36f1`  
**git cherry:** 3 commits `+`, não estão em main  
**SINGU:** 0 refs

**Rule 8:** Migration SQL (`supabase/migrations/`) + `db-schema-drift-check.yml`.  
**Ação:** DECISÃO HUMANA — aplicar via `db-apply-migration.yml` workflow_dispatch (CLAUDE.md E15).

---

### PR #2428 — DECISÃO HUMANA (security allowlist)

**Título:** fix(gitleaks): allowlist — FPs de testes + placeholders de docs  
**Draft:** Sim | merge base: `71d624e8`  
**git cherry:** 1 commit `+`, não está em main  
**SINGU:** 0 refs

**Diff verificado:** Único arquivo `.gitleaks.toml`. Adiciona ~20 regexes ao allowlist (placeholders docs, mock tokens de testes).

**Rule 8:** `.gitleaks.toml` = política de segurança. PR body pediu confirmação humana.  
**Ação:** DECISÃO HUMANA — confirmar que os padrões são FPs aceitáveis.

---

## Tabela Final

| PR | Draft | Mergeable | Rule 8 | cherry | SINGU | Verdict |
|---|---|---|---|---|---|---|
| [#2414](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2414) | — | — | — | squash merge | doc-only | **MERGEADO** `7061adab` |
| [#2415](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2415) | Não | true (behind) | CI/workflows | 6 únicos | 0 | **DECISÃO HUMANA** |
| [#2417](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2417) | Sim | false (dirty) | CI+edge | sem base | 0 | **DECISÃO HUMANA** |
| [#2418](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2418) | Sim | false (dirty) | CI/workflows | sem base | 0 | **DECISÃO HUMANA** |
| [#2419](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2419) | Sim | false (dirty) | security gate | sem base | 0 | **DECISÃO HUMANA** |
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | Sim | false (dirty) | migrations | sem base | 0 | **DECISÃO HUMANA** |
| [#2422](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2422) | Sim | false (dirty) | — | sem base | 0 | **DRAFT+DIRTY** |
| [#2424](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2424) | Sim | null | DDL+CI | 3 únicos | 0 | **DECISÃO HUMANA** |
| [#2426](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2426) | —  | — | — | — | — | **MERGEADO** `7f5d410a` |
| [#2427](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2427) | —  | — | — | — | — | **MERGEADO** `26641b0a` (deploy run #40132411991 — NÃO VERIFICADO) |
| [#2428](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2428) | Sim | true (behind) | security policy | 1 único | 0 | **DECISÃO HUMANA** |
| [#2432](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2432) | Não | — | — | — | 0 | **JÁ IMPLEMENTADA** (em main desde #2426) |
| [#2434](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2434) | —  | — | — | — | — | **MERGEADO** `53ba69b5` |
| [#2435](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2435) | Sim | — | CI/workflows+security | — | 0 | **DECISÃO HUMANA** |
| [#2436](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2436) | —  | — | — | — | — | **MERGEADO** `4c8193b9` |
| [#2437](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2437) | Sim | — | security policy | — | 0 | **DECISÃO HUMANA** |
| [#2438](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2438) | Sim | — | security policy | — | 0 | **DECISÃO HUMANA** |
| [#2441](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2441) | Não | true (behind) | DDL+edge function | 1 commit | 0 | **DECISÃO HUMANA** |
| [#2443](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2443) | Sim | true (behind) | security decisions | 1 commit | 0 | **DECISÃO HUMANA** |

---

### PR #2432 — JÁ IMPLEMENTADA

**Título:** feat(qa): probe E184 — detecta refs legadas ao projeto proibido  
**Agente:** Devin | **Draft:** Não

**Arquivo único:** `qa/migrations-draft/probe_e184_legacy_refs.sql`

**Já em main:** SIM — arquivo idêntico existe em main desde PR #2426 squash merge (SHA `7f5d410a`). Merge seria no-op ou causaria conflito.

**Verdict:** **JÁ IMPLEMENTADA** — nenhuma ação necessária.

---

### PR #2435 — DECISÃO HUMANA (Rule 8: CI/workflows + security policy)

**Título:** fix(ci): Zod v4 repair — UUIDs + vitest + gitleaks + drafts README  
**Branch:** `claude_05/upbeat-hamilton-5gnz50`  
**Draft:** Sim | **SINGU:** 0 refs

**Diff:** `.gitleaks.toml`, `.github/workflows/ci-security-drift.yml`, `PENDENCIAS.md`, `scripts/check-dependency-audit.mjs`, e arquivos `src/`

**Rule 8:** `.github/workflows/ci-security-drift.yml` (CI/workflows) + `.gitleaks.toml` (security scanning policy)

**Verdict:** **DECISÃO HUMANA** — DRAFT + REGRA 8.

---

### PR #2437 — DECISÃO HUMANA (Rule 8: security policy)

**Título:** fix(ci): Zod v4 repair — UUIDs + vitest + gitleaks + drafts README (v2)  
**Branch:** `claude_05/upbeat-hamilton-5gnz50`  
**Draft:** Sim | **SINGU:** 0 refs

**Diff (9 arquivos):** `.gitleaks.toml`, `PENDENCIAS.md`, `scripts/check-dependency-audit.mjs`, `src/hooks/products/useSellerCarts.ts` (`.errors[0]`→`.issues[0]`), `src/lib/validations/goalSchema.ts` (`required_error`→`error`), `src/pages/products/seller-carts/useSellerCartsPage.ts`, `tests/contracts/product-webhook.contract.test.ts` (UUID `4444`→`8444`), `tests/contracts/webhook-contracts.test.ts`, `tests/contracts/webhooks.contract.test.ts`

**Rule 8:** `.gitleaks.toml` (security scanning policy exclusion de `dist/.*`)

**Nota:** Contém correções Zod v4 de alto valor (`.errors[0]`→`.issues[0]`, `required_error`→`error`, UUID variant fix). Sobreposição com #2435 nos arquivos de infraestrutura.

**Verdict:** **DECISÃO HUMANA** — DRAFT + REGRA 8.

---

### PR #2438 — DECISÃO HUMANA (Rule 8: security policy)

**Título:** chore(ci): RELATORIO_CI + PENDENCIAS — docs de auditoria pós-Zod v4  
**Draft:** Sim | **SINGU:** 0 refs

**Diff (3 arquivos):** `.gitleaks.toml`, `PENDENCIAS.md`, `RELATORIO_CI.md`

**Rule 8:** `.gitleaks.toml` (security scanning policy) — mesmo que seja predominantemente docs, o gitleaks arrasta o bloqueio.

**Verdict:** **DECISÃO HUMANA** — DRAFT + REGRA 8.

---

## Ação requerida do PO (por prioridade)

### 1. Confirmar deploy de edge functions (run #40132411991) — NÃO VERIFICADO
cors.ts atualizado em #2427 — deploy de todas as funções disparado. Supabase MCP indisponível nesta sessão (ERR_PROXY_TUNNEL), não foi possível confirmar produção.

### 2. Decidir sobre .gitleaks.toml — desbloqueia #2428, #2435, #2437, #2438
Quatro PRs abertos tocam `.gitleaks.toml` (exclusão de `dist/.*` + FPs de testes). Se aprovado, #2428 (non-draft, 1 commit) pode ser mergeado após undraft.

### 3. Aprovar merge de #2415 (fix CI real, non-draft, sem conflitos)
Toca `ci-security-drift.yml` — corrige incompatibilidade `node:test` / Vitest jsdom.

### 4. Decidir sobre #2437 (Zod v4 fixes em src/ + tests/contracts/)
Conteúdo de alto valor: `.errors[0]`→`.issues[0]`, `required_error`→`error`, UUID variant fix. Após aprovação .gitleaks.toml, marcar como pronto e mergear.

### 5. Decidir sobre #2424 (migration 20261024163500)
Aplicar via `db-apply-migration.yml` workflow_dispatch + merge do PR.

### 6. PR #2422 — rebasear em main e marcar pronto
Branch órfã + dirty. Conteúdo válido (fix TS + docs).

### 7. Decidir sobre #2441 (FASE B: P02/P08/P19 migrations + send-notification)
Migrations aditivas/idempotentes com rollback. Após aprovação: merge + `db-apply-migration.yml` + `deploy-edge-functions.yml`.

### 8. Revisar propostas de #2443 (P06/P09/P14/P15/P03_security_definer)
Responder com `APROVADO <ID>` para cada proposta aceita. P03_security_definer é o mais urgente (escalação de privilégio).

### 9. PRs dirty com Rule 8: #2417, #2418, #2419, #2420
Fechar em favor de substitutos ou rebasar + DECISÃO HUMANA.

---

## Observações

- **#2417 e #2418** são versões "sujas" de #2427 e #2428 respectivamente — provavelmente podem ser fechados.
- **Deploy pós-#2427**: run #40132411991 em main `4c8193b9` via `deploy-edge-functions.yml` sem `function_name` (redeploy completo).
- **CI de #2415**: Supabase Preview falha com `categories.level` — pre-existing, não causado pelo PR.
- **PRs #2417–#2422**: branches órfãs sem ancestral comum com main atual — diff completo impossível via three-dot notation.

---

### PR #2441 — DECISÃO HUMANA (Rule 8: DDL + edge function)

**Título:** feat(db+ef): FASE B — P02/P08/P19 migrations + send-notification idempotency  
**Branch:** `claude_05/friendly-keller-3mgkhz`  
**Draft:** Não | **mergeable:** true (behind) | **SINGU:** 0 refs

**Diff (4 arquivos, 153+/16-):**
- `supabase/migrations/20261024180001_p02_fk_indexes.sql` — 6 índices FK (`CREATE INDEX IF NOT EXISTS`)
- `supabase/migrations/20261024180002_p08_idempotency_key.sql` — ADD COLUMN + UNIQUE INDEX parcial em `workspace_notifications`
- `supabase/migrations/20261024180003_p19_complement_cron.sql` — `cron.alter_job` para `auto-block-offenders` (5 min → 15 min)
- `supabase/functions/send-notification/index.ts` — upsert idempotente com `idempotency_key`

**Rule 8:** DDL em `supabase/migrations/` + edge function atualizada → **DECISÃO HUMANA**.  
**Ação:** Após aprovação PO: merge + `db-apply-migration.yml` (P02/P08/P19) + `deploy-edge-functions.yml` (send-notification).

---

### PR #2443 — DECISÃO HUMANA (draft + aprovação explícita requerida)

**Título:** APROVAÇÃO REQUERIDA: P06 / P09 / P14 / P15 / P03_security_definer — FASE B auditoria Supabase  
**Branch:** `claude/feat-aprovacao-p06-p09-p14-p15-p03sec-261024-2315`  
**Draft:** Sim | **mergeable:** true (behind) | **SINGU:** 0 refs

**Diff (1 arquivo, 218+/0-):**
- `auditoria-supabase/analise-impacto/APROVACAO_FASE_B_IMPACTO.md` — análise de impacto de 5 propostas

**Propostas (sem código executável):**
- P03_security_definer: 45 funções SECURITY DEFINER com `pg_temp` em `search_path` (risco: ZERO — fix urgente)
- P14: 590 policies RLS sem `(SELECT auth.uid())` (performance)
- P15: 56 tabelas com policies anon (risco: MÉDIO — `color_synonym_map` com `qual = 'true'`)
- P06: 9 views `_public` com `security_invoker=false` (risco: ALTO — quebra catálogo público)
- P09: 464 migrations sem ledger (investigação de 8–16h)

**Verdict:** **DECISÃO HUMANA** — Draft + título "APROVAÇÃO REQUERIDA" + security decisions.

---

_Análise por Claude Code — sessão https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz_
