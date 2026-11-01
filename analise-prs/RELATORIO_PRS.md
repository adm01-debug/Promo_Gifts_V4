# Relatório de Análise de PRs

**Gerado em:** 2026-11-01 (v5 — análise exaustiva de 45 PRs)
**SHA main fixado:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`
**SHA main atual:** `10d1a49935e4d07fb14087c9e3c46435f3ea82df`
**Total PRs analisadas:** 45 (3 mergeadas sessão + 5 mergeadas owner + 3 aguardando CI + 1 conflito + 1 diff-vazio + 1 fechada + 30 draft + 1 branch-trabalho)

---

## ✅ MERGEADAS NESTA SESSÃO (3)

### PR #2927 — fix(listas): normaliza filtros padrão após navegação POP

**Branch:** `claude/fix-e2e-url-state-261101-2045` | **Merge SHA:** `c80b098a654e90d7b8a962a67babbffb12063f33`

- **quality-gate:** `completed/success` no SHA `f23ee40`
- **Diff:** 11 arquivos — `useListUrlState.ts` + testes + allowlist + `check-dependency-audit.mjs`
- **Worktree merge test:** limpo, sem conflito
- **Banco:** `is_supervisor_or_above` e `log_rls_denial` não existem como SECURITY DEFINER
- **Método:** squash-merge, branch apagada

### PR #2949 — docs: dossie análise PR 2927 e atualização progresso

**Branch:** `claude/docs-analise-pr2927-261101` | **Merge SHA:** `a16b116a893910299b45f3c358a7615bf7150daf`

- **CI:** E14 bypass — `paths-ignore: docs/**` — PR docs-only
- **Diff:** apenas `analise-prs/` — sem código de produção
- **Método:** squash-merge

### PR #2983 — docs(auditoria): PERF-005 atualiza run ID para #41358644333

**Branch:** `claude/fix-relatorio-perf005-run-id-2026110122` | **Merge SHA:** `387afee45d9001af8eba7d34cc3f81cbd5cdac37`

- **CI:** docs-adjacent, sem gate bloqueante; mergeada pelo owner (adm01-debug)
- **Diff:** `auditoria-supabase/RELATORIO_AUDITORIA_SUPABASE.md` +6/-5
- **Método:** squash-merge, 2026-11-01T22:50:46Z

---

## ✅ MERGEADAS PELO OWNER (5)

### PR #2947 — fix: adiciona rollback da migration 20261029160339 (kill_switch_hits)

**Branch:** `claude/fix-rollback-killswitch-261101-1855` | **Merge SHA:** `e3e8e051cb459572ce6eb72553b7c58958f206e7`

- **CI:** sem quality-gate antes do merge (rollback file apenas)
- **Diff:** 1 arquivo novo `supabase/rollbacks/20261029160339_rollback.sql` (4 linhas)
- **Método:** squash-merge pelo owner (adm01-debug), 2026-11-01T23:06:32Z

### PR #2960 — fix(novidades/reposicao): remove fake progress bar

**Branch:** `claude/fix-progress-bars-261101-2159` | **Merge SHA:** `a25070630788f77b297431665878319ad74bb587`

- **Diff:** 4 arquivos — remove `Math.random()` + `setInterval` progress state; add `animate-pulse`
- **Owner mergeou apesar de:** `mergeable_state: blocked` (unresolved review comment) + quality-gate queued
- **Método:** squash-merge pelo owner (adm01-debug), 2026-11-01T23:08:14Z

### PR #2952 — fix(ci): Gate 1.13 — tolerância automática para policies de partições mensais

**Branch:** `claude/fix-policies-partition-auto-tolerate-261101-2220` | **Merge SHA:** `eeca843a31112a65dcc66aebd2d94ae23cd129ea`

- **Diff:** `scripts/check-policies-baseline.mjs` +73/-2 — `normalizePartitionSelfRefs()`
- **Era:** DECISÃO HUMANA (REGRA #9: scripts/check-*); owner aprovou e mergeou (Gate 1.13 partições)
- **Método:** squash-merge pelo owner (adm01-debug), 2026-11-01T23:08:45Z

### PR #2944 — chore(main): release 1.6.1

**Branch:** `release-please--branches--main--components--gifts-store` | **Merge SHA:** `03fc479aaf682f7e2f3958ad481c9c28c211d582`

- **Era:** BOT-MANAGED (release-please, label `autorelease:pending`)
- **Método:** squash-merge pelo owner (adm01-debug), 2026-11-01T23:08:57Z

### PR #2940 — feat(nav): adiciona entrada Audit Suite na sidebar admin

**Branch:** `claude/feat-audit-suite-nav-261101-2200` | **Merge SHA:** `686be704a4f7b1c5e2cbedcf581bd075e9898d16`

- **Bug presente no diff:** typo `// Se ogropo` em `SidebarReorganized.tsx` (~linha 290)
- **Owner mergeou apesar de:** bug ativo + 2 review comments não resolvidos
- **Método:** squash-merge pelo owner (adm01-debug), 2026-11-01T23:08:34Z

---

## ⏳ AGUARDANDO CI (3)

### PR #2999 — feat(kit-builder): FT-113 — campo origin no KitState (frontend)

**Branch:** `claude/feat-ft113-kit-origin-field-20261101-2315` | **HEAD:** `9423c224`

**Status:** quality-gate rodando; `mergeable_state: behind` — precisa rebase antes do merge.

### PR #2981 — fix(ux): FT-172/107/108/220 — UX batch7

**Branch:** `claude/fix-ft-ux-batch7-261101-0100` | **HEAD:** `c0ec485d`

**Status:** 29 checks queued; `mergeable_state: behind`. Convertido de DRAFT.

### PR #2979 — fix(kit-builder): separa mensagem de erro 503/504 de 429/timeout

**Branch:** `claude/fix-ft136-provider-error-messages-261101-2234` | **HEAD:** `e6697a92`

**Status:** 28 checks; Supabase Preview=failure (pré-existente: column categories.level); `mergeable_state: behind`. Convertido de DRAFT.

---

## 🐛 NÃO MERGEAR — CONFLITO (1)

### PR #2941 — fix(security): atualiza allowlist lint-0029 ⭐ Conteúdo único

**Branch:** `fix/e2e-url-state-defaults-20261030` | **HEAD:** `3d0bf8c2`

**Status:** `mergeable: false`, `mergeable_state: "dirty"` — conflito após merge de #2927.

- Toca os mesmos arquivos core de #2927 (`useListUrlState.ts`, allowlist, `check-dependency-audit.mjs`)
- Conteúdo único: remoção de `mcp_kv_get` da allowlist (migration aplicada)
- CI head `3d0bf8c2`: 4 checks — Supabase Preview=failure(pré-existente), Vercel=success

**Ação necessária pelo autor:** rebase da branch em `main` atualizado.

---

## 🚫 NÃO MERGEAR — DIFF VAZIO (1)

### PR #2996 — fix(ts): corrige precedência de await...as em useRuptureAlerts

**Branch:** `fix/ts-await-as-precedence-rupture-alerts` | **HEAD:** `c83eb9a6`

**Status:** 0 `changed_files` — fix já está em main. PR pode ser fechada pelo autor.

---

## 🚫 FECHADA SEM MERGE (1)

### PR #3005 — docs(analise): §3 AGUARDANDO APROVAÇÃO + §12 inventário + §13 status

**Branch:** `claude/chore-analise-evidencia-261101-2330` | **HEAD:** `717316c1`

**Fechada em:** 2026-11-01T23:21:57Z pelo owner (adm01-debug), sem merge. Docs-only.

---

## 🚫 NÃO MERGEADAS (DRAFT) — 30 PRs

Todas marcadas como Draft pelo autor. Listadas para completude:

| # | Título | Branch |
|---|---|---|
| #3009 | fix(e2e): corrige E108 em rotas satélite + auth setup explícito | `claude/fix-swatch-qv-e108-20261101-2315` |
| #3006 | docs(pendencias): registra itens 9-16 sessão 2026-11-01 (P35) | `claude/docs-pendencias-p35-20261101-2315` |
| #3004 | docs(analise-prs): rev88 — 79 PRs analisados; 8 merges rev88 | `claude_04/optimistic-bohr-qplx94` |
| #3003 | fix(security): FASE B P06+P15 — security_invoker views + revoke | `claude/fix-p06-p15-security-20261101-1000` |
| #3001 | fix(ci): Gate E40 — +15 versões remote_only ao allowlist | `claude/fix-gate-e40-allowlist-261101-2310` |
| #2998 | fix(hooks): corrige TS2339 em useRuptureAlerts.ts | `claude/fix-ts-unused-rupture-20261101-2300` |
| #2986 | chore(admin): remove referências stale do external-db-bridge (FT-243) | `claude/fix-ft243-stale-bridge-refs-261101-2355` |
| #2985 | fix(e2e): remove rotas públicas mortas colecao/comparar/lista-publica | `claude/fix-dead-public-links-261101-2100` |
| #2982 | fix(mockup): aviso de prévia indicativa no resultado (FT-174) | `claude/fix-ft174-previa-indicativa-mockup-261101-2350` |
| #2980 | fix(mockup): onLogoRemove aceita areaId e limpa análise da área | `claude/fix-ft167-logo-remove-area-id-261101-2234` |
| #2978 | fix(kit-builder): guarda prefers-reduced-motion antes do confete | `claude/fix-ft139-confetti-reduced-motion-261101-2234` |
| #2976 | fix(ux): FT-174/040/083/093/134/136/139 — UX batch6 | `claude/fix-ft-ux-batch6-261101-2230` |
| #2975 | chore: remove .tmp acidentalmente versionado (FT-061) | `claude/chore-delete-tmp-file-261101-2350` |
| #2974 | fix(bi): seededRandom em generateMockMarketData (FT-033) | `claude/fix-ft033-seeded-random-261101-2310` |
| #2973 | fix(ux): FT-167/306/309 — onLogoRemove, senha min 8, CNPJ copy | `claude/fix-ft-ux-batch5-261101-2222` |
| #2971 | fix(ux): FT-134/FT-136/FT-173 — confirmação IA, erros distintos | `claude/fix-ft-ux-batch4-261101-2215` |
| #2970 | fix(ux): confetti reduced-motion guard + AlertDialog no Limpar | `claude/fix-ux-batch3-261101-0015` |
| #2969 | fix(security): REVOKE EXECUTE FROM PUBLIC em 106 funções trigger | `claude/fix-sec001-revoke-anon-trigger-funcs-261101-2230` |
| #2967 | fix: gate E42 não executa check-min-tests sem credenciais | `claude/fix-gate-e42-261101-2209` |
| #2966 | fix: adiciona 10 entradas de falsos-positivos ao allowlist gitleaks | `claude/fix-gitleaks-allowlist-261101-2209` |
| #2965 | fix(front): FT-040/FT-083/FT-093 — progresso determinístico | `claude/fix-ft-multi-261101-2330` |
| #2963 | fix(selos): remove getMockSupplierTrust dead code (FT-002) | `claude/fix-ft002-mock-dead-code-261101-2320` |
| #2961 | fix(bi): badge 'Dados simulados' nos slides 2-5 do PPTX (FT-004) | `claude/fix-pptx-mock-badges-261101-2315` |
| #2959 | chore(estado): atualiza PROGRESSO e PENDENCIAS 2026-11-01 | `claude/chore-estado-progresso-261101-2230` |
| #2958 | feat(kit-maker): stat e filtro Publicados mapeiam status 'shared' | `claude/fix-kit-maker-publicados-261101-2202` |
| #2956 | docs(analise-prs): branch de trabalho desta sessão | `claude_05/serene-clarke-1o02ey` |
| #2955 | chore(analise): revalidação exaustiva 9 branches TOP + 44 A/B/F | `claude/chore-analise-branches-revalida-261101-2200` |
| #2954 | fix(ci): documenta perf002 em lint-0029 e artefatos de rollback | `claude/fix-ci-workflows-20261101-1200` |
| #2951 | fix: adiciona Rollback: header e arquivo rollback da migration | `claude/fix-stock-notes-rollback-header-261101-2151` |
| #2950 | fix(routes): remove rotas públicas mortas lista/coleção/comparação | `claude/fix-links-publicos-mortos-261101-2156` |
| #2948 | chore(migrations): rollback files para e38/e47/e37 (preflight gate) | `claude/fix-rollback-e38-e47-e37-261101-2200` |

---

## 📊 Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGEADAS (esta sessão) | 3 | #2927, #2949, #2983 |
| MERGEADAS (pelo owner) | 5 | #2940, #2944, #2947, #2952, #2960 |
| AGUARDANDO CI | 3 | #2999, #2981, #2979 |
| NÃO MERGEAR (CONFLITO) | 1 | #2941 |
| NÃO MERGEAR (DIFF VAZIO) | 1 | #2996 |
| FECHADA SEM MERGE | 1 | #3005 |
| NÃO MERGEAR (DRAFT) | 30 | #2948–#3009 (exceto listados acima) |
| BRANCH TRABALHO | 1 | #2956 |
| **TOTAL** | **45** | — |

---

## 📁 Clusters

### Cluster A — URL State / Security Allowlist (sobreposição)
- PR #2927 ✅ **MERGEADA** (useListUrlState POP fix + check-dep-audit + allowlist)
- PR #2941 🐛 **CONFLITO** (mesmos arquivos + remoção `mcp_kv_get` — autor precisa rebase)

### Cluster B — Rollback files
- PR #2947 ✅ **MERGEADA** (pelo owner) — kill_switch_hits rollback
- PR #2948 DRAFT — e38/e47/e37 rollbacks
- PR #2951 DRAFT — stock-notes rollback

### Cluster C — UX Batches
- #2965, #2970, #2971, #2973, #2976, #2978, #2980, #2982 DRAFT
- #2979, #2981 ⏳ AGUARDANDO CI (convertidos de DRAFT)

### Cluster D — CI/Gates
- #2952 ✅ **MERGEADA** (pelo owner) — Gate 1.13 partition tolerance
- #2967 DRAFT — Gate E42

### Cluster E — Documentação
- #2949 ✅ MERGEADA
- #2983 ✅ MERGEADA
- #2955, #2959 DRAFT

---

## 🔍 Baseline main

**SHA fixado:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`
**SHA atual:** `10d1a49935e4d07fb14087c9e3c46435f3ea82df`

| Check | Resultado | Evidência |
|---|---|---|
| `npm run build` | ✅ `built in 16.22s` | sem erros de build |
| `vitest run` | ⚠️ 3 arquivos falhando | 26042 passaram — **pré-existentes** |
| ESLint | ⚠️ crash OOM | SIGABRT no container — pré-existente |

---

## Verificações de banco

```sql
SELECT proname, prosecdef FROM pg_proc
WHERE proname IN ('is_supervisor_or_above', 'log_rls_denial') AND prosecdef = true;
-- Resultado: [] (0 linhas)
```

`is_supervisor_or_above` e `log_rls_denial` não existem como SECURITY DEFINER. Remoção correta.

---

## 📁 Arquivos entregues

| Arquivo | Conteúdo |
|---|---|
| `analise-prs/prs.json` | Inventário JSON de todas as 45 PRs com vereditos |
| `analise-prs/RELATORIO_PRS.md` | Este relatório (v5) |
| `analise-prs/progresso.json` | Estado da análise |
| `analise-prs/dossies/PR-2927.md` | Dossie detalhado — MERGEADA |
| `analise-prs/dossies/PR-2940.md` | Dossie detalhado — MERGEADA (pelo owner, com bug) |
| `analise-prs/dossies/PR-2941.md` | Dossie detalhado — NÃO MERGEAR (CONFLITO) |
| `analise-prs/dossies/PR-2944.md` | Dossie detalhado — MERGEADA (pelo owner) |
| `analise-prs/dossies/PR-2947.md` | Dossie detalhado — MERGEADA (pelo owner) |
| `analise-prs/dossies/PR-2952.md` | Dossie detalhado — DECISÃO HUMANA → MERGEADA |
| `analise-prs/dossies/PR-2960.md` | Dossie detalhado — MERGEADA (pelo owner) |
| `analise-prs/dossies/PR-2983.md` | Dossie detalhado — MERGEADA |
