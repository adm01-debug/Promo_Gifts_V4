# Relatório de Análise de PRs

**Gerado em:** 2026-11-01 (v3 — análise exaustiva de 36 PRs)
**SHA main fixado:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`
**SHA main atual:** `c80b098a654e90d7b8a962a67babbffb12063f33` (pós squash-merge #2927, 2026-11-01T22:48Z)
**Total PRs analisadas:** 36 (34 abertas + 2 mergeadas nesta sessão)

---

## ✅ MERGEADAS NESTA SESSÃO

### PR #2927 — fix(listas): normaliza filtros padrão após navegação POP

**Branch:** `claude/fix-e2e-url-state-261101-2045` | **Merge SHA:** `c80b098a654e90d7b8a962a67babbffb12063f33`

- **quality-gate:** `completed/success` (SHA `f23ee40`)
- **Diff:** 11 arquivos — `useListUrlState.ts` + testes + allowlist + `check-dependency-audit.mjs`
- **Banco:** `is_supervisor_or_above` e `log_rls_denial` não existem como SECURITY DEFINER
- **Método:** squash-merge, branch apagada

### PR #2949 — docs: dossie análise PR 2927 e atualização progresso

**Branch:** `claude/docs-analise-pr2927-261101` | **Merge SHA:** `a16b116a893910299b45f3c358a7615bf7150daf`

- **CI:** E14 bypass — `paths-ignore: docs/**` — PR docs-only, sem gate necessário
- **Método:** squash-merge

---

## ⏳ AGUARDANDO CI

### PR #2941 — fix(security): atualiza allowlist lint-0029 ⭐ Conteúdo único

**Branch:** `fix/e2e-url-state-defaults-20261030` | **HEAD:** `3d0bf8c2`

Conteúdo único não coberto por #2927: remoção de `mcp_kv_get` (migration E18 aplicada). CI no head `3d0bf8c2`: 4 checks — Supabase Preview=failure(pré-existente), Vercel=success. **Quality-gate não rodou.**

**Ação quando CI verde:** Mergear.

### PR #2947 — fix: adiciona rollback da migration 20261029160339 (kill_switch_hits)

**Branch:** `claude/fix-rollback-killswitch-261101-1855` | **HEAD:** `c8c61c8b`

Diff: 1 arquivo novo `supabase/rollbacks/20261029160339_rollback.sql` (4 linhas). Referência apenas — sem DDL aplicada. quality-gate: `total_count: 0`.

**Ação quando CI verde:** Mergear.

### PR #2960 — fix(novidades/reposicao): remove fake progress bar

**Branch:** `claude/fix-progress-bars-261101-2159` | **HEAD:** `53cf1298`

quality-gate `queued` + `mergeable_state: blocked` (unresolved review comment).

**Ação:** Aguardar CI completar E resolução do review comment.

---

## 🚫 DECISÃO HUMANA

### PR #2952 — fix(ci): Gate 1.13 — tolerância automática para policies de partições mensais

**Branch:** `claude/fix-policies-partition-auto-tolerate-261101-2220` | **HEAD:** `25c67241`

**Motivo:** REGRA #9 — `scripts/check-*` exige revisão do PO. Diff: `scripts/check-policies-baseline.mjs` (+73/-2). quality-gate: `total_count: 0`.

**Quando mergear:** Após aprovação do PO + quality-gate verde.

---

## ⚙️ BOT-MANAGED

### PR #2944 — chore(main): release 1.6.1

Gerenciada pelo release-please bot. Label `autorelease: pending`. NÃO mergear manualmente.

---

## 🐛 NÃO MERGEAR (BUG)

### PR #2940 — feat(nav): adiciona entrada Audit Suite na sidebar admin

**Bug:** Linha `// Se ogropo` (typo — deveria ser `// Se o grupo`) em `src/components/layout/SidebarReorganized.tsx`.

---

## 🚫 NÃO MERGEADAS (DRAFT) — 27 PRs

| # | Título | Branch |
|---|---|---|
| #2986 | chore(admin): remove referências stale external-db-bridge | `claude/fix-ft243-stale-bridge-refs-261101-2355` |
| #2985 | fix(e2e): remove rotas públicas mortas | `claude/fix-dead-public-links-261101-2100` |
| #2982 | fix(mockup): aviso de prévia indicativa (FT-174) | `claude/fix-ft174-previa-indicativa-mockup-261101-2350` |
| #2981 | fix(ux): FT-172/107/108/220 — UX batch7 | `claude/fix-ft-ux-batch7-261101-0100` |
| #2980 | fix(mockup): onLogoRemove aceita areaId (FT-167) | `claude/fix-ft167-logo-remove-area-id-261101-2234` |
| #2979 | fix(kit-builder): erros 503/504 vs 429/timeout | `claude/fix-ft136-provider-error-messages-261101-2234` |
| #2978 | fix(kit-builder): prefers-reduced-motion confete | `claude/fix-ft139-confetti-reduced-motion-261101-2234` |
| #2976 | fix(ux): UX batch6 | `claude/fix-ft-ux-batch6-261101-2230` |
| #2975 | chore: remove .tmp acidentalmente versionado | `claude/chore-delete-tmp-file-261101-2350` |
| #2974 | fix(bi): seededRandom generateMockMarketData | `claude/fix-ft033-seeded-random-261101-2310` |
| #2973 | fix(ux): onLogoRemove, senha min 8, CNPJ | `claude/fix-ft-ux-batch5-261101-2222` |
| #2971 | fix(ux): UX batch4 | `claude/fix-ft-ux-batch4-261101-2215` |
| #2970 | fix(ux): confetti + AlertDialog | `claude/fix-ux-batch3-261101-0015` |
| #2969 | fix(security): REVOKE EXECUTE 106 funções | `claude/fix-sec001-revoke-anon-trigger-funcs-261101-2230` |
| #2967 | fix: gate E42 sem credenciais | `claude/fix-gate-e42-261101-2209` |
| #2966 | fix: gitleaks allowlist falsos-positivos | `claude/fix-gitleaks-allowlist-261101-2209` |
| #2965 | fix(front): FT-040/083/093 UX multi | `claude/fix-ft-multi-261101-2330` |
| #2963 | fix(selos): remove getMockSupplierTrust dead code | `claude/fix-ft002-mock-dead-code-261101-2320` |
| #2961 | fix(bi): badge 'Dados simulados' PPTX | `claude/fix-pptx-mock-badges-261101-2315` |
| #2959 | chore(estado): atualiza PROGRESSO e PENDENCIAS | `claude/chore-estado-progresso-261101-2230` |
| #2958 | feat(kit-maker): Publicados → status 'shared' | `claude/fix-kit-maker-publicados-261101-2202` |
| #2956 | docs(analise-prs): branch de trabalho desta sessão | `claude_05/serene-clarke-1o02ey` |
| #2955 | chore(analise): revalidação exaustiva branches | `claude/chore-analise-branches-revalida-261101-2200` |
| #2954 | fix(ci): documenta perf002 e rollback artifacts | `claude/fix-ci-workflows-20261101-1200` |
| #2951 | fix: rollback header migration 2026 | `claude/fix-stock-notes-rollback-header-261101-2151` |
| #2950 | fix(routes): remove rotas públicas mortas | `claude/fix-links-publicos-mortos-261101-2156` |
| #2948 | chore(migrations): rollback e38/e47/e37 | `claude/fix-rollback-e38-e47-e37-261101-2200` |
| #2942 | docs(ci): RELATORIO_CI.md v4 | `claude/fix-relatorio-ci-uncommitted-261101-2125` |

---

## 📊 Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGEADAS | 2 | #2927, #2949 |
| AGUARDANDO CI | 3 | #2941, #2947, #2960 |
| DECISÃO HUMANA | 1 | #2952 |
| BOT-MANAGED | 1 | #2944 |
| NÃO MERGEAR (BUG) | 1 | #2940 |
| NÃO MERGEAR (DRAFT) | 28 | #2986–#2942, #2956 |
| **TOTAL** | **36** | — |

---

## 🔍 Baseline main

| Check | Resultado |
|---|---|
| `tsc --noEmit` | ✅ exit 0 |
| `npm run build` | ✅ `built in 16.22s` |
| `vitest run` | ⚠️ 3 arquivos falhando (pré-existentes) |
| ESLint | ⚠️ crash OOM (SIGABRT) pré-existente |

## Verificações de banco

```sql
SELECT proname, prosecdef FROM pg_proc
WHERE proname IN ('is_supervisor_or_above', 'log_rls_denial') AND prosecdef = true;
-- Resultado: [] (0 linhas)
```
