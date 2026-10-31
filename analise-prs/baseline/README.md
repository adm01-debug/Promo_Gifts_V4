# Baseline do main — sessão de análise de PRs

**SHA de início de sessão:** `9541666bf62883b06117b03cae0368b2c7d55314`  
**Data:** 2026-10-30  
**SHA pós-merges desta sessão (5 PRs):** `22e8ddad0cc41a1bab002ac077ca31558c149dda`

## TypeCheck

Arquivo: `typecheck.txt`

Resultado no SHA `9541666bf` (via Gate 1 CI run #41070173501 pré-sessão):
- TypeScript: **0 erros** — Gate 1 conclusion: success

Resultado local no HEAD atual (pós-5-merges, `7ccdb392b` branch / main `22e8ddad`):
- `npx tsc --noEmit` exit 0 — 0 erros (confirmado em transcript 2026-10-31)

## Lint

Arquivo: `lint.txt` (gerado em background por `npm run lint:baseline`)

Baseline registrado nos arquivos de ratchet commitados:
- `.eslint-disable-baseline.json` — baseline de disable comments
- `.as-assertions-baseline.json` — baseline de asserções `as`
- Resultado do CI Gate 1 no SHA de início: **0 regressões de lint** (conclusion: success)

## Testes unitários

Arquivo: `vitest.txt` (gerado via `NODE_OPTIONS=--max-old-space-size=4096 npx vitest run`)

Baseline do Gate 2 no SHA `9541666bf`:
- Gate 2 — Unit Tests: **success** (run #41070173501)
- Pós-merge #2810 (SHA `554ef41b`): `npx vitest run` local exit 0, promoflix 22/22 passed

Gate 2 no PR #2853 (último merge, SHA `2ee4e3a3`):
- Step "Run npm run test:ci-core": **success** (job #124423194076 completado 03:10:18Z)

## Build

Gate 6 no SHA `9541666bf`:
- Build: **success** (run #41070173501)

Gate 6 no PR #2853 (run #41161750548 job #124427491420):
- `npm run build`: **success** (03:30:35Z)

## Falhas pré-existentes (não introduzidas por nenhuma PR desta sessão)

| Check | Nome | Motivo |
|---|---|---|
| E2E Full User Flows | P18 | Autenticação real — sem credenciais no runner |
| E2E Personalization Journey | P18 | Autenticação real |
| chromium/firefox/webkit • swatch→QV | P18 | E2E autenticado |
| CI Security Drift Checks | P19/P39/P50 | Dependabot scan — pre-existente |

Fonte: `analise-prs/RELATORIO_CI.md` §3.1 (documentado no início da sessão).

## Verificação de worktrees

Worktrees usados nesta sessão: 1 temporário em `/tmp/promo-gifts-worktree-NNNN` para merge-tests locais.  
Remoção confirmada: `git worktree list` retorna só o diretório principal (transcript 2026-10-31).
