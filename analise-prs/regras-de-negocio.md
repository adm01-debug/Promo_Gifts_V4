# Regras de Negócio — Promo Gifts V4
**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo (atualizado 2026-10-28)
**Sessão original:** session_01Ss1tXZ4cAbxBvdmu95uNPz (2026-10-25)
**Data:** 2026-10-28
**main HEAD atual:** `04239fdd42eef05589fb41b3f0e58a664621fbf7` (PR #2665 qs, 2026-10-28)
**main HEAD original:** `c113300c034fb39126274fba9aa10ef05762ab13`

**Verificação desta sessão:** Regras 1–9 abaixo foram conferidas contra main HEAD `04239fdd` —
nenhuma mudança nas regras de negócio entre 2026-10-25 e 2026-10-28. Código em
`src/integrations/supabase/client.ts` mantém `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'`
(verificado via `grep doufsxqlfjyuvxuezpln src/integrations/supabase/client.ts` — linha 3).
Tipo `Product` em `src/types/product-catalog.ts` mantém campos críticos price/sale_price/
shortDescription/category_id/category_name (verificado via grep na sessão anterior — sem
commits alterando este arquivo entre os dois main HEADs).

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
