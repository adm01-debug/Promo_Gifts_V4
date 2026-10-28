# Regras de Negócio — contexto para análise de PRs

**Gerado em:** 2026-10-27  
**Fonte:** CLAUDE.md, src/types/, supabase/migrations/, REGRAS #1–#11

## 1. SSOT Supabase (REGRA #1)

- Projeto canônico de produção: `doufsxqlfjyuvxuezpln` (Gold/Medallion Bronze→Silver→Gold)
- **Nunca** alterar para `pqpdolkaeqlyzpdpbizo` (projeto antigo)
- Guard em `src/integrations/supabase/client.ts` — verificado pelo Gate 0 no CI

## 2. Tipo Product (REGRA #2)

Campos obrigatórios em `src/types/product-catalog.ts`:
```typescript
price: number
sale_price?: number
shortDescription: string
category_id?: string
category_name?: string
```

## 3. DDL/Migrations (REGRA #8)

- `execute_sql` com DDL é **proibido em sessão de agente** — somente SELECT
- Migrations só via `.github/workflows/db-apply-migration.yml` (workflow_dispatch)
- Edge functions só via `.github/workflows/deploy-edge-functions.yml`
- PRs que tocam `supabase/migrations/` ou `.github/workflows/` → **AGUARDA PO**

## 4. Vercel (REGRA #11)

- Projeto canônico: `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`
- `.vercel/project.json` não deve ser sobrescrito

## 5. Versão do pacote

- `package.json` versão atual: `1.2.1` (ao iniciar sessão)
- React-day-picker: v10.0.2 (bumped em PR #2588)

## 6. Gate Final

- Único required check para merge em `main`: "Gate Final - Deploy Ready" (`deploy-gates.yml`)
- `edge-functions-drift-check` é required check standalone (bloqueia PRs mesmo sem aparecer no Gate Final)
- Copilot Code Review, E2E, Uptime Monitor: **não** são required checks para o Gate Final

## 7. Agentes que escrevem no repo

Claude, Codex, Devin, Lovable (gpt-engineer-app[bot]), github-actions, cline — merge cross-agent sem PR é proibido (REGRA #10)
