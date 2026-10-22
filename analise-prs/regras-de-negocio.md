# Regras de Negócio — Promo Gifts V4

**Baseline main:** `8e8053b9ed85142e85809783cd3acf9a3077ecde`  
**Data:** 2026-10-22  
**Fontes:** CLAUDE.md, src/types/product-catalog.ts, src/integrations/supabase/client.ts, .github/workflows/deploy-gates.yml, tests/contracts/webhook-schemas.ts, docs/SCHEMA_REFERENCE.md

---

## 1. Identidade do Projeto

- **Produto:** Promo Brindes — catálogo B2B de brindes corporativos
- **Stack:** React + TypeScript + Vite + Supabase (PG17)
- **Projeto canônico:** `doufsxqlfjyuvxuezpln` (Gold/Medallion)
- **Projeto proibido:** `pqpdolkaeqlyzpdpbizo` — qualquer PR que referencie este ID não é mergeada (REGRA #1)
- **UI builder:** Lovable (gpt-engineer-app[bot]) commita em `main` diretamente

---

## 2. SSOT Supabase (REGRA #1 — imutável)

| Regra | Descrição |
|---|---|
| `CURRENT_PROJECT_ID` | Deve ser `doufsxqlfjyuvxuezpln` em `src/integrations/supabase/client.ts` |
| Gate 0 | Valida SSOT no CI — bloqueante |
| Evidência de incidente | 2026-06-11: Lovable reverteu o arquivo 6x em 10 min causando erro 401 em produção |

---

## 3. Tipo `Product` — Campos Críticos (REGRA #2)

Localização: `src/types/product-catalog.ts` (ou equivalente)

```typescript
price: number           // preço original — obrigatório
sale_price?: number     // preço de venda
shortDescription: string
category_id?: string
category_name?: string
```

PR que remove esses campos: NÃO MERGEAR.

---

## 4. CI — Gates Obrigatórios

O único required check em `main` é **"Gate Final - Deploy Ready"** (`.github/workflows/deploy-gates.yml`). Agrega:

| Gate | Bloqueante | Descrição |
|---|---|---|
| Gate 0 | sim | SSOT `doufsxqlfjyuvxuezpln` |
| Gate 0.5 | sim | `npm audit --audit-level high` |
| Gate 1 | sim | ESLint + TypeScript |
| Gate 1.1–1.18 | sim | Campos Product, drift types.ts, secrets, etc. |
| Gate E23 | sim | Secrets scan (gitleaks) |
| Gate 2 | sim | Testes unitários (vitest) |
| Gate 2.5 | sim | Integridade transacional PostgreSQL |
| Gate 3 | sim | E2E Smoke (Playwright) |
| Gate 5 | sim | SEO sanity |
| Gate 5.5 | sim | RPC `restore_seller_cart` |
| Gate 6 | sim | Build Vite |
| Gate 4 | opcional | Lighthouse CI |

---

## 5. Regras de Merge

- **Migration:** só se aditiva e não destrutiva (sem DROP, RENAME, ALTER TYPE, DELETE/UPDATE em massa), idempotente
- **Edge function:** só com testes passando, sem afrouxar autenticação
- **RLS/permissões:** só se testes em Postgres temporário comprovarem zero expansão de acesso
- **Qualquer falha nova pós-merge → PARAR todos os merges**

---

## 6. Falhas Pré-Existentes em `main` (baseline `8e8053b9`)

As seguintes falhas existiam em `main` ANTES de qualquer PR desta análise:

- `Gate Final - Deploy Ready` (agregador)
- `Gate 0.5 - Dependency Audit`
- `Gate 1 - Lint + TypeScript`
- `E2E — Personalization Journey`
- `Migrations x Canonical schema (Gate E40)` — ECR rate limit
- `E2E · webkit-authed`
- `cart-invariants (firefox-authed · shard 1/2 e 2/2)`
- `cart-invariants (chromium-authed · shard 1/2)`
- `E2E — Full User Flows (authed)`
- `E2E Subtítulo quote_number (visual)` (cancelada no baseline; failing pré-merge)
- `E2E PDF exportado · quote_number`
- `release-please`
- `chromium • swatch→QV` (cancelada no baseline → failure pós CI-fix)

---

## 7. Restrições de Deploy via MCP

- `execute_sql` com DDL é **proibido** em sessão de agente (REGRA #8/E056)
- Deploy de edge function: **apenas** via `.github/workflows/deploy-edge-functions.yml`
- Migration nova: **apenas** via `.github/workflows/db-apply-migration.yml`
- `supabase db push` é **proibido**
- SINGU é **READ-ONLY** e fora do escopo

---

## 8. Agentes que escrevem no repo

Claude, Codex, Devin, Lovable (gpt-engineer-app[bot]), github-actions, cline. Merge cross-agente exige PR (REGRA #10/E189).

---

## 9. Contratos de Edge Functions

Arquivo: `tests/contracts/webhook-schemas.ts`  
Map `CONTRACTS`: mapeia nome de edge function → schema JSON Schema  
Set `NO_BODY_EXEMPT`: edge functions GET-only sem body

`magazine-reader-state-read` → em `NO_BODY_EXEMPT` (adicionado pelo PR #2338)

---

*Fontes primárias: CLAUDE.md (raiz), src/integrations/supabase/client.ts, tests/contracts/webhook-schemas.ts, docs/SCHEMA_REFERENCE.md, .github/workflows/deploy-gates.yml*
