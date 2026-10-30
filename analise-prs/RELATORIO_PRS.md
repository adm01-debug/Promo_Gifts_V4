# RELATORIO_PRS — Análise Exaustiva de PRs (Sessão 2026-10-30)

**Gerado em:** 2026-10-30T19:52Z (atualizado)
**Sessão:** https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6
**Main HEAD (início):** `3bfc9dc5`
**Main HEAD (final):** `9541666bf62883b06117b03cae0368b2c7d55314`
**Gate Final em main:** ✅ verde — PR #2843 mergeada com Gate Final verde

---

## Baselines main@9541666bf

| Check | Gate CI | Resultado | Evidência |
|---|---|---|---|
| TypeScript (`tsc --noEmit`) | Gate 1 | ✅ EXIT 0 — sem erros | `analise-prs/baseline/typecheck-output.txt` |
| Build Vite (`npm run build`) | Gate 6 | ✅ EXIT 0 — built in 12.37s | `analise-prs/baseline/build-output.txt` |
| ESLint (`npx eslint src/`) | Gate 1 | ⚠️ SIGABRT no container local; CI Gate 1 verde em main@9541666bf | `analise-prs/baseline/eslint-output.txt` |
| Vitest | Gate 2 | Rodado em sessão anterior | `analise-prs/baseline/vitest-output.txt` |

---

## PRs Abertas — 17 PRs analisadas (2026-10-30T19:52Z)

| PR | Título | Branch | Veredito | Regra |
|---|---|---|---|---|
| #2701 | fix(ci): autentica integração Kit Coverage | `claude/fix-p12-grant-*` | DECISAO_HUMANA | REGRA #8 (workflows) |
| #2731 | fix(db): protege kill_switch_hits | `fix/p200-e049-rate-guard` | DECISAO_HUMANA | REGRA #8 (workflows + migrations) |
| #2739 | fix(mockup): gerador — medidas, timeout 30s | `integra/vps-mockup-*` | CI_FALHOU | Gate Final timeout 30s |
| #2744 | fix(edge): limites Magic Up [NÃO MESCLAR] | `integra/vps-edge-*` | DRAFT + DECISAO_HUMANA | draft: true + REGRA #8 (edge) |
| #2758 | fix(a11y): restaura foco visível | `fix/a11y-focus-visible-ring-*` | DECISAO_HUMANA | body: "sem merge automático" (PO) + 0 changed_files |
| #2799 | chore(main): release 1.4.0 | `release-please--branches--main--*` | DECISAO_HUMANA | bot PR com reviewer explícito adm01-debug |
| #2810 | feat(E128): split SupplierFormDialog | `claude/feat-e128-split-*` | CI_FALHOU | Gate 1.9 ratchet file size |
| #2821 | fix(ci): uptime-monitor schedule | `claude/fix-sync-uptime-*` | DECISAO_HUMANA | REGRA #8 (workflows) |
| #2822 | fix(types): sincroniza types | `claude/fix-sync-types-*` | CI_FALHOU | Gate 1.3 baseline desatualizado |
| #2823 | fix(db): reconcilia migrations | `claude/fix-sync-reconcile-*` | DECISAO_HUMANA | REGRA #8 (migrations) |
| #2824 | fix(e2e): isola servidor Vite CI | `claude/fix-sync-e2e-vite-*` | DECISAO_HUMANA | REGRA #8 (workflows: replenishment-quality.yml verificado) |
| #2825 | fix(graphify): atualiza grafo | `claude/fix-sync-graphify-*` | CI_FALHOU | Gate 1.3 baseline desatualizado |
| #2826 | fix(ci): sentinel SHA allowlist | `claude/fix-sync-sentinel-*` | DECISAO_HUMANA | REGRA #8 (workflows) |
| #2827 | ci(ratchet): evita SIGPIPE | `codex/ci-audit-latest-*` | DECISAO_HUMANA | REGRA #10 (codex branch) |
| #2831 | docs(analise-prs): entregas sessão | `claude/eloquent-ramanujan-0yt2fo` | SESSION_DELIVERY | OPEN/DRAFT/dirty — branch desta sessão |
| #2834 | docs(ci): evidence vitest sample | `claude/fix-relatorio-baseline-*` | DRAFT | draft: true |
| #2836 | fix(plan): separa alegações | `codex/plan-status-*` | DECISAO_HUMANA | REGRA #10 (codex branch) |
| #2839 | fix(ci): endurece gates Supabase | `codex/e23-required-secrets-*` | DECISAO_HUMANA | REGRA #10 + REGRA #8 (workflows) |

---

## PRs Mergeadas (durante/após sessão)

| PR | SHA merge | Título |
|---|---|---|
| #2813 | — | Merged antes do início da análise |
| #2830 | — | docs-only, Gate Final verde |
| #2840 | `6bc42d68` | docs(ci): prova Gate Final P33 |
| #2842 | — | docs(ci): RELATORIO_CI.md completo |
| #2832 | — | chore(analise-prs): entrega sessão 2026-10-30 (SESSION_DELIVERY mergeada) |

---

## Contagem final

| Veredito | Count | PRs |
|---|---|---|
| JÁ_MESCLADA | 4 | 2813, 2830, 2840, 2842 |
| CI_FALHOU | 4 | 2739, 2810, 2822, 2825 |
| DECISAO_HUMANA | 12 | 2701, 2731, 2744, 2758, 2799, 2821, 2823, 2824, 2826, 2827, 2836, 2839 |
| DRAFT | 1 | 2834 |
| SESSION_DELIVERY | 2 | 2831 (open/draft), 2832 (merged) |
| **TOTAL** | **23** | |

---

## Merges desta sessão

**0 merges** — Nenhuma PR elegível para merge automático.

Todas as 17 PRs abertas têm bloqueio:
- **12 DECISAO_HUMANA**: REGRA #8 (workflows/migrations/edge/body-instrução) ou REGRA #10 (codex/)
- **4 CI_FALHOU**: Gate Final ou Gate 1.3/1.9 vermelhos
- **1 DRAFT**: `draft: true`

---

## Evidências por PR (resumo)

### #2701 — DECISAO_HUMANA
- Toca `.github/workflows/` (REGRA #8)
- Dossie: `analise-prs/dossies/PR-2701.md`

### #2731 — DECISAO_HUMANA
- Toca `.github/workflows/deploy-gates.yml` + `supabase/migrations/` (REGRA #8 duplo)
- Evidência: `list_pr_files` via FOREVER MCP retornou deploy-gates.yml e migration SQL
- Dossie: `analise-prs/dossies/PR-2731.md`

### #2739 — CI_FALHOU
- Gate Final timeout: mockup generator > 30s
- Dossie: `analise-prs/dossies/PR-2739.md`

### #2744 — DRAFT + DECISAO_HUMANA
- `draft: true` + título "[NÃO MESCLAR sem OK do dono]" + toca edge functions (REGRA #8)
- Dossie: `analise-prs/dossies/PR-2744.md`

### #2758 — DECISAO_HUMANA
- body: "sem merge automático nem deploy de produção nesta execução" = instrução PO
- `changed_files: 0` — diff vazio por API (`list_pr_files` retornou `[]`)
- `mergeable_state: behind`
- Dossie: `analise-prs/dossies/PR-2758.md`

### #2799 — DECISAO_HUMANA
- Bot PR (release-please), `requested_reviewers: [adm01-debug]` = PO designado explicitamente
- `mergeable_state: behind`
- Arquivos: `.release-please-manifest.json`, `CHANGELOG.md`, `package.json`, `package-lock.json` (sem workflows/migrations)
- Dossie: `analise-prs/dossies/PR-2799.md`

### #2810 — CI_FALHOU
- Gate 1.9 ratchet: file size de `SupplierFormDialog.tsx` excede baseline
- Dossie: `analise-prs/dossies/PR-2810.md`

### #2821 — DECISAO_HUMANA
- Toca `.github/workflows/uptime-monitor.yml` (REGRA #8)
- Dossie: `analise-prs/dossies/PR-2821.md`

### #2822 — CI_FALHOU
- Gate 1.3 baseline `check-migration-path-references` desatualizado após merges recentes
- Dossie: `analise-prs/dossies/PR-2822.md`

### #2823 — DECISAO_HUMANA
- Toca `supabase/migrations/` (REGRA #8)
- Dossie: `analise-prs/dossies/PR-2823.md`

### #2824 — DECISAO_HUMANA
- Toca `.github/workflows/replenishment-quality.yml` (REGRA #8)
- Evidência: `list_pr_files` via FOREVER MCP confirmou `replenishment-quality.yml`
- Dossie: `analise-prs/dossies/PR-2824.md`

### #2825 — CI_FALHOU
- Gate 1.3 baseline desatualizado pós-merge de atualizações recentes
- Dossie: `analise-prs/dossies/PR-2825.md`

### #2826 — DECISAO_HUMANA
- Toca `.github/workflows/` (REGRA #8)
- Dossie: `analise-prs/dossies/PR-2826.md`

### #2827 — DECISAO_HUMANA
- Branch `codex/` = outro agente (REGRA #10)
- Dossie: `analise-prs/dossies/PR-2827.md`

### #2831 — SESSION_DELIVERY
- Branch desta sessão (`claude/eloquent-ramanujan-0yt2fo`)
- OPEN/DRAFT/`mergeable_state: dirty` — não mergeável
- Dossie: `analise-prs/dossies/PR-2831.md`

### #2834 — DRAFT
- `draft: true`, sessão anterior
- Dossie: `analise-prs/dossies/PR-2834.md`

### #2836 — DECISAO_HUMANA
- Branch `codex/` = outro agente (REGRA #10)
- Dossie: `analise-prs/dossies/PR-2836.md`

### #2839 — DECISAO_HUMANA
- Branch `codex/` (REGRA #10) + toca `.github/workflows/` (REGRA #8) — duplo bloqueio
- Dossie: `analise-prs/dossies/PR-2839.md`

---

## Artefatos entregues

| Artefato | Caminho |
|---|---|
| Este relatório | `analise-prs/RELATORIO_PRS.md` |
| Progresso/estado | `analise-prs/progresso.json` |
| Lista JSON | `analise-prs/prs.json` |
| Lista CSV | `analise-prs/prs.csv` |
| Regras de negócio | `analise-prs/regras-de-negocio.md` |
| Baseline typecheck | `analise-prs/baseline/typecheck-output.txt` |
| Baseline build | `analise-prs/baseline/build-output.txt` |
| Baseline eslint | `analise-prs/baseline/eslint-output.txt` |
| Baseline vitest | `analise-prs/baseline/vitest-output.txt` |
| Dossiês (23) | `analise-prs/dossies/PR-{2701..2842}.md` |
