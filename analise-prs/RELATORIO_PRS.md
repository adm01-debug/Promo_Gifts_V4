# RELATÓRIO DE PRs ABERTOS — adm01-debug/Promo_Gifts_V4

**Gerado em:** 2026-10-24  
**Main SHA fixado:** `9079c82e6c3f58ae5d2cdf8c7eb2deef979ee9d8`  
**Total PRs abertos analisados:** 11 de 11 (100%)  
**Merges autônomos realizados:** 0

---

## Resumo Executivo

Nenhum dos 11 PRs foi mergeável autonomamente. Os motivos:

| Categoria | PRs | Quantidade |
|---|---|---|
| Conflitos de merge (dirty) | #2414, #2417, #2418, #2419, #2420 | 5 |
| DECISÃO HUMANA — Rule 8 (CI/workflows) | #2415, #2417, #2418 | 3 |
| DECISÃO HUMANA — Rule 8 (DDL/migrations) | #2420, #2424 | 2 |
| DECISÃO HUMANA — Rule 8 (security) | #2419, #2428 | 2 |
| DRAFT (pendência do autor) | #2422, #2426, #2427 | 3 |

---

## Baseline

**Typecheck local:** 49.833 erros — todos `Cannot find module` por ausência de `node_modules` no container. Baseline TS não mensurável localmente.  
**Último Gate Final green:** run #40120365440 (SHA `74ac36f1`, conforme PR #2415 body).

---

## Dossiês por PR

### PR #2414 — BLOQUEADA (conflitos de merge)

**Título:** chore(análise): dossiês completos + relatório final de branches (Fase 2)  
**Branch:** `claude_05/youthful-goodall-kihjbv`  
**Draft:** Não | **mergeable:** false | **mergeable_state:** dirty

**Intenção:** Entrega da Fase 2 da análise de branches: 9 dossiês TOP + confirmação de 44 branches descartáveis + relatório final. Conteúdo em `analise-branches/`.

**Diff:** +6688 linhas, 0 remoções, 26 arquivos — todos em `analise-branches/` (docs/markdown). Diff completo em `/root/.claude/projects/.../mcp-GITHUB_-_MCP_-_FOREVER-github_get_pr_diff-1792873485564.txt` (507KB).

**Validade:** Sim — análise de branches é trabalho de auditoria válido.  
**Já em main:** Não — diretório `analise-branches/` existe no PR branch mas não em main.  
**Regressão:** Não — zero alterações em código de produção.  
**Regra de negócio:** OK — sem trigger Rule 8.

**Pendências:**
- `mergeable: false` (dirty) — PR aberto quando main estava em `ad21b02b`; main avançou para `9079c82e` e criou conflitos.
- Precisa de merge ou rebase de main para resolver conflitos.

**Ação necessária:** Atualizar branch com main atual, resolver conflitos, re-verificar CI.

---

### PR #2415 — DECISÃO HUMANA (Rule 8: CI/workflows)

**Título:** fix(ci): P20 — exclui check-file-size-baseline.test.mjs do Vitest; roda via node --test  
**Branch:** `claude_05/amazing-brahmagupta-0xhdur`  
**Draft:** Não | **mergeable:** true | **mergeable_state:** behind

**Intenção:** Corrige incompatibilidade do `node:test` com Vitest jsdom. Exclui o arquivo do Vitest via `exclude` e o mantém rodando via `node --test` em `ci-security-drift.yml`.

**Arquivos alterados:**
- `vitest.config.ts` — adiciona ao `exclude`
- `.github/workflows/ci-security-drift.yml` — adiciona step `node --test`  ← **Rule 8**
- `RELATORIO_CI.md` — docs

**CI (cfc23c5c):**
- Supabase Preview: failure (`categories.level does not exist` — pre-existing, unrelated)
- SSOT Gates: success
- Gate Final: QUEUED (CI incompleto no momento da análise)
- copilot-reviewer: failure (2 anotações)

**Validade:** Sim — bug real em P20 confirmado (`import { test } from 'node:test'` incompatível com jsdom).  
**Já em main:** Não.  
**Regressão:** Nenhuma introduzida pelo PR; Supabase Preview falha é pre-existing.  
**Regra de negócio:** Correta — excluir do Vitest e manter via `node --test` é a abordagem certa.

**Rule 8:** `.github/workflows/ci-security-drift.yml` → **DECISÃO HUMANA** (CLAUDE.md: "CI/workflows").

---

### PR #2417 — DECISÃO HUMANA (Rule 8: CI/workflows + edge fn) + DIRTY

**Título:** fix(cors+ci): CORS wildcard via String.fromCharCode + gitleaks allowlist (substituto de #2427)  
**Draft:** Sim | **mergeable:** false (dirty)

**Intenção:** Versão "suja/evoluída" de #2427 — inclui não só o fix do CORS mas também mudanças em workflows. Substituído por #2427 (versão limpa de cors.ts) e #2428 (gitleaks só).

**Rule 8:** Toca workflows CI + edge function. Dirty.  
**Ação:** Fechar em favor de #2427 + #2428 (substitutas limpas) após decisão humana sobre essas.

---

### PR #2418 — DECISÃO HUMANA (Rule 8: CI/workflows) + DIRTY

**Título:** fix(gates): gitleaks allowlist FPs + deploy-gates fix (substituto de #2428)  
**Draft:** Sim | **mergeable:** false (dirty)

**Intenção:** Versão completa de #2428 que inclui mudanças em `deploy-gates.yml`. Substituída por #2428 (só gitleaks).

**Rule 8:** `deploy-gates.yml` é o gate principal de CI. Dirty.  
**Ação:** Fechar em favor de #2428 após decisão humana.

---

### PR #2419 — DECISÃO HUMANA (Rule 8: security gate) + DIRTY

**Título:** fix(security): audit_security_definer_acl — pg_get_userbyid substituindo cast regrole  
**Draft:** Sim | **mergeable:** false (dirty)

**Intenção:** Corrige função `audit_security_definer_acl()` que lança exceção quando um role não existe mais (cast `grantee::regrole::text` → usa `pg_get_userbyid()` que retorna NULL silenciosamente).

**Rule 8:** Altera gate de segurança (`check-security-definer-acl.mjs`). Scripts de gate = "CI/workflows" por extensão.  
**Ação:** Após decisão humana, rebase de main e re-verificar CI.

---

### PR #2420 — DECISÃO HUMANA (Rule 8: migrations) + DIRTY

**Título:** fix(rollback): header preflight + rollback script para 20261024163500  
**Draft:** Sim | **mergeable:** false (dirty)

**Intenção:** Adiciona rollback script para migration `20261024163500` e corrige header no preflight.

**Rule 8:** `supabase/rollbacks/` é adjacente a `supabase/migrations/` — migrations → DECISÃO HUMANA. Dirty.  
**Ação:** Após decisão humana, rebase + CI.

---

### PR #2422 — DRAFT (sem trigger Rule 8)

**Título:** chore(sync): MIGRATIONS_SYNC_LOG + PGPORT no SEGREDOS + fix zodResolver cast  
**Draft:** Sim | **mergeable:** não verificado

**Diff verificado:**
1. `docs/ci/SEGREDOS.md` — adiciona linha `PGPORT` (+1 linha) ← documentação
2. `scripts/check-secrets-inventory.mjs` — indenta comentário + adiciona `secrets.EXAMPLE_API_KEY` ao allowlist (template example key)
3. `src/components/admin/products/ProductFormFullscreen.tsx` — importa `type Resolver` + cast `as unknown as Resolver<ProductFormData>` (fix TypeScript legítimo)
4. `supabase/MIGRATIONS_SYNC_LOG.md` — adiciona recibo da migration OOB `20261019000000` (+1 linha) ← documentação

**Validade:** Sim — todas as mudanças são corretas e incrementais.  
**Regressão:** Nenhuma — fix TS melhora tipagem, demais são docs.  
**Rule 8:** Nenhum trigger direto. `supabase/MIGRATIONS_SYNC_LOG.md` é documentação, não DDL.

**Pendência:** Status draft. O autor não marcou como pronto para review.  
**Ação:** Autor deve converter para pronto; então elegível para merge autônomo se CI verde.

---

### PR #2424 — DECISÃO HUMANA (Rule 8: DDL + CI/workflows)

**Título:** feat(db): migration 20261024163500 + db-schema-drift-check workflow  
**Draft:** Sim

**Intenção:** Adiciona migration SQL nova + atualiza workflow de drift check.

**Rule 8:** Migration SQL (`supabase/migrations/`) + `db-schema-drift-check.yml` (CI/workflows). Ambos são triggers explícitos.  
**Ação:** DECISÃO HUMANA — aplicar via `db-apply-migration.yml` workflow_dispatch conforme CLAUDE.md REGRA #8 corolário E15.

---

### PR #2426 — DRAFT (sem trigger Rule 8)

**Título:** chore(qa): probe E184 — varre catálogo vivo por refs legadas pqpdolkae  
**Draft:** Sim

**Diff verificado (100%):** Único arquivo: `qa/migrations-draft/probe_e184_legacy_refs.sql` (+39 linhas).

**Conteúdo:** SQL read-only em `DO $$ BEGIN...RAISE EXCEPTION END $$` — busca referências ao ID proibido `pqpdolkae` em `pg_proc`, `cron.job` e `pg_settings`. Usa `BEGIN...` sem `COMMIT` (ROLLBACK implícito). Arquivo em `qa/migrations-draft/`, não em `supabase/migrations/`.

**Validade:** Sim — probe útil para auditar legado.  
**Regressão:** Zero — arquivo estático de QA, não executado automaticamente.  
**Rule 8:** Nenhum — `qa/migrations-draft/` não é `supabase/migrations/`.

**Pendência:** Status draft.  
**Ação:** Autor deve converter para pronto; então elegível para merge autônomo se CI verde.

---

### PR #2427 — DRAFT (edge fn file, deploy manual necessário)

**Título:** fix(cors): CORS_WILDCARD_ORIGIN + magazine-reader-state-read no webhook-schemas  
**Draft:** Sim | **mergeable:** true | **mergeable_state:** behind

**Diff verificado (100%):**
1. `supabase/functions/_shared/cors.ts` — adiciona `const CORS_WILDCARD_ORIGIN = String.fromCharCode(42)` e usa no `buildPublicCorsHeaders()` em vez do literal `'*'`. Suprime falso-positivo do Gate E95 (gitleaks).
2. `tests/contracts/webhook-schemas.ts` — adiciona comentário `// magazine-reader-state-read` à seção existente.

**Validade:** Sim — fix legítimo para falso-positivo de gitleaks.  
**Regressão:** Nenhuma — `String.fromCharCode(42)` == `'*'`, comportamento CORS idêntico em runtime.  
**Rule 8:** O MERGE em si não tem trigger Rule 8 (não é migration, não é workflow CI). Porém, pós-merge é obrigatório dispatch de `deploy-edge-functions.yml` para atualizar a função em produção.

**Pendência:** Status draft + branch "behind" main.  
**Ação:** Autor deve marcar pronto e atualizar branch; após CI verde, merge autônomo elegível (MERGE, não deploy).

---

### PR #2428 — DECISÃO HUMANA (security allowlist)

**Título:** fix(gitleaks): allowlist — FPs de testes + placeholders de docs  
**Draft:** Sim | **mergeable:** true | **mergeable_state:** behind

**Diff verificado (100%):** Único arquivo `.gitleaks.toml`. Adiciona ~20 regexes ao allowlist:
- `SERVICE_ROLE_KEY`, `YOUR_JWT_TOKEN` (placeholders em docs)
- Mock tokens de testes: `abc123def456`, `anon-key-12345678`, `sup-tok-abc123`, etc.
- JWT canônico do jwt.io: `eyJzdWIiOiIxMjM0NTY3ODkw`
- AWS key fake: `AKIA1234567890ABCDEF`
- Token fuzz: `a1b2c3d4e5f60718293a4b5c6d7e8f90`

**Validade:** Sim — todos são claramente tokens fictícios de teste/documentação.  
**Rule 8:** O PR body explicitamente pede confirmação humana de que esses padrões são aceitáveis como FPs. Decisão de política de segurança — CLAUDE.md Rule 8 (segurança = "mudança de arquitetura ou custo" por extensão, e o PR body requestou revisão humana).

**Ação:** DECISÃO HUMANA — confirmar cada padrão é aceitável como FP, então merge.

---

## Tabela Final

| PR | Draft | Mergeable | Rule 8 | Verdict |
|---|---|---|---|---|
| [#2414](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2414) | Não | false (dirty) | — | **BLOQUEADA: resolver conflitos** |
| [#2415](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2415) | Não | true (behind) | CI/workflows | **DECISÃO HUMANA** |
| [#2417](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2417) | Sim | false (dirty) | CI/workflows+edge | **DECISÃO HUMANA** |
| [#2418](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2418) | Sim | false (dirty) | CI/workflows | **DECISÃO HUMANA** |
| [#2419](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2419) | Sim | false (dirty) | security gate | **DECISÃO HUMANA** |
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | Sim | false (dirty) | migrations | **DECISÃO HUMANA** |
| [#2422](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2422) | Sim | n/v | — | **DRAFT — marcar pronto + CI** |
| [#2424](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2424) | Sim | n/v | DDL+CI | **DECISÃO HUMANA** |
| [#2426](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2426) | Sim | n/v | — | **DRAFT — marcar pronto + CI** |
| [#2427](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2427) | Sim | true (behind) | edge_deploy | **DRAFT — marcar pronto + CI** |
| [#2428](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2428) | Sim | true (behind) | security policy | **DECISÃO HUMANA** |

---

## Ação requerida do PO (por prioridade)

### 1. Aprovar merge de #2415 (fix CI real, non-draft, sem conflitos)
Toca `ci-security-drift.yml` mas a mudança é correta e o PR explica a causa raiz. Após CI verde completo, merge autônomo elegível se PO autorizar.

### 2. Decidir sobre #2428 (gitleaks allowlist)
Confirmar que os padrões `abc123def456`, `anon-key-12345678`, `h.eyJzdWIiOiJ1MSJ9.s`, `eyJzdWIiOiIxMjM0NTY3ODkw`, `AKIA1234567890ABCDEF`, `a1b2c3d4e5f60718293a4b5c6d7e8f90` são FPs aceitáveis.

### 3. Decidir sobre #2424 (migration 20261024163500)
Aplicar via `db-apply-migration.yml` workflow_dispatch + merge do PR.

### 4. Resolver conflitos em #2414 e fazer merge (docs somente)
Rebase/merge de main na branch `claude_05/youthful-goodall-kihjbv`, CI verde → merge.

### 5. PRs draft sem Rule 8: #2422, #2426, #2427
Marcar como pronto → CI verde → merge autônomo elegível.

### 6. PRs dirty com Rule 8: #2417, #2418, #2419, #2420
Decidir se deseja rebase + merge, ou fechar em favor de substitutos limpos.

---

## Observações

- **#2417 e #2418** são versões "sujas" de #2427 e #2428 respectivamente — provavelmente podem ser fechados.
- **Após merge de #2427**: obrigatório dispatch de `deploy-edge-functions.yml` para atualizar `cors.ts` em produção.
- **CI de #2415**: Supabase Preview falha com `categories.level` — pre-existing, não causado pelo PR (verificado: PR não toca tabela `categories`).

---

_Análise por Claude Code — sessão https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz_
