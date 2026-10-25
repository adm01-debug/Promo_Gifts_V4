# BASELINE do main (régua de regressão)

Medida em 2026-10-25 · main `0773535`. **Medição local NÃO realizada** (ver PEND-B01: `npm ci` E403 em `pngjs`, `package-lock.json:13781`). A baseline abaixo vem dos logs do CI autoritativo (Deploy Gates / Gate Final) e de `analise-prs/baseline/state.md` (sessão anterior, mesmo método). Regressão = diferença contra esta tabela.

## Gate Final (Deploy Gates)
| Item | Resultado | Evidência |
|---|---|---|
| Deploy Gates mais recente concluído no main | success (SHA `59a7a607`) | run 40222902668 (`estado/backlog/ci.md` §1) |
| Gate Final de referência com detalhe de jobs | success (SHA `c113300c`), 17 jobs, 42 sub-steps do Gate 1 | run 40218104943 (`analise-prs/baseline/state.md`) |
| Typecheck (`npm run typecheck`, job `static-gates`) | 0 erros | step success, job 121244048940 |
| Lint (`npm run lint:baseline`) | 0 erros (ratchet de baseline) | mesmo job |
| Testes (`test:deploy-gate` + `test:webhook-scenario-matrix`) | 429 passam, **0 falham por nome** | job 121244048957 (334 + 95) |
| Build (`npm run build`, Gate 6) | success, SBOM + attestation | job 121245372874 |

Limite: o Gate 2 roda 4 arquivos de teste (429 asserts), não a suíte `vitest` completa de `tests/`. A suíte completa nunca foi medida nesta sessão: NÃO VERIFICADO.

## Workflows vermelhos persistentes no main (estado de partida)
E2E Critical Flows (CI-002), Cart Invariants (CI-003), Personalization (CI-004), Swatch/Thumb/Cart Delete/Playwright (CI-005, `cancelled`), CI Security & Drift (CI-006), Copilot Code Review (CI-007, não required), edge-functions-drift-check (SB-019). Detalhe e run IDs: `docs/estado/backlog/ci.md` e `supabase.md`.

## Produção Supabase `doufsxqlfjyuvxuezpln` (leitura, 2026-10-25)
`schema_migrations` = 2549 linhas, `max(version)=20261025002500`; 398 tabelas em `public`; 109 edges = 109 no repo (nomes; conteúdo não confere, SB-019); 142 crons (135 ativos). Fonte: `backlog/banco.md`, `backlog/supabase.md`.
