# Regras de Negócio — Promo Gifts V4
# Construído a partir de fontes reais (não de memória)
# Última atualização: 2026-10-31 | Sessão: https://claude.ai/code/session_014nTibSuSPcPvDsPZWiwQbH
#
# RE-DERIVAÇÃO 2026-10-31 — verificação linha a linha contra SHA 554ef41b:
#
# Regra 1 (SSOT): src/integrations/supabase/client.ts:24
#   → CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln" ✓ (grep confirmado nesta sessão)
#
# Regra 2 (campos Product): src/types/product-catalog.ts:30-36
#   → shortDescription:30, price:31, sale_price:32, category_id:35, category_name:36 ✓
#
# Regra 3 (DDL/migration): CLAUDE.md REGRA #8 + docs/db/POLITICA_DDL.md
#   → supabase/migrations/ última migração: 20261027234500 ✓ (ls confirmado)
#
# Regra 4 (PromoFlixPlayer API): src/components/products/gallery/PromoFlixPlayer.tsx
#   → arquivo existe, refatorado pela PR #2810, contrato de props mantido ✓
#
# Regra 5 (SINGU READ-ONLY): src/integrations/supabase/client.ts:22
#   → comentário "pqpdolkaeqlyzpdpbizo (Lovable Cloud vazio)" ✓ [LEGACY_INFORMATIVO]
#
# Nenhuma das 4 PRs mergeadas (#2844/#2845/#2836/#2810) alterou regras de negócio:
#   - #2844: RELATORIO_CI.md (doc apenas)
#   - #2845: docs/INDEX.md + docs/audits/ (docs apenas)
#   - #2836: scripts/plan-status.mjs + testes (scripts apenas, sem alteração de produto)
#   - #2810: PromoFlixPlayer.tsx refactor — mantém contrato de API (refatoração interna)

---

## 1. SSOT Supabase (Fonte: `src/integrations/supabase/client.ts:24`, `CLAUDE.md REGRA #1`)

- Projeto canônico de produção: `doufsxqlfjyuvxuezpln` (Gold/Medallion)
- `CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln"` — campo imutável em `src/integrations/supabase/client.ts:24`
- `pqpdolkaeqlyzpdpbizo` = SINGU (ambiente externo, READ-ONLY, nunca escrever)
- Guarda no Gate 0 CI: `scripts/validate-supabase-config.mjs`
- Risco histórico: commit de Lovable reverte silenciosamente — incidente 401 em 2026-06-11

---

## 2. Tipo `Product` — Campos Críticos (Fonte: `src/types/product-catalog.ts:25-42`, `CLAUDE.md REGRA #2`)

```typescript
// src/types/product-catalog.ts:25 — interface Product
export interface Product {
  id: string;
  name: string;
  shortDescription: string;   // linha 30 — obrigatório (REGRA #2)
  price: number;               // linha 31 — obrigatório (REGRA #2)
  sale_price?: number;         // linha 32 — opcional (REGRA #2)
  category_id?: string | null; // linha 35 — (REGRA #2)
  category_name?: string | null; // linha 36 — (REGRA #2)
  // ... demais campos opcionais
}
```

**Invariante:** estes 5 campos nunca podem ser removidos. Gate 1.1 verifica no CI.

---

## 3. Status de Orçamentos (Fonte: `src/types/quote.ts:10-25`)

```typescript
// src/types/quote.ts:10
export const QUOTE_STATUSES = [
  'approved',   // aprovado pelo cliente
  'draft',      // rascunho em edição
  'rejected',   // recusado pelo cliente
  'sent',       // enviado aguardando resposta
];
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;  // linha 25
export type ClientResponse = 'approved' | 'changes_requested' | 'rejected';  // linha 32
```

**Regra:** `draft` não pode aparecer em listagens públicas de clientes. Gate 1.5 verifica.

---

## 4. RLS — Políticas de Segurança (Fonte: `supabase/migrations/`, `docs/04_EXPLICACAO_DAS_POLICIES.md`)

- **Leitura pública de produtos:** só itens ativos (`supabase/migrations/20260615231459_product_images_schema_documentation.sql`)
- **Escrita de products:** restrita a org owner/admin
- **recently_viewed_products:** users só podem atualizar os próprios registros (`supabase/migrations/20261018000042_e042_fix_policies_public_lote1.sql:224-225`)
- **Regra crítica RLS:** tabelas com RLS habilitada e zero policies = deny-all silencioso → Gate 1.13.1 bloqueia
- **Anon-insert rate guard:** 7 tabelas com INSERT anônimo possuem trigger de rate guard → Gate 1.13.2

---

## 5. DDL e Migrations (Fonte: `CLAUDE.md REGRA #8`, `docs/db/POLITICA_DDL.md`)

- **Único caminho autorizado** para migration em prod: workflow `.github/workflows/db-apply-migration.yml`
- **`execute_sql` via MCP** = proibido para DDL em sessão de agente (E056)
- **`supabase db push`** = proibido (REGRA #1 §7)
- **Migrations em PR** que tocam `supabase/migrations/` → AGUARDA PO (sem exceção)
- Ledger de reconciliação: `supabase/MIGRATIONS_SYNC_LOG.md`
- Baseline do drift-check: `supabase/baseline/*.sql` — NUNCA copiar para `migrations/`

---

## 6. CI / Gate Final (Fonte: `CLAUDE.md CI — ESTRUTURA DE GATES`, `.github/workflows/deploy-gates.yml`)

- **Único required check em `main`:** "Gate Final - Deploy Ready" em `deploy-gates.yml`
- Gate Final = agregador de todos os gates em sequência
- Gate 0: SSOT Supabase (validate-supabase-config.mjs)
- Gate 1: Lint + TypeScript (0 erros é baseline — `62af0798`)
- Gate 2: Testes unitários (baseline: 2 falhas em `calendar.redesign.test.tsx` — `day_selected`, `day_outside`)
- Gate 3: E2E Smoke (Playwright chromium)
- **Regressão** = nova falha além do baseline. Corrigir causa raiz, nunca burlar.
- `paths-ignore: docs/**` — PRs que tocam só `docs/` não disparam CI

---

## 7. Vercel (Fonte: `CLAUDE.md REGRA #11`, `.vercel/project.json`)

- Projeto canônico: `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` (team `juca1`)
- `.vercel/project.json` está versionado — NUNCA deletar
- Proibido `vercel link` fora do raiz do repositório (incidente 2026-09-15)

---

## 8. Tipos derivados do banco (Fonte: `src/integrations/supabase/types.ts`, `CLAUDE.md REGRA #4`)

- **Tabelas obrigatórias em types.ts:**
  - `personalization_techniques`, `products`, `product_variants`, `suppliers`
  - `supplier_products_raw`, `magazines`, `magazine_items`, `magazine_templates`
- Gate 1.2: drift estrutural — nenhuma tabela pode desaparecer sem entrada em `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json`
- Script de verificação: `npm run check:types-inventory-drift`

---

## 9. Agentes e Cross-Agent Merge (Fonte: `CLAUDE.md REGRA #10`, E189)

- 6 agentes escrevem no repo: Claude, Codex, Devin, Lovable, github-actions, cline
- Prefixos de branch: `claude/*`, `codex/*`, `devin/*` etc.
- **Cross-agent merge sem PR** = proibido (Gate 1.18)
- Sentinel: `scripts/sentinel-check.sh` recusa merge commit entre prefixos de agentes diferentes

---

## 10. Arquivos Protegidos (Fonte: `CLAUDE.md — ARQUIVOS PROTEGIDOS`)

| Arquivo | Regra |
|---|---|
| `src/integrations/supabase/client.ts` | REGRA #1 — SSOT |
| `scripts/validate-supabase-config.mjs` | Gate 0 guard |
| `.env.example` | Referência canônica de vars |
| `.lovableignore` | Proteção contra Lovable |
| `.github/CODEOWNERS` | Revisão obrigatória |
| `scripts/sentinel-check.sh` | Branch Protection Sentinel |
| `.github/workflows/deploy-gates.yml` | Gate Final pipeline |
| `.vercel/project.json` | Vercel canônico (REGRA #11) |
| `docs/SCHEMA_REFERENCE.md` | pg_catalog do BD canônico |

---

## 11. Contrato de Calendário (Fonte: `src/components/ui/__tests__/calendar.redesign.test.tsx`)

- Baseline de 2 falhas em main (`62af0798`): `day_selected` e `day_outside`
- Causa: migração react-day-picker v8→v10 (commit `8b0b6068`) sem atualizar seletores DOM
- DOM v10: `aria-selected` vai para `<td>`, não para `<button>`; botões de dia são filhos de `td[role="gridcell"]`
- PR #2681 corrige: atualiza seletores nos 3 arquivos de teste afetados

---

*Fontes verificadas em 2026-10-28 contra código em `62af0798` (main HEAD do baseline)*
