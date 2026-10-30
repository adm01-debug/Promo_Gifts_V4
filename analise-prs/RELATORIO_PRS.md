# Relatório de Análise de PRs — 2026-10-30

**Sessão:** `session_01RfQzo8Ean3zudG2sEN79b6`  
**Data:** 2026-10-30  
**Main HEAD início:** `8c298d4f00b11a7ff0ecbe454e8ef328f28ee709`  
**Main HEAD atual:** `126062c1b919c1e84b70cacf96ab3fdda7494211` (após merge de #2826)  
**Total PRs abertas analisadas:** 17  
**Total mergeadas neste ciclo:** 1 (#2826) + 1 sessão anterior (#2832) = 2

---

## Resumo por veredito

| Veredito | PRs | Count |
|---|---|---|
| MERGEADA | #2826 | 1 |
| AGUARDANDO_CI | #2813 | 1 |
| CI_FALHOU | #2739, #2810, #2822, #2825 | 4 |
| DECISAO_HUMANA | #2701, #2731, #2821, #2823, #2824 | 5 |
| NAO_MERGEAR | #2744, #2758, #2827 | 3 |
| DRAFT_SUPERSEDED | #2831 | 1 |
| DRAFT | #2833 | 1 |
| AGUARDANDO_BOT | #2799 | 1 |

---

## PRs Mergeadas

### #2826 — fix(sync): sentinel e2e pdf — graphify SKILL.md + migration-refs-baseline
- **HEAD SHA:** `e49436ffb3e9e4ffd46df477bf170ea2817c16c7`
- **Merge SHA:** `126062c1b919c1e84b70cacf96ab3fdda7494211`
- **Gate Final:** SUCCESS (run 41070816677)
- **Arquivos:** `.claude/skills/graphify/SKILL.md`, `.migration-refs-baseline.json`, `docs/graphify/`, `graphify-out/`, `package.json`, `scripts/graphify/`, `analise-prs/`
- **Nota:** Dossier anterior incorreto — afirmava REGRA #8 por `branch-protection-sentinel.yml` inexistente no diff. Grep confirmou zero workflow files.

---

## PRs Aguardando CI

### #2813 — refactor(quotes): E128 — split QuoteBuilderSummaryColumn 1697→588 linhas
- **HEAD SHA:** `f3c166082e5a8b0264453d3347f24a13ed9238ea` (7ª push — "chore: bump generatedAt (2)")
- **Deploy Gates run:** 41097770679 (queued 2026-10-30T17:19Z)
- **Histórico:** 6 runs anteriores cancelados por `cancel-in-progress: true` (múltiplas pushes de CI bump)
- **Arquivos:** todos em `src/components/quotes/` + visual baselines JSON — zero REGRA #8
- **Ação pendente:** Aguardar Gate Final. Se SUCCESS → mergear squash.

---

## PRs com CI Falhou

### #2739 — fix(mockup): gerador — medidas, timeout 30s, lote parcial, erros
- **Branch:** `integra/vps-mockup-gerador` (agente diferente — não criada nesta sessão)
- **Falha:** Gate 1.9 file-size ratchet — `src/hooks/mockup/useMockupGenerator.ts` 894L vs baseline 893L (cresceu 1 linha)
- **Ação:** Correção exige dono da branch. NÃO interferir.

### #2810 — fix(gallery): baseline JSONs + gallery files
- **Falha:** Gate 1.9 file-size ratchet — arquivo de baseline excede limite definido
- **Ação:** Correção exige ajuste no arquivo de baseline por quem abriu a PR.

### #2822 — fix(types): idempotency_key + migration-refs-baseline
- **Falha:** Gate 1.3 migration contracts baseline outdated
- **Arquivos:** `.migration-refs-baseline.json` (+140/-120) + `src/integrations/supabase/types.ts` (+3: `idempotency_key: string | null`)
- **Ação:** Regenerar baseline ou atualizar migration-refs.

### #2825 — fix(sync): graphify version + sentinel sync
- **Falha:** Gate 1.3 baseline outdated + conflito em `analise-prs/prs.json`
- **Nota:** Toca `.github/SENTINEL_CHANGELOG.md` e `.github/SENTINEL_SHA_ALLOWLIST.txt` — NÃO são workflow files (REGRA #8 não se aplica)
- **Ação:** Rebase + regenerar baseline.

---

## PRs com Decisão Humana (REGRA #8)

### #2701 — fix(ci): autentica kit coverage
- `.github/workflows/kit-coverage-integration.yml` — REGRA #8

### #2731 — feat: supabase migrations + workflow updates
- `.github/workflows/deploy-gates.yml` + `supabase/migrations/` — REGRA #8

### #2821 — feat(uptime): uptime-monitor + probe script + tests
- `.github/workflows/uptime-monitor.yml` — REGRA #8

### #2823 — feat(rls): supplier stricker RLS deny-all + xbz image uploader
- `supabase/migrations/` (4 arquivos SQL) — REGRA #8

### #2824 — feat(ci): replenishment quality workflow
- `.github/workflows/replenishment-quality.yml` — REGRA #8

---

## PRs Não Mergear (instrução explícita)

### #2744 — feat: edge functions + [NÃO MESCLAR]
- Draft + "[NÃO MESCLAR]" no título + `supabase/functions/` (REGRA #8 corolário)

### #2758 — fix: revisão humana necessária
- Body: "revisão humana". Diff vazio (conteúdo já em main).

### #2827 — docs(ci): PENDENCIAS.md + RELATORIO_CI.md — codex branch
- Body: "Não mesclar nesta etapa". Branch `codex/` (agente diferente — REGRA #10).

---

## PRs Draft/Superseded

### #2831 — DRAFT_SUPERSEDED
- 27 conflitos. Supersedida por #2832 (mergeada). Docs-only.

### #2833 — DRAFT
- 3 conflitos em `RELATORIO_PRS.md`, `prs.csv`, `prs.json`. Docs-only. Aguarda rebase pelo PO.

---

## PR de Bot

### #2799 — chore(release): release-please
- PR de release-please bot. Gate Final não dispara automaticamente. Aguarda ciclo do bot.

---

## Metodologia

- **Merge test:** `git merge --no-commit --no-ff FETCH_HEAD` contra main HEAD `8c298d4f0` para 17 PRs
- **File list:** `list_pr_files` + grep para confirmar REGRA #8 em cada PR suspeita
- **CI check:** `list_check_runs` para Gate Final em cada HEAD SHA
- **Evidência:** arquivo:linha, SHA, run_id ou saída de comando para cada afirmação

---

_Gerado em 2026-10-30 por sessão `session_01RfQzo8Ean3zudG2sEN79b6`_
