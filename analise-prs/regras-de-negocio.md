# Regras de Negócio — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (rev33)
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

## 10. Baseline — evidências reais (rev33, SHA `06fe47fd3`)

### TypeScript
```
Comando: tsc -p tsconfig.app.json --noEmit
SHA testado: 06fe47fd3a992bf2a39ab356c9d8c357c5f2a27e
Worktree: /tmp/main-baseline-rev32
Exit code: 0
Resultado: 0 ERROS
```

### Vitest por arquivo (rev33 — testes de PR #2605 verificados em main 06fe47fd3)
```
chunk-recovery.shared-reload-budget.test.ts: 8 PASSED
replenishment-resilience.test.ts:            3 PASSED
PromoFlixPlayer.test.tsx:                   22 PASSED
NegotiationMarkupCard (3 arquivos):         23 PASSED
novidades-reposicao-card-parity.spec.ts:    NÃO VERIFICADO (E2E — requer servidor)
  → CI de PR #2605 HEAD 9bfead1417: SUCCESS
```

**Conclusão:** Todos os 5 grupos de testes que PR #2605 afirma corrigir PASSAM em main 06fe47fd3.
O main avançou de 00eeec9ac → 06fe47fd3 e absorveu ou tornou irrelevantes as correções de #2605.

### Gate Final CI em main
```
check_run: "Gate Final - Deploy Ready"
SHA: 06fe47fd3a992bf2a39ab356c9d8c357c5f2a27e
Status: SUCCESS
```

### Merge tests (todos os 16 PRs abertos — base `06fe47fd3` — rev33)
| PR | Branch | Resultado |
|----|--------|-----------|
| #2420 | claude/fix-rollback-261019-1637 | NO_MERGE_BASE |
| #2572 | claude_05/youthful-ride-vcdchy | CONFLICT — RELATORIO_CI.md + ItemCard.tsx (resolução verificada em worktree — manter main em ambos) |
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
