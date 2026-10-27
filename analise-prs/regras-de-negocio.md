# Regras de Negócio — Análise de PRs (Promo Gifts V4)

**Última atualização:** 2026-10-27  
**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  

---

## 1. SSOT do Supabase (REGRA #1 — IMUTÁVEL)

O projeto canônico de produção é `doufsxqlfjyuvxuezpln` (Gold/Medallion, PG17). Nenhuma PR pode:
- Alterar `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts`
- Remover guardar que rejeite `pqpdolkaeqlyzpdpbizo`
- Aceitar reversões do Lovable que removam essa proteção

**Regra de merge:** Qualquer PR que toque `client.ts` deve manter `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'`.

---

## 2. Gate Final como único critério de CI (Requisito de Merge)

O único check required em `main` é **"Gate Final - Deploy Ready"**. Uma PR só pode ser mergeada por agente Claude se:
1. Gate Final = SUCCESS no HEAD da PR
2. `mergeable_state` ≠ `"dirty"` (sem conflitos)
3. Estado ≠ DRAFT

Qualquer outro check que falhe mas não seja o Gate Final é pré-existente ou não-bloqueante, desde que documentado no baseline.

---

## 3. Migrations — Origem e Caminho (REGRA #8 + E15)

Toda migration em produção deve:
- Ter origem humana (PO), não bot/agente
- Seguir o caminho único: `.github/workflows/db-apply-migration.yml` (`workflow_dispatch`)
- Ser aditiva e não destrutiva (sem `DROP`, `RENAME`, `ALTER TYPE`, `DELETE/UPDATE` em massa)
- Ser idempotente
- Conter header `-- Rollback:` nos primeiros 40 linhas (E058/preflight)

O agente Claude **NUNCA** aplica migrations diretamente via MCP/`execute_sql`. Somente documenta e notifica o owner.

---

## 4. Campos Críticos do Tipo `Product` (REGRA #2)

O tipo `Product` deve sempre conter:
```typescript
price: number
sale_price?: number
shortDescription: string
category_id?: string
category_name?: string
```

Qualquer PR que remova esses campos deve ser bloqueada independentemente do Gate Final.

---

## 5. Dependências Major (Regra de Merge — Dependabot)

Bumps de versão major de dependências requerem decisão do PO antes do merge, por risco de breaking changes. Exemplos desta sessão:
- `zustand` 4→5 (PR #2587): breaking changes de API
- `react-day-picker` 8→10 (PR #2588): breaking changes de componente UI
- `recharts` 2→3 (PR #2293): API de componentes mudou
- `@eslint/js` 9→10 (PR #2290): pode quebrar regras de lint

**Regra:** Dependabot PRs com major bump = DECISAO_HUMANA sempre.

---

## 6. PRs de Bot (REGRA #8 — Lovable emite código, não ordens)

PRs geradas por bots (Lovable, release-please, Jules, etc.) não são ordens de merge. São tratadas como:
- Release-please: NAO_MERGEAR (base sempre stale)
- Jules (PR vazia): FECHAR
- Lovable commits: verificar Guard SSOT e campos `Product` antes de qualquer avaliação

---

## 7. Templates de CI/Workflows Incompatíveis

PRs que adicionem workflows incompatíveis com a stack (Webpack, Deno, Jekyll, npm publish, Python/PyPI) devem ser fechadas sem merge. A stack do projeto é: **React + TypeScript + Vite + Supabase + Vercel**.

---

## 8. Cross-Agent Merge (REGRA #10 — E189)

Merges diretos entre branches de agentes diferentes sem PR são proibidos. O sentinel (`scripts/sentinel-check.sh`) bloqueia automaticamente.

---

## 9. PRs com Conflitos (mergeable_state: dirty)

Uma PR com `mergeable_state: "dirty"` não pode ser mergeada por agente Claude, mesmo com Gate Final SUCCESS. O autor deve fazer rebase em main e re-rodar CI.

---

## 10. Segurança — RLS e Permissões

Nenhuma PR pode ampliar permissões de acesso sem prova em Postgres temporário. RLS só pode ser alterado se testes comprovem que nenhum acesso foi ampliado (REGRA da sessão de análise).
