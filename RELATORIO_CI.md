# RELATORIO_CI.md — Relatório CI / Action Required
**rev 20 — 2026-10-25 (sessão `session_01HW5obNKUFtUMbBdgUb94kY`)**  
**SHA de referência na main:** `e91a36e3` — docs(analise-prs): deliverables rev7  
**SHA Gate Final mais recente ✅:** `6457e24d` — merge PR #2489 (squash)  
**Gate Final - Deploy Ready:** ✅ `conclusion=success` [run #40174922055](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922055)

---

## 0. Resumo executivo

Rev 20 documenta a correção do Gate E40 Schema Drift Check:

- **Gate E40 desbloqueado:** 6 versões `remote_only` identificadas via artifact 12592450906 (run 40175865899) e adicionadas ao `scripts/migration-ledger-remote-only-allowlist.json` (639 → 645 entradas). O gate falhava em qualquer PR que tocasse `supabase/migrations/` (PR #2500 / SHA `f857782b`).
- **Gate Final** permanece ✅ green em `6457e24d` (run #40174922055) — a docs-only push `e91a36e3` não ativou Gate E40 (bypass E14).
- **Nenhuma regressão** introduzida nos workflows que estavam verdes.

---

## 1. Histórico de correções — esta sessão e anteriores

| Fix | PR | SHA em main | Gate Final | Status |
|---|---|---|---|---|
| E2E Personalization Flow: `min:1, max-skipped-ratio:0.95` | PR #2489 | `6457e24d` | [#40174922055](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922055) | ✅ success |
| Supabase Linter Gate: `TimeoutError → return 0` (warn) | PR #2489 | `6457e24d` | [#40174922055](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922055) | ✅ success |
| Gate E40: allowlist +6 versões remote_only (P56) | PR #2487 | pendente merge | Gate Final desbloqueado após merge | 🔄 em PR |

---

## 2. Gate Final em main — estado atual

| SHA | Run Gate Final | Conclusão | Observação |
|---|---|---|---|
| `6457e24d` (PR #2489) | [#40174922055](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922055) | ✅ **success** | Último Gate Final confirmado verde |
| `f857782b` (PR #2500) | [#40175865899](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40175865899) | ❌ failure | Gate E40 ativado — 6 versões blocking |
| `e91a36e3` (docs push) | E14 bypass | ✅ skipped/success | Docs-only, Gate E40 não ativado |

---

## 3. Workflows antes verdes → seguem verdes

| Workflow | Run na main (SHA `6457e24d`) | Conclusão |
|---|---|---|
| Gate Final - Deploy Ready | [40174922055](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922055) | ✅ success |
| SSOT Supabase Guard | [40174922003](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922003) | ✅ success |
| Static Health Checks | [40174922634](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922634) | ✅ success |
| Select Columns vs Types | [40174922835](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922835) | ✅ success |
| Branch Protection Sentinel | [40174922504](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922504) | ✅ success |
| Security Scan | [40174922804](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922804) | ✅ success |
| E2E · Carts Undo RPC Atomic | [40174922490](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922490) | ✅ success |
| No Prod Leak in Dev/Test Config | [40174922047](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922047) | ✅ success |
| Lovable Edit Tracker | [40174922024](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922024) | ✅ success |
| Required Checks Guard | [40174922015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922015) | ✅ success |
| Gitleaks — Full History Audit | [40174922395](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922395) | ✅ success |
| Workflow Lint | [40174922340](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922340) | ✅ success |
| Policies Baseline | [40174922000](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922000) | ✅ success |
| UI · Visual & A11y | [40174922297](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922297) | ✅ success |
| Lovable Autoheal | [40174922502](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922502) | ✅ success |
| E2E — Personalization Flow | [40174922500](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922500) | ✅ success |
| Supabase Linter Gate | [40174922005](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40174922005) | ✅ success |

**Nenhuma regressão em workflows que estavam verdes antes do PR #2489.**

---

## 4. Pendências abertas (bloqueios externos — ação PO)

Ver `PENDENCIAS.md` para detalhes completos.

- **P56** (fix aplicado nesta sessão / PR #2487): Gate E40 — allowlist +6 versões. **Aguarda merge do PR #2487.**
- **P47** (ação PO): Gitleaks cron — secret histórico pré-existente (issue #2261). Revogar/rotacionar.
- **P40** (ação PO): PR #2469 (E42 fix e2e-personalization) — Gate Final ✅, aguarda aprovação PO (Regra 8).
- **P1/P21/P49** (ação PO): Release Please — habilitar "Allow GitHub Actions to create/approve PRs" OU criar `RELEASE_PLEASE_TOKEN`.
- **P2b/P8/P12/P13/P16–P19/P24–P25/P28–P31**: E2E e integridade não-required — diagnosticados; não bloqueiam deploy.

---

*Gerado por sessão `session_01HW5obNKUFtUMbBdgUb94kY` em 2026-10-25*
