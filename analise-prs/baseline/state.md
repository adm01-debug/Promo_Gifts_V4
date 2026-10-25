# Baseline — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (continuação)
**Data:** 2026-10-25
**main HEAD:** `cb0ccedec41c38fe79cbd2585216e4cbe3155ccd` (PR #2538 mergeada pelo PO — docs RELATORIO_CI)
**Commit anterior:** `4cb4feb431f47573a2d4aee01774a5db24e11810` (PR #2535 — fix teste replay cron)

## Gate Final
- **Run #40214531246** — SHA `4cb4feb4` — conclusion=**success** ✅ (2026-10-25T17:20:35Z)
- **SHA `cb0ccedec4`** — Gate Final: **PENDING** (em progresso, mudança docs-only RELATORIO_CI.md)
  - Branch Protection Sentinel: success ✅ (run #40216887106)
  - Uptime Monitor: failure (run #40217100001 — monitor externo, não gate de qualidade)

## Testes
- **429 testes / 0 falhas** (baseline inalterada — confirmado run #40214531246)

## Ambiente local
- `npm install`: **FALHA 403** — registry `europe-west1-npm.pkg.dev` sem credenciais neste container
- `typecheck / lint / vitest local`: **NÃO EXECUTADO** — npm install impossível
- Baseline de CI usada: Gate Final GitHub Actions (autoritativo)
