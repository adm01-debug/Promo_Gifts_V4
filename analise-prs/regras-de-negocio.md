# Regras de Negócio — Promo Gifts V4

Fonte: CLAUDE.md (raiz + .claude/), migrations em `supabase/migrations/`, testes em `tests/`, policies em banco `doufsxqlfjyuvxuezpln`, CI gates.

Última atualização: 2026-11-09 (session_01VXkRxWq5ZUCmvuNx5e2TGX)

---

## 1. SSOT do Supabase

**Regra:** O projeto canônico de produção é `doufsxqlfjyuvxuezpln` (Gold/Medallion).

- Fonte: `CLAUDE.md` §REGRA #1; `src/integrations/supabase/client.ts:CURRENT_PROJECT_ID`
- `pqpdolkaeqlyzpdpbizo` é projeto proibido — qualquer PR que escreva nele é NAO_MERGEAR
- Gate 0 (`validate-supabase-config.mjs`) verifica este invariante em todo PR

## 2. Campos Críticos do Tipo `Product`

**Regra:** `src/types/product-catalog.ts` DEVE conter:
```typescript
price: number
sale_price?: number
shortDescription: string
category_id?: string
category_name?: string
```

- Fonte: `CLAUDE.md` §REGRA #2; Gate 1.1
- Remoção ou renomeação sem atualizar TODOS os usos = bug de produção (incidente 2026-06-11)

## 3. Merge em main = Deploy em Produção

**Regra:** Merge na branch `main` dispara deploy automático via Lovable/Vercel.

- Fonte: `CLAUDE.md` §REGRA #7; Lovable GitHub-first flow
- Edge functions são deployadas via `.github/workflows/deploy-edge-functions.yml`
- Migrations são aplicadas via `.github/workflows/db-apply-migration.yml`
- Vercel projeto canônico: `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` (team `juca1`)

## 4. Critérios para Migrations

**Regra:** Migration só é mergeável se:
1. Aditiva e não destrutiva (sem DROP TABLE, DROP COLUMN, RENAME, ALTER TYPE, DELETE/UPDATE em massa)
2. Idempotente (pode ser aplicada 2× sem erro)
3. Já testada/aplicada em produção OU testada em Postgres temporário com toda a cadeia

- Fonte: mandato de análise; `CLAUDE.md` §REGRA #8; `docs/db/POLITICA_DDL.md`
- Mirror files (`repair-only`): aceitos se a DDL já foi aplicada em produção e o ledger precisa do registro

## 5. Edge Functions

**Regra:** Edge function só é mergeável com:
1. Testes passando (Gate Final SUCCESS)
2. Sem afrouxar autenticação (sem remover JWT check, sem mudar `verify_jwt` para false)
3. Deploy via workflow `deploy-edge-functions.yml` (não via MCP direto)

- Fonte: `CLAUDE.md` §REGRA #8 corolário; Gate Final inclui Edge Function deploy check

## 6. RLS / Permissões

**Regra:** Mudança de RLS só é mergeável se:
1. Não ampliar acesso (nenhuma policy nova que permita SELECT/INSERT/UPDATE a papéis que não tinham)
2. Testada em Postgres temporário
3. Sem DROP POLICY sem substituição equivalente

- Fonte: `CLAUDE.md` §REGRA #8; Gate 1.13 (RLS baseline vs pg_policies live)
- Gate 1.13.1: tabelas com RLS habilitada e zero policies = deny-all silencioso = bug

## 7. .github/workflows/ — Proibição do Mandato

**Regra:** Nenhuma PR que toque `.github/workflows/` é mergeável pelo agente nesta sessão.

- Fonte: mandato explícito ("Não tocar .github/workflows")
- Aplica-se a: qualquer arquivo dentro de `.github/workflows/`, independente do conteúdo
- PRs de Dependabot que atualizam SHAs de actions = também NAO_MERGEAR

## 8. Draft PRs

**Regra:** PRs com `draft:true` não são mergeáveis pela API do GitHub (bloqueio nativo).

- Fonte: GitHub API; qualquer tentativa de merge retorna 405
- Exceção: o agente pode analisar e recomendar ao PO

## 9. Arquitetura Medallion

**Regra:** Dados fluem Bronze → Silver → Gold (`doufsxqlfjyuvxuezpln`).

- Bronze: dados brutos de fornecedores (Spot, Asia Import, XBZ, Somarcas, etc.)
- Silver: dados padronizados/enriquecidos
- Gold: dados prontos para consumo pelo app e API
- PR que inverta ou curto-circuite este fluxo = NAO_MERGEAR

## 10. Gate Final — Único Required Check

**Regra:** O único required check em `main` é "Gate Final - Deploy Ready" (`.github/workflows/deploy-gates.yml`).

- Gates obrigatórios: 0, 0.5, 0.6 (PR-only), 1 (lint+TS), 1.1–1.18, E23, 2, 2.5, 3, 5, 5.5, 6
- Gate 4 (Lighthouse): opcional
- Uma PR com Gate Final = SUCCESS + sem conflito + sem DROP = candidata a merge

## 11. Catálogo B2B

**Regra:** Promo Brindes é um catálogo B2B de brindes corporativos. Regras de negócio chave:
- `products.deleted_at IS NULL` = produtos ativos (8321 no fim desta sessão)
- `vw_products_min_quantity`: view de quantidade mínima por produto (versionada em #3264)
- Orçamentos (`quotes`): invariante de listagem em Gate 1.16
- Kit Builder: processo de cotação de kits personalizados

## 12. Concorrência Multi-Agente

**Regra:** 6 agentes escrevem neste repo (Claude, Codex, Devin, Lovable, github-actions, cline).

- Regra 10 (CLAUDE.md): merge cross-agente exige PR
- Sentinel (`scripts/sentinel-check.sh`): recusa merge cross-branch de agentes diferentes
- Verificar PRs abertas antes de iniciar qualquer análise para evitar conflito com outro agente

## 13. Worktrees

**Regra:** Experimentos em `git worktree` local — nunca push de worktrees para origem.

- Regra 11 (CLAUDE.md): `vercel link/pull` PROIBIDO fora do raiz
- `.vercel/project.json` está versionado — não deletar
- Projeto fantasma `promo-gifts-reconciliation-integrity-20260915` foi criado por violação desta regra
