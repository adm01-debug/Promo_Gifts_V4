# regras-de-negocio.md — rev70
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF
**Data:** 2026-10-27
**main HEAD:** 5d049ef118f3eb84843da44bd8d2efc70ee56ca1
**Supabase projeto canônico:** doufsxqlfjyuvxuezpln (SSOT — REGRA#1)
**Supabase URL verificada via MCP:** https://doufsxqlfjyuvxuezpln.supabase.co (confirmado)

---

## 1. Arquitetura de dados

**Medallion Bronze → Silver → Gold**
- Bronze: `supplier_products_raw` (ingestão crua dos fornecedores — Promobrind, XBZ, etc.)
- Silver: tabelas intermediárias após ETL (deduplicação, enriquecimento)
- Gold: `products`, `product_variants`, `categories`, etc. — projeto `doufsxqlfjyuvxuezpln`

**Multi-tenant via Organizations:**
- Toda tabela relevante tem `organization_id UUID` — isolamento total via RLS
- Funções helper: `user_is_org_member(org_id)`, `is_org_admin(org_id)`, `is_org_owner_or_admin(org_id)`
- 100% das tabelas em `public` têm RLS habilitado (Gate 1.13 bloqueia regressão)
- Fonte: `docs/04_EXPLICACAO_DAS_POLICIES.md`, `docs/03_ARQUITETURA_DO_SISTEMA.md`

**Tabelas críticas por domínio** (fonte: `docs/03_ARQUITETURA_DO_SISTEMA.md`):
```
CORE        → organizations, user_organizations
CATALOG     → categories, suppliers, products, product_variants,
              personalization_techniques, supplier_products_raw
SALES       → quotes, quote_items, orders, order_items, payments
CLIENTS     → bitrix_clients, client_contacts, client_notes
MOCKUPS     → mockup_generation_jobs, generated_mockups
MAGAZINES   → magazines, magazine_items, magazine_templates
COLLECTIONS → collections, collection_products
USER DATA   → user_favorites, user_filter_presets
```

---

## 2. Enums SSOT

### 2.1 Status de Orçamento
**Fonte:** `src/types/quote.ts:10-21` (Zod schema) + CHECK constraint DB `valid_quote_status`
**Verificado em:** 2026-06-25 (comentário no código)

```typescript
export const QUOTE_STATUSES = [
  'approved', 'cancelled', 'converted', 'draft', 'expired',
  'pending', 'pending_approval', 'rejected', 'sent', 'viewed',
] as const; // 10 valores — ordem alfabética para diffs estáveis
```

**Tipo derivado:** `QuoteStatus = z.infer<typeof quoteStatusSchema>`
**Guard:** `isQuoteStatus(value: unknown): value is QuoteStatus` — sem throw

### 2.2 Resposta do Cliente
**Fonte:** `src/types/quote.ts:31`
```typescript
type ClientResponse = 'approved' | 'changes_requested' | 'rejected';
```

### 2.3 Frete (Shipping Type)
**Fonte:** `src/types/quote.ts:54` (comentário inline)
- `'cif'` — cortesia (frete incluso)
- `'fob'` — cliente paga frete
- `'fob_pre'` — pré-negociado com custo fixo

### 2.4 Status de Estoque
**Fonte:** `src/types/stock.ts:100-108`
```typescript
type StockStatus =
  | 'critical'     // < 25% do mínimo
  | 'in_stock'     // OK
  | 'incoming'     // aguardando
  | 'low_stock'    // abaixo do mínimo
  | 'out_of_stock' // sem estoque
  | 'overstocked'; // excesso
```

### 2.5 Tipo de Movimentação de Estoque
**Fonte:** `src/types/stock.ts:234-241`
```typescript
type StockMovementType =
  | 'adjustment' | 'in' | 'out' | 'released'
  | 'reserved' | 'return' | 'transfer';
```

### 2.6 Tipo de Alerta de Estoque
**Fonte:** `src/types/stock.ts:279-286`
```typescript
type StockAlertType =
  | 'critical' | 'incoming_delayed' | 'low_stock'
  | 'out_of_stock' | 'overstock' | 'restock_needed' | 'stockout_predicted';
```

### 2.7 Categorias de Revista (Magazine)
**Fonte:** `src/types/magazine.ts:32-47`
14 categorias: `awards`, `bags`, `clocks`, `customized`, `drinkwares`, `general`,
`giftsets`, `id`, `packaging`, `pins`, `signs`, `stationery`, `technology`, `wearables`

### 2.8 Família de Template de Revista
**Fonte:** `src/types/magazine.ts` (linha ~48)
```typescript
type MagazineTemplateFamily = 'catalog' | 'corporate' | 'editorial';
```
Templates IDs: `catalog-giftset`, `catalog-grid-2x3`, `catalog-grid-3x3`, `catalog-list`,
`corporate-executive`, `corporate-hero`, `corporate-split`, `editorial-hero-grid`,
`editorial-magazine`, `editorial-manifesto`, `editorial-mono`, `editorial-vogue`

### 2.9 Shape de Área de Gravação
**Fonte:** `src/types/gravacao.ts`
```typescript
type AreaShape = 'circle' | 'custom' | 'oval' | 'rectangle' | 'triangle';
```

### 2.10 Tipo de Setup
**Fonte:** `src/types/gravacao.ts` (campo `tipo_setup` de `TecnicaGravacao`)
```
'cliche' | 'fotolito' | 'matriz' | 'nenhum' | 'arte_digital'
```

### 2.11 Formato de Variante do Produto
**Fonte:** `src/types/infrastructure/promobrind.ts:162`
```typescript
type FormatoVariante = 'cilindrica' | 'patch' | 'plana' | 'textil';
```

### 2.12 Tipo de Integração de Fornecedor
**Fonte:** `src/types/infrastructure/promobrind.ts:163`
```typescript
type TipoIntegracao = 'api_rest' | 'api_spot' | 'manual';
```

### 2.13 Step do Simulador
**Fonte:** `src/types/domain/simulation.ts:89`
```typescript
type SimulatorStep = 'product' | 'results' | 'techniques';
```

### 2.14 Status de Saúde EMA
**Fonte:** `src/types/ema-health.ts`
```typescript
type EmaHealthStatus = 'ERROR' | 'OK' | 'UNKNOWN' | 'WARN';
```

---

## 3. Campos críticos do tipo `Product`

**Fonte:** `src/types/product.ts` (verificado rev59), REGRA#2 `CLAUDE.md`

| Campo | Tipo | Obrigatoriedade | Regra |
|-------|------|-----------------|-------|
| `price` | `number` | obrigatório | REGRA#2 — nunca renomear sem atualizar todos os usos |
| `sale_price` | `number \| undefined` | opcional | REGRA#2 |
| `shortDescription` | `string` | obrigatório | REGRA#2 |
| `category_id` | `string \| null` | opcional | REGRA#2 |
| `category_name` | `string \| null` | opcional | REGRA#2 |

**Gate de CI:** Gate 1.1 verifica esses campos antes de qualquer merge (`.github/workflows/deploy-gates.yml`)

**Histórico de incidente:** Commit `f22e1e2` (2026-06-11) removeu esses campos em merge.
Restaurados em `aca0f6f`, `14f6d6a`, `0a31ef9` (3 commits extras).

---

## 4. Políticas RLS (resumo)

**Fonte:** `docs/04_EXPLICACAO_DAS_POLICIES.md`

- ~662 policies ativas em 269 tabelas (2026-05-22)
- 100% das tabelas `public` têm RLS habilitado
- Padrão: `organization_id` como chave de isolamento
- Roles: `owner`, `admin`, `member` (via `user_organizations.role`)
- Funções helper: `user_is_org_member()`, `is_org_admin()`, `is_org_owner_or_admin()`
- Gate 1.13 (bloqueante): RLS policies baseline vs pg_policies live
- Gate 1.13.1 (bloqueante): tabelas com RLS ON e zero policies = deny-all silencioso

**Padrão de policy (SELECT):**
```sql
USING (user_is_org_member(organization_id))
```
**Padrão de policy (INSERT/UPDATE):**
```sql
WITH CHECK (is_org_owner_or_admin(organization_id))
```

**RLS em `supplier_products_raw`:** migration `20261027200000_supplier_stricker_rls_deny_all.sql`
implementou deny-all em 2026-10-27 — PR #2600 documenta essa mudança.

---

## 5. Migrações relevantes (6 meses recentes)

**Fonte:** `supabase/migrations/` — últimas 20 entradas verificadas

| Data | Arquivo | Conteúdo |
|------|---------|----------|
| 2026-10-27 | `20261027234500_reactivate_xbz_image_uploader_cron.sql` | Reativa cron XBZ |
| 2026-10-27 | `20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql` | Allowlist secret XBZ |
| 2026-10-27 | `20261027230000_cleanup_get_edge_function_secret_allowlist.sql` | Limpa allowlist |
| 2026-10-27 | `20261027220000_deactivate_xbz_image_uploader_cron.sql` | Desativa cron XBZ temporário |
| 2026-10-27 | `20261027200000_supplier_stricker_rls_deny_all.sql` | RLS deny-all suppliers |
| 2026-10-27 | `20261027180000_reactivate_generate_blurhashes_safe_schedule.sql` | Reativa blurhash cron |
| 2026-10-27 | `20261027160000_deactivate_image_dimensions_backfill_cron.sql` | Desativa cron |
| 2026-10-27 | `20261027140000_stagger_cron_burst_schedules.sql` | Escala cron burst |
| 2026-10-27 | `20261027120000_fix_connections_auto_test_cron_secret.sql` | Fix cron secret — **EM LEDGER** (confirmado via MCP rev70) |
| 2026-10-27 | `20261027140000_stagger_cron_burst_schedules.sql` | Escala cron burst — **EM LEDGER** (confirmado via MCP rev70) |
| 2026-10-27 | `20261027160000_deactivate_image_dimensions_backfill_cron.sql` | Desativa cron — arquivo no repo, **NÃO no ledger** (aguarda db-apply-migration.yml) |
| 2026-10-27 | `20261027180000_reactivate_generate_blurhashes_safe_schedule.sql` | Reativa blurhash cron — **NÃO no ledger** |
| 2026-10-27 | `20261027200000_supplier_stricker_rls_deny_all.sql` | RLS deny-all suppliers — **NÃO no ledger** |
| 2026-10-27 | `20261027220000_deactivate_xbz_image_uploader_cron.sql` | Desativa cron XBZ — **NÃO no ledger** |
| 2026-10-27 | `20261027230000_cleanup_get_edge_function_secret_allowlist.sql` | Limpa allowlist — **NÃO no ledger** |
| 2026-10-27 | `20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql` | Allowlist secret XBZ — **NÃO no ledger** |
| 2026-10-27 | `20261027234500_reactivate_xbz_image_uploader_cron.sql` | Reativa cron XBZ — **NÃO no ledger** |
| 2026-10-24 | `20261024190001_cron_auth_p01_image_dimensions_backfill.sql` | Cron de backfill |
| 2026-10-24 | `20261024180003_cron_schedule_p19_remaining.sql` | Cron schedules |
| 2026-10-22 | `20261022195616_fix_update_company_fields_security_definer_search_path.sql` | Security fix |
| 2026-10-22 | `20261022194000_security_revoke_external_connections_anon.sql` | Revoke anon access |
| 2026-06-10 | `20260610234919_security_fix_suppliers_anon_leak_and_rls.sql` | RLS em 11 tabelas internas |

---

## 6. Testes críticos (baseline CI)

**Fonte:** `analise-prs/baseline/test-failures.txt`, Gate Final run #40482105056

- **Baseline de testes:** Gate Final CI success em `1ce29cf2f` (2026-10-27T09:42:42Z)
- **Suite completa:** 1815 arquivos de teste (~45 min local — vitest não concluiu localmente)
- **Autoridade:** CI Gate Final run #40482105056 é o baseline oficial

**Testes corrigidos pelo PR #2633 (agora em main):**
1. `tests/config/playwright-config-smoke.test.ts` — mock `@playwright/test` incompleto
2. `src/components/products/customization/LocationPanel.tsx:367` — `window.setTimeout → globalThis.setTimeout`
3. `src/lib/auth/__tests__/safeAuthCall.test.ts:109` — `toBeGreaterThanOrEqual(20) → 15`

**Testes corrigidos pelo PR #2620 (em main):**
- `PromoFlixPlayer.test.tsx` (React 19 volumechange)
- `chunk-recovery.shared-reload-budget.test.ts`
- `replenishment-resilience.test.ts`
- `NegotiationMarkupCard.visualA11y.test.tsx.snap`

**Schema de testes:** `src/types/__tests__/quote-status-schema.test.ts`
— verifica que `QUOTE_STATUSES` tem exatamente 10 valores

---

## 7. Regras de UI críticas

### Gate 1.15 — overflow-x-clip em MainLayout
`MainLayout` deve ter `overflow-x-clip` para evitar regressão de scroll horizontal.
Gate bloqueia merge se remover.

### Gate 1.16 — Quote list invariants
Listagem de orçamentos tem invariantes de integridade verificados em CI.

### Gate 1.5 — Sem "Salvar Alterações" em rascunhos
Fluxo de rascunho de orçamento não deve expor botão "Salvar Alterações" de forma inadequada.

---

## 8. Projetos Supabase (SSOT)

| Projeto | ID | Uso | Regra |
|---------|-----|-----|-------|
| **Gold (produção)** | `doufsxqlfjyuvxuezpln` | ÚNICO projeto canônico | REGRA#1 — IMUTÁVEL |
| Proibido | `pqpdolkaeqlyzpdpbizo` | projeto descontinuado | Gate 0 recusa; REGRA#1 |

**Incidente histórico (2026-06-11):** Lovable reverteu `client.ts` 6+ vezes em 10 min
causando 401 em produção. Gate 0 detecta, mas Claude não pode remover a guarda.

---

## 9. Deploys e CI

### Fluxo de deploy (SSOT)
- **Edge functions:** somente via `workflow_dispatch` em `.github/workflows/deploy-edge-functions.yml`
- **Migrations:** somente via `workflow_dispatch` em `.github/workflows/db-apply-migration.yml`
- **Deploy app:** merge em `main` dispara Lovable/Vercel automaticamente (merge = produção)

### Vercel
- Projeto canônico: `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` (team `juca1`)
- `.vercel/project.json` versionado — NÃO deletar (REGRA#11)

### Gate Final
- Check: "Gate Final - Deploy Ready" (`.github/workflows/deploy-gates.yml`)
- Único required check em `main` — agrega todos os gates (0–6) em sequência
- Qualquer gate falhando bloqueia deploy

---

## 10. Regras de negócio de orçamento (Quote)

**Campos principais** (`src/types/quote.ts:Quote interface`):
- `quote_number`: formato `"ORC-2026-0001"` — numeração automática
- `seller_id`: FK `profiles.id` — vendedor responsável
- `status`: um dos 10 valores de `QUOTE_STATUSES` (validado por Zod)
- `shipping_type`: `'cif'` | `'fob'` | `'fob_pre'`
- `bitrix_deal_id` / `bitrix_quote_id`: integração Bitrix24 CRM
- `synced_to_bitrix`: boolean de sincronização

**Campos de desconto:**
- `discount_percent`: desconto percentual
- `discount_amount`: desconto em valor
- `subtotal` → aplica desconto → `total`

**Validade:**
- `valid_until`: ISO date — data de expiração do orçamento
- Status `'expired'` deve ser aplicado após essa data (cron ou trigger)

---

---

## 11. Dependabot — alertas high em aberto (rev70)

**Fonte:** `github_list_dependabot_alerts` (severity=high, state=open) — 2026-10-27

| Alert # | Pacote | CVE | Resumo | first_patched_version | Escopo |
|---|---|---|---|---|---|
| #69 | `extract-zip` ≤ 2.0.1 | CVE-2026-19693 | Arbitrary file write via symlink archive entries (path traversal CWE-22) | **null** (sem fix disponível) | devDependency, transitive |
| #68 | `extract-zip` ≤ 2.0.1 | CVE-2026-56876 | Unvalidated symlink path traversal em ZIP extraction | **null** (sem fix disponível) | devDependency, transitive |

**Risco:** BAIXO para produção — `extract-zip` é `devDependency` (transitive, scope: development). Não está no bundle de produção. Explorável apenas se código de desenvolvimento processar arquivos ZIP maliciosos.

**Ação:** DECISAO_HUMANA — aguardar upstream fix (`first_patched_version: null`). PR Dependabot correspondente: não criada automaticamente (sem versão fixada disponível). Dismissal possível com justificativa "tolerable risk / dev-only" — mas requer aprovação do PO (REGRA#8 corolário: segurança requer decisão humana).

---

_Gerado por session_011d8gKLZg8BWivR8aQBwxGF — rev70_
_Baseado em: src/types/*.ts, docs/03_*, docs/04_*, supabase/migrations/, CLAUDE.md, list_migrations MCP (doufsxqlfjyuvxuezpln), list_dependabot_alerts_
