# Regras de Negócio — Promo Brindes V4

**Gerado em:** 2026-10-29 — sessão https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6  
**Fontes:** CLAUDE.md, `src/types/`, `src/types/quote.ts`, `src/types/product-catalog.ts`, `docs/SCHEMA_REFERENCE.md`, CI gates, Supabase MCP

---

## 1. Produto (`Product`)

**SSOT:** `src/types/product-catalog.ts`  
**Campos obrigatórios (Gate 1.1 — CI bloqueia remoção):**

| Campo | Tipo | Obrigatório |
|---|---|---|
| `price` | `number` | ✅ obrigatório |
| `sale_price` | `number \| undefined` | opcional (desconto) |
| `shortDescription` | `string` | ✅ obrigatório |
| `category_id` | `string \| null \| undefined` | opcional |
| `category_name` | `string \| null \| undefined` | opcional |
| `id` | `string` | ✅ obrigatório |
| `name` | `string` | ✅ obrigatório |
| `sku` | `string` | ✅ obrigatório |
| `stock` | `number` | ✅ obrigatório |
| `minQuantity` | `number` | ✅ obrigatório (mínimo B2B) |
| `colors` | `ProductColor[]` | ✅ obrigatório |
| `images` | `string[]` | ✅ obrigatório |
| `materials` | `string[]` | ✅ obrigatório |

**Regra:** `comparePrice` (preço original antes do desconto) é sempre ≥ `price` quando presente. `sale_price` é o preço real de venda (com desconto aplicado).

---

## 2. Orçamento (`Quote`)

**SSOT:** `src/types/quote.ts`  
**Status canônicos (10 valores — CHECK no banco `valid_quote_status`):**

```typescript
export const QUOTE_STATUSES = [
  'approved',      // cliente aprovou
  'cancelled',     // cancelado
  'converted',     // convertido em pedido
  'draft',         // rascunho (não enviado)
  'expired',       // prazo expirado
  'pending',       // aguardando ação
  'pending_approval', // aguardando aprovação interna
  'rejected',      // cliente rejeitou
  'sent',          // enviado ao cliente
  'viewed',        // cliente visualizou
] as const;
```

**Gate 1.16** (CI bloqueante): invariante de listagem de orçamentos — os 10 status devem estar presentes e consistentes entre FE e DB.

**Campos críticos:**
- `shipping_type`: `'cif'` (cortesia — frete incluso) | `'fob'` (cliente paga) | `'fob_pre'` (pré-negociado com custo)
- `client_response`: `'approved'` | `'changes_requested'` | `'rejected'`
- `quote_number`: formato `ORC-YYYY-NNNN`

---

## 3. Supabase — SSOT canônico

**Projeto de produção:** `doufsxqlfjyuvxuezpln` (Gold/Medallion, PG17)  
**Projeto proibido:** `pqpdolkaeqlyzpdpbizo` — qualquer referência em código executável é bug crítico  
**Gate 0** (CI bloqueante): valida `CURRENT_PROJECT_ID` via `validate-supabase-config.mjs`

**Escala do banco (2026-10-29):**
- 383 tabelas
- 940 políticas RLS
- 1.320 funções
- 15 enums
- 138 cron jobs
- Última migration aplicada: `20261022203935`

---

## 4. RLS — Row Level Security

**Regra:** toda tabela com dados de usuário deve ter RLS habilitada.  
**Gate 1.13** (CI bloqueante): verifica `pg_policies` live vs. baseline.  
**Gate 1.13.1** (CI bloqueante): tabelas com RLS habilitada e zero policies = deny-all silencioso — bloqueado.  
**Gate 1.13.2** (CI bloqueante): 7 tabelas com INSERT anônimo devem ter trigger de rate guard.

---

## 5. Migrations

**Política (REGRA #8 CLAUDE.md):** toda DDL vai via `supabase/migrations/*.sql`.  
**Único caminho autorizado:** `.github/workflows/db-apply-migration.yml` (`workflow_dispatch`).  
**Proibido:** `supabase db push`, `execute_sql` com DDL, apply via MCP/dashboard sem reconciliação.

**Regra de naming:** `YYYYMMDDHHMMSS_descricao.sql` — timestamp real de aplicação.  
**Gate 1.3** (CI bloqueante): contratos de migration (preflight E15).

---

## 6. Edge Functions

**Único caminho de deploy:** `.github/workflows/deploy-edge-functions.yml` (`workflow_dispatch`).  
**Proibido:** `deploy_edge_function` via MCP como caminho padrão.  
**Reconciliação obrigatória** quando deploy emergencial via MCP: reconciliar no mesmo dia + rerun job "Compare GitHub × Canonical".

---

## 7. Arquitetura Medallion

**Fluxo:** Bronze (dados brutos dos fornecedores) → Silver (normalizado) → Gold (`doufsxqlfjyuvxuezpln`)  
**Tabelas estratégicas:** `products`, `product_variants`, `supplier_products_raw`, `personalization_techniques`, `magazines`, `magazine_items`, `magazine_templates`, `suppliers`  
**Gate 1.2** (CI bloqueante): drift estrutural de `types.ts` — remoção de tabela/view/function/enum sem allowlist bloqueia merge.

---

## 8. Tipos de personalização

**SSOT:** `src/types/domain/personalization.ts` + tabela `personalization_techniques` no banco  
**Regra:** `hasPersonalization` no tipo `Product` mapeia `has_personalization` do banco via mapper externo.  
**Técnicas suportadas:** serigrafia, bordado, laser, sublimação, tampografia, etc. (definidas no banco).

---

## 9. Cart / Orçamento — RPC canônica

**RPC:** `restore_seller_cart` — restaura cart de vendedor a partir de quote salvo  
**Gate 5.5** (CI bloqueante): valida que a RPC existe no banco canônico.  
**Proibido:** remover ou renomear essa função sem atualizar todos os usos e o gate.

---

## 10. Segredos e variáveis de ambiente

**SSOT:** `docs/ci/SEGREDOS.md` — lista todos `secrets.*` e `vars.*` dos workflows  
**Gate 1.14** (CI bloqueante): secrets inventory — todo segredo deve estar documentado.  
**Regra:** segredos nunca entram em código, commit, log ou resposta — só em env/secrets do serviço.

---

## 11. Vercel

**Projeto canônico:** `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` (team `juca1`)  
**REGRA #11 (CLAUDE.md):** `vercel link`/`vercel pull` proibido fora do raiz do repo — cria projeto fantasma.  
**`.vercel/project.json`** está versionado no repo — não deletar.

---

## 12. Regras de CI que impactam código

| Gate | Regra de negócio protegida |
|---|---|
| Gate 0 | SSOT `doufsxqlfjyuvxuezpln` — incidente 401 |
| Gate 1.1 | Campos `Product`: `price`, `sale_price`, `shortDescription`, `category_id`, `category_name` |
| Gate 1.5 | Sem "Salvar Alterações" em fluxos de rascunho (draft não deve ser salvo como enviado) |
| Gate 1.9.2 | Boundary cross-domain — sem import entre pages de domínios diferentes |
| Gate 1.16 | Invariantes da lista de orçamentos (10 status, nenhum duplicado) |
| Gate 2.5 | Integridade transacional PostgreSQL |
| Gate 5.5 | RPC `restore_seller_cart` presente no banco |
