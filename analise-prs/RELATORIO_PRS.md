# RELATÓRIO DE PRs ABERTOS — adm01-debug/Promo_Gifts_V4

**Gerado em:** 2026-10-24  
**Main SHA início da sessão:** `9079c82e6c3f58ae5d2cdf8c7eb2deef979ee9d8`  
**Main SHA fim da sessão:** `4c8193b9b655694635956a2c5702af33051164ad`  
**Total PRs abertos analisados:** 13 de 13 (100%)  
**Merges autônomos realizados:** 4 (#2426, #2427, #2434, #2436)  
**PRs restantes abertos:** 9

---

## Baseline CI (por nome de job/step)

**Workflow executado:** CI Security & Drift Checks  
**SHA:** `ec736c903cc37a0ef8621eec5a2d05775a64bcb9`  
**Run:** #40129973781  

| Job | Status | Observação |
|---|---|---|
| `quality-gate` | FAILURE | Falhou no step "Dependency vulnerability policy" (step 4 de 26). Steps 5-26: SKIPPED. Pré-existente — CVE em dependência de main anterior ao início desta sessão. |
| `security-audit` | SUCCESS | Step "Audit Credentials" → success |

**Falha pré-existente confirmada:** `npm audit --audit-level high` detecta CVE high/critical em dependência que já estava em `main` antes de qualquer PR desta sessão.

**Deploy Gates em main `4c8193b9` (fim sessão):** run #40128149143 → **success** (Gate Final verde).

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

## SINGU (pqpdolkaeqlyzpdpbizo) — verificação read-only

Busca por adições (`+`) de referências ao projeto proibido `pqpdolkaeqlyzpdpbizo` em cada PR:

| PR | Refs adicionadas | Detalhe |
|---|---|---|
| #2414 | 1 ref (docs only) | `analise-branches/` — texto de dossiê menciona "probe que varre refs a `pqpdolkaeqlyzpdpbizo`". Sem escrita ao projeto. |
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
- Run #40132411991 (dispatch sem `function_name` — redeploy completo): `pending` (despachado às `2026-10-24T21:01:53Z`)

**Funções que importam `_shared/cors.ts`:** todas as edge functions que usam headers CORS (arquivo é shared module importado pelo entrypoint de cada função via import map).

**Estado:** Deploy de todas as funções disparado via `deploy-edge-functions.yml` workflow_dispatch em main `4c8193b9`. O run #40132411991 está em andamento — as funções serão atualizadas com `CORS_WILDCARD_ORIGIN = String.fromCharCode(42)`.

---

## Resumo dos Merges

| PR | SHA do merge | Motivo |
|---|---|---|
| #2426 | `7f5d410a233246c94ee05bc0be6c10be11a3f126` | worktree PASSOU, 1 arquivo QA, sem Rule 8 |
| #2427 | `26641b0a0cb8855f45755cd4734af4c53d52ba5d` | cors.ts + webhook-schemas, sem Rule 8, mergeable:true |
| #2434 | `53ba69b53fd8a8a021e13feb3af485f4ee4de73b` | docs-only analise-prs/, sem Rule 8 |
| #2436 | `4c8193b9b655694635956a2c5702af33051164ad` | atualização deliverables (progresso.json, dossiês), docs |

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

### PR #2414 — BLOQUEADA (conflitos de merge)

**Título:** chore(análise): dossiês completos + relatório final de branches (Fase 2)  
**Branch:** `claude_05/youthful-goodall-kihjbv`  
**Draft:** Não | **mergeable:** false | **mergeable_state:** dirty  
**git cherry:** 14 commits, todos `+` (não em main)  
**SINGU:** 1 ref em docs (menciona ID proibido em texto de auditoria — sem escrita)

**Intenção:** Entrega da Fase 2 da análise de branches: 9 dossiês TOP + confirmação de 44 branches descartáveis + relatório final. Conteúdo em `analise-branches/`.

**Diff verificado:** +6688 linhas, 0 remoções, 26 arquivos — todos em `analise-branches/` (docs/markdown). Nenhum código de produção, migration, workflow CI, secret ou infra.

**Validade:** Sim — análise de branches é trabalho de auditoria válido.  
**Já em main:** Não — `analise-branches/` não existe em main.  
**Regressão:** Não — zero alterações em código de produção.  
**Rule 8:** Nenhum trigger.

**Bloqueio:** `mergeable: false` (dirty) — PR aberto quando main estava em `ad21b02b`; main avançou para `4c8193b9` e criou conflitos.

**Ação necessária:** Atualizar branch com main atual, resolver conflitos, re-verificar CI.

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
| [#2414](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2414) | Não | false (dirty) | — | 14 commits únicos | doc-only | **BLOQUEADA: conflitos** |
| [#2415](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2415) | Não | true (behind) | CI/workflows | 6 únicos | 0 | **DECISÃO HUMANA** |
| [#2417](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2417) | Sim | false (dirty) | CI+edge | sem base | 0 | **DECISÃO HUMANA** |
| [#2418](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2418) | Sim | false (dirty) | CI/workflows | sem base | 0 | **DECISÃO HUMANA** |
| [#2419](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2419) | Sim | false (dirty) | security gate | sem base | 0 | **DECISÃO HUMANA** |
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | Sim | false (dirty) | migrations | sem base | 0 | **DECISÃO HUMANA** |
| [#2422](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2422) | Sim | false (dirty) | — | sem base | 0 | **DRAFT+DIRTY** |
| [#2424](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2424) | Sim | null | DDL+CI | 3 únicos | 0 | **DECISÃO HUMANA** |
| [#2426](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2426) | —  | — | — | — | — | **MERGEADO** `7f5d410a` |
| [#2427](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2427) | —  | — | — | — | — | **MERGEADO** `26641b0a` (deploy run #40132411991) |
| [#2428](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2428) | Sim | true (behind) | security policy | 1 único | 0 | **DECISÃO HUMANA** |
| [#2434](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2434) | —  | — | — | — | — | **MERGEADO** `53ba69b5` |
| [#2436](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2436) | —  | — | — | — | — | **MERGEADO** `4c8193b9` |

---

## Ação requerida do PO (por prioridade)

### 1. Confirmar deploy de edge functions concluído (run #40132411991)
cors.ts atualizado em #2427 — deploy de todas as funções disparado. Verificar que o run completou com sucesso.

### 2. Aprovar merge de #2415 (fix CI real, non-draft, sem conflitos)
Toca `ci-security-drift.yml` mas a mudança é correta e o PR explica a causa raiz.

### 3. Decidir sobre #2428 (gitleaks allowlist)
Confirmar que os padrões de mock tokens são FPs aceitáveis.

### 4. Decidir sobre #2424 (migration 20261024163500)
Aplicar via `db-apply-migration.yml` workflow_dispatch + merge do PR.

### 5. Resolver conflitos em #2414 (docs somente)
Rebase/merge de main na branch + CI verde → merge.

### 6. PR #2422 — rebasear em main e marcar pronto
Branch órfã + dirty. Conteúdo válido (fix TS + docs).

### 7. PRs dirty com Rule 8: #2417, #2418, #2419, #2420
Fechar em favor de substitutos ou rebasar + DECISÃO HUMANA.

---

## Observações

- **#2417 e #2418** são versões "sujas" de #2427 e #2428 respectivamente — provavelmente podem ser fechados.
- **Deploy pós-#2427**: run #40132411991 em main `4c8193b9` via `deploy-edge-functions.yml` sem `function_name` (redeploy completo).
- **CI de #2415**: Supabase Preview falha com `categories.level` — pre-existing, não causado pelo PR.
- **PRs #2417–#2422**: branches órfãs sem ancestral comum com main atual — diff completo impossível via three-dot notation.

---

_Análise por Claude Code — sessão https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz_
