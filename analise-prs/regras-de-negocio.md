# Regras de Negócio — Promo Brindes V4

**Fonte:** CLAUDE.md, migrations, policies, docs, código analisado na sessão 2026-10-29

---

## 1. SSOT do Supabase (REGRA #1)

- **Projeto canônico de produção:** `doufsxqlfjyuvxuezpln` (Gold/Medallion)
- **Projeto proibido:** `pqpdolkaeqlyzpdpbizo` — nunca referenciar em código executável
- Fonte: `src/integrations/supabase/client.ts` + `CLAUDE.md §REGRA #1`
- Gate 0 CI valida este invariante a cada PR

## 2. Tipo `Product` — Campos Críticos (REGRA #2)

O tipo `Product` em `src/types/product-catalog.ts` DEVE conter:
```typescript
price: number           // preço original
sale_price?: number     // preço de venda
shortDescription: string
category_id?: string
category_name?: string
```
Fonte: `CLAUDE.md §REGRA #2` + incidente `f22e1e2` (2026-06-11)

## 3. Fluxo de Migrations (REGRA #8)

- **Único caminho autorizado:** `.github/workflows/db-apply-migration.yml` (`workflow_dispatch`)
- `supabase db push` é **proibido**
- DDL via `execute_sql` é **proibido** em sessão de agente
- Migrations devem ser: aditivas, não destrutivas (sem DROP, RENAME, ALTER TYPE), idempotentes
- Fonte: `CLAUDE.md §REGRA #8`, `docs/db/POLITICA_DDL.md`

## 4. Deploy de Edge Functions (REGRA #8 corolário)

- **Único caminho:** `.github/workflows/deploy-edge-functions.yml` (`workflow_dispatch`)
- `deploy_edge_function` via MCP = **proibido como caminho padrão**
- Fonte: `CLAUDE.md §REGRA #8 corolário`

## 5. RLS e Permissões

- Toda tabela com dados de usuário deve ter RLS habilitado
- Gate 1.13 verifica RLS policies baseline vs live
- Gate 1.13.1: tabelas com RLS habilitado e zero policies = deny-all silencioso = erro
- Gate 1.13.2: 7 tabelas com INSERT anônimo devem ter trigger de rate guard
- Fonte: `CLAUDE.md §CI ESTRUTURA DE GATES`, PR #2731

## 6. Workflows CI (REGRA #8)

- PRs tocando `.github/workflows/` exigem **DECISAO_HUMANA** — sem merge autônomo
- Padrão E12: 20 regras obrigatórias (R1–R20) em `docs/ci/PADRAO_WORKFLOW.md`
- Runner: `ubuntu-24.04` fixo (nunca `ubuntu-latest`)
- Fonte: `CLAUDE.md §CI ESTRUTURA DE GATES §REGRA #8`

## 7. Sessões Cross-Agente (REGRA #10)

- Merge de branch criado por outra sessão Claude = **DECISAO_HUMANA**
- Identificação: prefixo `claude/` com ID de sessão diferente
- Fonte: `CLAUDE.md §REGRA #10`

## 8. Vercel

- Projeto canônico: `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` (team `juca1`)
- `.vercel/project.json` está versionado — NÃO deletar
- Nunca rodar `vercel link` fora do raiz do repo
- Fonte: `CLAUDE.md §REGRA #11`

## 9. Segredos

- `docs/ci/SEGREDOS.md` = SSOT de todos `secrets.*` e `vars.*`
- PR que adiciona `secrets.NOVO_SEGREDO` deve incluir linha nesse arquivo
- Fonte: `CLAUDE.md §Inventário de segredos E98`

## 10. Produção = merge em main

- Repo tem deploy automático (Vercel + Supabase edge functions)
- Merge em `main` = produção imediata
- Verificação pós-merge: CI verde + Supabase MCP para migrations/edge functions
- Fonte: `CLAUDE.md §REGRA #9`, fluxo de deploy Vercel
