# Regras de Negócio Identificadas

**Baseline SHA do main:** `8e8053b9ed85142e85809783cd3acf9a3077ecde`
**Data da análise:** 2026-10-22

## Stack e arquitetura

- React + TypeScript + Vite + Supabase (`doufsxqlfjyuvxuezpln`)
- Arquitetura medallion Bronze→Silver→Gold
- CI: deploy-gates.yml com Gate 0–6+, todos obrigatórios

## Regras extraídas do CLAUDE.md

### R1 — SSOT Supabase
`CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` é imutável. Qualquer PR que altere `src/integrations/supabase/client.ts` para outro projeto é automaticamente **NÃO MERGEAR**.

### R2 — Campos críticos do tipo Product
`price`, `sale_price?`, `shortDescription`, `category_id?`, `category_name?` devem existir em `src/types/product-catalog.ts`. PR que remova estes campos = **NÃO MERGEAR**.

### R3 — Conflitos resolvidos pela semântica, não "main wins"
Comentários `// SSOT:`, `// GUARD:`, `// CRÍTICO:` são imutáveis.

### R8 — Lovable emite código, não ordens
DDL via `execute_sql` é proibido. Deploy de edge function só via `deploy-edge-functions.yml`.

### R9 — Commits de governança exigem push + PR
Arquivos `.github/**`, migrations, scripts `check-*` exigem PR aberto.

### R10 — Merge cross-agente exige PR
Branch de agente diferente (claude/*, codex/*, lovable/*) não pode ser mergeado diretamente sem PR.

## Padrão de workflow (R1–R20)

| Regra | Obrigação |
|---|---|
| R1 | `permissions:` explícito |
| R2 | `concurrency:` com `cancel-in-progress` |
| R3 | `timeout-minutes:` em todo job |
| R4 | `node-version-file: .nvmrc` |
| R5 | Segredos via `env:`, nunca CLI |
| R14 | `ubuntu-24.04` — nunca `ubuntu-latest` |
| R15 | Actions pinadas por SHA 40 chars |
| R11 | `contents: write` proibido em PR workflow |
| R18 | `supabase db push` proibido |
| R19 | Sem referência a `pqpdolkaeqlyzpdpbizo` |

## Critérios de merge

Para uma PR ser mergeável nesta análise, TODOS os critérios abaixo devem ser satisfeitos simultaneamente:

1. **Válida**: objetivo ainda faz sentido, não foi implementado em main
2. **Sem regressão**: Gate Final verde no head atual
3. **Base atualizada**: base = main atual (ou compatível)
4. **Sem conflito**: sem conflito com outra PR a ser mergeada
5. **Não é DRAFT**: estado diferente de rascunho
6. **Regra de negócio correta**: não viola SSOT, Product type, workflows padrão
7. **Não é PR vazia/bot-report**: tem arquivos alterados com propósito real
