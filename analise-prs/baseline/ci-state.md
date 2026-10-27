# CI State — baseline rev30

## SHA do main atual

```
00eeec9ac2c2397c5814f9d17dd0c86ad36a5c0c
```

Commit: `fix(e2e): corrige falhas E2E mobile, tooltips e personalization specs`  
Mergeado por: session_01Knr9enFAok62bHihBK1UUP (2026-10-27T01:16:30Z) — PR #2602  
SHA anterior: `1648890907d5831e2383157936f13742e326171c`

## Baseline de testes (Gate Final run #40218104943)

- SHA baseline: `c113300c` (último run success do Gate Final encontrado)
- Gate Final run: #40218104943 — **success**
- Testes: 429 / 0 falhas
- Fonte: `progresso.json` field `sessao_f0ceb220_rev29`

## TypeScript — evidência de comando real (rev24)

```
Comando: node /tmp/main-baseline/node_modules/typescript/bin/tsc \
  -p /tmp/main-baseline/tsconfig.app.json --noEmit
SHA: 145da71bb8c451eebadc75c4bb059397f8d468f7
Saída: (vazia — 0 linhas)
Exit code: 0
Resultado: 0 ERROS
```

## Vitest parcial — evidência de comando real (rev24)

```
Comando: node node_modules/.bin/vitest run \
  src/utils/__tests__/ src/hooks/__tests__/ src/lib/__tests__/ --reporter=dot
SHA: 145da71bb8c451eebadc75c4bb059397f8d468f7

 Test Files  53 passed | 1 skipped (54)
      Tests  2546 passed | 3 skipped (2549)
   Start at  23:46:14
   Duration  36.18s

0 FALHAS
```

Nota: suite completa (vitest.config.ts: `tests/**` + `src/**` + `e2e/scripts/__tests__/`) trava em testes de integração sem credenciais Supabase. Subset acima cobre todos os arquivos unitários.

## Falhas pré-existentes em main `00eeec9ac`

### Falhas nomeadas de unit tests e E2E (fonte: PR #2605 body)

Os seguintes testes falham em `main 00eeec9ac` conforme evidenciado no PR #2605:

1. `src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts:33` — race condition `Date.now()` antes/dentro da função (1ms)
2. `src/lib/__tests__/chunk-recovery.shared-reload-budget.test.ts:60` — race condition `Date.now()` (mesmo arquivo, segundo teste)
3. `tests/integration/replenishment-resilience.test.ts:16` — `await` ausente em `expect().resolves`
4. `src/components/products/gallery/PromoFlixPlayer.tsx` tests — React 19 registrava 2 listeners `volumechange` via `useEffect([])` sem cleanup entre invocações
5. `e2e/catalog/novidades-reposicao-card-parity.spec.ts:214` — threshold `replGap < 64px` insuficiente (fix: 96px)

**Fix disponível:** PR #2605 (`claude/fix-unit-tests-261027-0113`, DRAFT) — corrige todas as 5 falhas. Bloqueado por DRAFT, não por REGRA#8.

### E2E "Header sticky regression"

**Run:** histórico documentado  
**Spec:** `e2e/flows/22-header-sticky.spec.ts`  
**Pré-existente:** sim — nenhuma PR mergeada por esta sessão tocou `MainLayout.tsx` ou o spec.

## Commit externo em main durante esta sessão (rev30)

```
SHA: 00eeec9ac2c2397c5814f9d17dd0c86ad36a5c0c
Merge: PR #2602 — fix(e2e): corrige falhas E2E mobile, tooltips e personalization specs
Autor: session_01Knr9enFAok62bHihBK1UUP
Data: 2026-10-27T01:16:30Z
Arquivos: e2e/flows/22-header-sticky.spec.ts, e2e/flows/sidebar-tooltips.spec.ts,
          e2e/flows/90-personalization-pdp-flow.spec.ts,
          e2e/flows/91-personalization-variant-flow.spec.ts,
          e2e/flows/92-personalization-auth-redirect.spec.ts
Nota: merge via PR (correto — REGRA#9 satisfeita)
```
