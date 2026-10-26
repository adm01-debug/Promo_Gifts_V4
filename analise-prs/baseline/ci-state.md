# CI State — baseline rev24

## SHA do main atual

```
2ca5ef04e6e0968dace09ffcbd70710aad166ba0
```

Fonte: commit direto por session_01Knr9enFAok62bHihBK1UUP (2026-10-26T20:29-0300).  
SHA anterior: `145da71bb8c451eebadc75c4bb059397f8d468f7` (merge PR #2585).

## Baseline de testes (Gate Final run #40223579961)

- SHA baseline: `7d3bd4ba47eb6e9e6b3d56fe3bfac45a791de84f`
- Gate Final run: #40223579961 — **success**
- Testes: 429 / 0 falhas
- Fonte: `progresso.json` field `baseline.gate_final_run`

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

## Falhas pré-existentes em main

### E2E "Header sticky regression"

**Run:** #40408046337 (`E2E (Playwright)`)  
**Status:** completed / failure  
**Branch:** main  
**SHA:** `145da71bb8c451eebadc75c4bb059397f8d468f7`  
**Spec:** `e2e/flows/22-header-sticky.spec.ts`  
**Pré-existente:** sim — nenhuma PR mergeada por esta sessão tocou `MainLayout.tsx` ou o spec.

### Gate Final queued (infra)

Todos os runs de `deploy-gates.yml` em main ainda em `queued` (infra issue GitHub Actions). Causa confirmada documentada em rev23.

## Commit direto em main durante esta sessão

```
SHA: 2ca5ef04e6e0968dace09ffcbd70710aad166ba0
Autor: adm01-debug (session_01Knr9enFAok62bHihBK1UUP)
Data: 2026-10-26T20:29:13-0300
Arquivos: .github/workflows/ratchet-weekly.yml, package-lock.json, package.json,
          src/components/privacy/AnonymizeAccountDialog.tsx
Nota: push direto sem PR — viola REGRA#9
Efeito: PR #2599 fechada; PR #2597 agora CONFLICT
```
