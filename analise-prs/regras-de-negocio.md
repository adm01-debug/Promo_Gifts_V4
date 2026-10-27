# Regras de Negócio — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (rev31)
**Data:** 2026-10-27
**main HEAD:** `06fe47fd3a992bf2a39ab356c9d8c357c5f2a27e` (fix(e2e): corrige falhas de E2E em mock auth — push direto session_01Knr9enFAok62bHihBK1UUP)

## 1. SSOT do Supabase (REGRA #1)
- Projeto canônico: `doufsxqlfjyuvxuezpln` (Gold/Medallion)
- `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts` NUNCA muda
- Projeto proibido: `pqpdolkaeqlyzpdpbizo` (SINGU — READ-ONLY)
- Qualquer PR que escreva em SINGU → não mergeada

## 2. Campos críticos do tipo Product (REGRA #2)
Tipo `Product` DEVE conter: `price`, `sale_price?`, `shortDescription`, `category_id?`, `category_name?`

## 3. Critérios de merge autônomo (8 critérios)
PR passa todos os 8 critérios para merge autônomo:
1. **Válida** — branch com ancestral comum em main, não órfã
2. **Não implementada** — conteúdo não já em main (git cherry > 0 unique commits)
3. **Sem conflito** — git merge-tree CLEAN (sem "changed in both")
4. **Zero erro novo** — Gate Final CI success no HEAD da PR
5. **Zero código revertido** — não desfaz melhorias já em main
6. **Regra de negócio válida** — não viola REGRA #1/#2/#3/#4/#5/#7/#8/#9/#10
7. **Completa** — funcionalidade integrada de ponta a ponta
8. **Confiança alta** — sem ambiguidade, sem risco de regressão

## 4. Bloqueios automáticos (REGRA #8 — DECISAO_HUMANA)
PRs tocando estes arquivos exigem aprovação explícita do PO:
- `.github/workflows/` — qualquer arquivo de workflow CI/CD
- `supabase/migrations/` — migrações de schema
- `.gitleaks.toml` — política de secrets

## 5. Bloqueio cross-agente (REGRA #10 — DECISAO_HUMANA)
- Branch criada em sessão diferente → não mergeada autonomamente
- Prefixos de agente: `claude/*`, `claude_05/*`, `codex/*`, `devin/*`, `cline/*`
- Merge entre branches de agentes diferentes exige PR

## 6. Branches órfãs (FECHAR)
- NO_MERGE_BASE → `git merge-base HEAD refs/remotes/pr/$N` retorna vazio
- Impossível mergear sem rebase completo
- PRs afetadas: #2417, #2418, #2419, #2420, #2422

## 7. Deploy contínuo
- merge em main = deploy em produção (Vercel automático)
- Somente Gate Final CI success permite merge
- `supabase db push` proibido — caminho único: `db-apply-migration.yml`

## 8. Migrations (REGRA #8 corolário E056)
- DDL via `execute_sql` MCP proibido em sessão de agente
- Migration espelho + `migration repair` para DDL out-of-band
- Caminho único: `.github/workflows/db-apply-migration.yml`

## 9. Edge Functions (REGRA #8 corolário)
- Deploy via `deploy_edge_function` MCP proibido como caminho padrão
- Caminho único: `.github/workflows/deploy-edge-functions.yml`

---

## 10. Baseline — evidências reais (rev24, SHA `2ca5ef04e`)

### TypeScript
```
Comando: node /tmp/main-baseline/node_modules/typescript/bin/tsc \
  -p /tmp/main-baseline/tsconfig.app.json --noEmit
SHA testado: 2ca5ef04e6e0968dace09ffcbd70710aad166ba0
Saída: (vazia)
Exit code: 0
Resultado: 0 ERROS
```

### Build Vite
```
Comando: npm run build
SHA testado: 2ca5ef04e6e0968dace09ffcbd70710aad166ba0
Saída: ✓ built in 11.77s
Resultado: SUCESSO
Avisos: INEFFECTIVE_DYNAMIC_IMPORT (pré-existentes, não bloqueantes)
```

### Lint (ESLint)
```
Comando: npm run lint (= lint:baseline = check-eslint-baseline.mjs)
SHA testado: 2ca5ef04e6e0968dace09ffcbd70710aad166ba0
Resultado: OOM — FATAL ERROR: Ineffective mark-compacts near heap limit
Causa: JavaScript heap out of memory no check-eslint-baseline.mjs
Status: FALHA PRÉ-EXISTENTE — não é regressão desta sessão
check-eslint-config-parses.mjs: OK (11 blocos de config)
```

### Vitest parcial (unitários)
```
Comando: node node_modules/.bin/vitest run \
  src/utils/__tests__/ src/hooks/__tests__/ src/lib/__tests__/ --reporter=dot
SHA testado: 145da71bb8c451eebadc75c4bb059397f8d468f7
Test Files: 54 (53 passed | 1 skipped)
Tests: 2549 (2546 passed | 3 skipped | 0 failed)
Resultado: 0 FALHAS
Nota pré-existente: date-utils.test.ts — 3 falhas sem TZ=America/Sao_Paulo (container UTC)
  → com TZ=America/Sao_Paulo: 0 falhas (62/62 pass)
  → não é regressão — container não tem TZ configurado
Suite completa trava em integration tests sem credenciais Supabase.
```

### Gate 0 SSOT
```
Comando: node scripts/validate-supabase-config.mjs
Resultado: ✅ CURRENT_PROJECT_ID = doufsxqlfjyuvxuezpln
```

### Merge tests (todos os 16 PRs abertos — base `06fe47fd3` — rev31)
| PR | Branch | Resultado |
|----|--------|-----------|
| #2420 | claude/fix-rollback-261019-1637 | NO_MERGE_BASE |
| #2572 | claude_05/youthful-ride-vcdchy | CONFLICT (e2e specs vs 06fe47fd3) |
| #2579 | release-please--branches--main--components--gifts-store | CLEAN |
| #2580 | claude/fix-e23-rollback-261025-2145 | CLEAN |
| #2587 | dependabot/npm_and_yarn/zustand-5.0.16 | CLEAN |
| #2588 | dependabot/npm_and_yarn/react-day-picker-10.0.2 | CLEAN |
| #2590 | dependabot/github_actions/github/codeql-action/upload-sarif-4.39.1 | CLEAN |
| #2591 | dependabot/github_actions/github/codeql-action/analyze-4.39.1 | CLEAN |
| #2592 | dependabot/github_actions/actions/stale-11.0.0 | CLEAN |
| #2593 | dependabot/github_actions/github/codeql-action/init-4.39.1 | CLEAN |
| #2594 | dependabot/github_actions/actions/setup-node-7 | CLEAN |
| #2597 | claude_04/beautiful-gates-bvocz5 | CLEAN |
| #2600 | claude_04/optimistic-bohr-qplx94 | CLEAN |
| #2603 | claude_04/tender-hawking-ghw2zi | CLEAN |
| #2604 | claude_04/charming-darwin-g1nvj2 | CLEAN |
| #2605 | claude/fix-unit-tests-261027-0113 | CLEAN |
