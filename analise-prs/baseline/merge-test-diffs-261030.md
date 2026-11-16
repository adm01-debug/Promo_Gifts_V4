# Merge Test Diffs — Sessão 2026-10-30

**Data:** 2026-10-30T16:48Z  
**Main HEAD:** `8c298d4f00b11a7ff0ecbe454e8ef328f28ee709`  
**Método:** `git fetch origin refs/pull/NNN/head && git merge --no-commit --no-ff FETCH_HEAD`  
**17 PRs testadas**

---

## Resultados

| PR | HEAD SHA | Resultado | Detalhes |
|---|---|---|---|
| #2701 | `c5e6937b` | CONFLICT(1) | `PENDENCIAS.md` |
| #2731 | `6db2040f` | CONFLICT(1) | `PENDENCIAS.md` |
| #2739 | `b19c6099` | CLEAN | 32 files, +3375/-1142 |
| #2744 | `2f379368` | CLEAN | 21 files, +1926/-24 |
| #2758 | `6a000b4e` | CLEAN | 0 diff (conteúdo já em main ou idêntico) |
| #2799 | `12cdb57c` | CLEAN | 4 files, +18/-4 |
| #2810 | `d4c9f8be` | CLEAN | 5 files, +674/-1152 |
| #2813 | `542ee7f4` | CLEAN | 11 files, +1538/-1378 |
| #2821 | `f6ea303c` | CLEAN | 4 files, +482/-49 |
| #2822 | `5c813a8e` | CLEAN | 2 files, +143/-120 |
| #2823 | `39cc57b5` | CLEAN | 13 files, +858/-168 |
| #2824 | `85311e8b` | CLEAN | 9 files, +784/-92 |
| #2825 | `ac83cc97` | CONFLICT(1) | `analise-prs/prs.json` |
| #2826 | `e49436ff` | CLEAN | 6 files, +560/-3 |
| #2827 | `7c439970` | CLEAN | 7 files, +289/-2 |
| #2831 | `e8554129` | CONFLICT(27) | `.migration-refs-baseline.json`, `analise-prs/RELATORIO_PRS.md`, `analise-prs/baseline/README.md`, `analise-prs/baseline/build.txt`, `analise-prs/dossies/PR-*.md` (27 total) |
| #2833 | `86b7739d` | CONFLICT(3) | `analise-prs/RELATORIO_PRS.md`, `analise-prs/prs.csv`, `analise-prs/prs.json` |

---

## Veredito por conflito

### #2701 — CONFLICT: `PENDENCIAS.md`
Conflito em arquivo de documentação, não em código. Branch `fix/ci-autentica-kit-coverage` tem atualizações a `PENDENCIAS.md` que divergem de main (onde foi atualizado por sessões posteriores). Não bloqueante para funcionalidade, mas exige rebase manual antes do merge. Combinado com REGRA #8 (toca `.github/workflows/`), mantém veredito DECISAO_HUMANA.

### #2731 — CONFLICT: `PENDENCIAS.md`
Mesmo padrão — PENDENCIAS.md divergiu. Branch também toca `.github/workflows/` + `supabase/migrations/`. Veredito DECISAO_HUMANA mantido.

### #2825 — CONFLICT: `analise-prs/prs.json`
Branch `claude/fix-sync-graphify-version-261030-1430` diverge em `prs.json` (atualizado por commits posteriores em main). Também tem CI_FALHOU (Gate 1.3 — baseline outdated). Veredito CI_FALHOU mantido.

### #2831 — CONFLICT: 27 arquivos
Branch supersedida por #2832 (já mergeada). 27 conflitos confirmam que está completamente desatualizada. Veredito DRAFT/SUPERSEDED mantido.

### #2833 — CONFLICT: 3 arquivos
Branch de docs com `RELATORIO_PRS.md`, `prs.csv`, `prs.json` em conflito (atualizados por #2832). Veredito DRAFT mantido — aguarda conversão e rebase pelo PO.

---

## PRs com merge limpo (12 de 17)

Todas as 12 PRs abaixo têm merge sem conflito com main HEAD `8c298d4f0`:

- **#2739**: Merge limpo — conflito anterior (`.migration-refs-baseline.json`) resolvido por rebase da branch. Agora apenas bloqueado por REGRA #8 (sem referência a workflows ou migrations no diffs confirmado — **rever veredito**).
- **#2744**: Merge limpo — bloqueado por DRAFT + "[NÃO MESCLAR]" + edge function (REGRA #8).
- **#2758**: Merge limpo — bloqueado por instrução explícita de revisão humana no body.
- **#2799**: Merge limpo — bloqueado por ser PR de bot (release-please); Gate Final não dispara automaticamente.
- **#2810**: Merge limpo — bloqueado por CI_FALHOU (Gate 1.9 file size).
- **#2813**: Merge limpo — aguardando Gate Final (run 41089835608, in_progress 16:48Z).
- **#2821**: Merge limpo — bloqueado por REGRA #8 (`.github/workflows/uptime-monitor.yml`).
- **#2822**: Merge limpo — bloqueado por CI_FALHOU (Gate 1.3 baseline).
- **#2823**: Merge limpo — bloqueado por REGRA #8 (`supabase/migrations/`).
- **#2824**: Merge limpo — bloqueado por REGRA #8 (`.github/workflows/replenishment-quality.yml`).
- **#2826**: Merge limpo — bloqueado por REGRA #8 (`.github/workflows/branch-protection-sentinel.yml`).
- **#2827**: Merge limpo — bloqueado por body "Não mesclar nesta etapa" + branch codex/ (REGRA #10).
