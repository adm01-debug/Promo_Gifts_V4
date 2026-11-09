# Regras de Negócio — Promo Gifts V4

> Documento gerado em 2026-11-09 | Sessão: session_01VXkRxWq5ZUCmvuNx5e2TGX

## Critérios de Merge

### NUNCA MERGEAR
1. **PRs de entrega desta sessão** (#2674, #3355) — branch `claude_pink/sleepy-cannon-h000nc`
2. **Conflito de merge** (mergeStateStatus=DIRTY/CONFLICTING) — irreconciliável automaticamente
3. **Toca `.github/workflows/`** — mandato absoluto proíbe o agente
4. **Gate Final CI = FAILURE** — CI quebrado não sobe para produção

### AGUARDA_PO — Requer aprovação humana
1. **DDL/Migration** (REGRA #8 CLAUDE.md): toda migration SQL em `doufsxqlfjyuvxuezpln` requer aprovação explícita do PO
2. **CI Workflows**: PRs que modificam `.github/workflows/` requerem revisão do PO
3. **Major version bumps**: bumps de major version em dependências npm requerem avaliação de breaking changes

### PODE MERGEAR (todos os critérios obrigatórios)
- mergeStateStatus = MERGEABLE (ou BEHIND sem conflito)
- Gate Final = SUCCESS no head SHA da PR
- Não toca `.github/workflows/`
- Não é migration SQL DDL
- Não é major version bump
- Não é PR de entrega desta sessão

## Projeto Canônico Supabase
- **ID:** `doufsxqlfjyuvxuezpln` (produção Gold/Medallion)
- **Nunca alterar SSOT** — REGRA #1 CLAUDE.md
- **execute_sql: somente leitura** — REGRA E056 (nunca DDL via execute_sql)

## Merge = Deploy em Produção
O Lovable (gpt-engineer-app[bot]) redeploya automaticamente após merge em main. Todo merge é deploy em produção imediata. Verificar sempre que Gate Final = SUCCESS antes de mergear.

## Stack
- React + TypeScript + Vite + Supabase (PostgreSQL)
- 6 agentes escrevem no repo: Claude, Codex, Devin, Lovable, github-actions, cline
- Merge cross-agente exige PR (REGRA #10)

## Arquitetura de Dados
- Medallion: Bronze → Silver → Gold
- Tabelas críticas: products (8321 registros), product_variants, suppliers, magazines
- Supabase prodcount verificado em 2026-11-09 via SELECT COUNT(*)

## Proteções Automáticas (CI Gates)
- **Gate 0:** SSOT validação `doufsxqlfjyuvxuezpln`
- **Gate 1:** Lint + TypeScript sem erros
- **Gate 2:** Testes unitários (vitest)
- **Gate 3:** E2E Smoke (Playwright)
- **Gate 5:** SEO sanity
- **Gate 5.5:** RPC restore_seller_cart presente
- **Gate 6:** Build Vite + SBOM
- **Gate Final:** Agrega todos — único required check em main
