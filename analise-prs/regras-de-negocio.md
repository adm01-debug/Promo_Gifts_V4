# Regras de Negócio — Promo Gifts V4

**Gerado por:** session_01RfQzo8Ean3zudG2sEN79b6  
**Data:** 2026-10-29  
**Fontes:** tipos TS, testes unitários, migrations, RLS policies, CLAUDE.md, docs/

---

## 1. Produto (`Product`)

**Fonte:** `src/types/product-catalog.ts`, `src/components/admin/products/ProductFormSchema.ts`

### Campos obrigatórios (invariantes)
| Campo | Tipo | Regra | Fonte |
|---|---|---|---|
| `id` | `string` | obrigatório | `product-catalog.ts:8` |
| `name` | `string` | 1–300 chars | `ProductFormSchema.ts:7` |
| `sku` | `string` | 1–50 chars, obrigatório | `ProductFormSchema.ts:6` |
| `shortDescription` | `string` | obrigatório (REGRA #2) | `product-catalog.ts:20` |
| `price` | `number` | obrigatório (REGRA #2) | `product-catalog.ts:21` |
| `sale_price` | `number?` | opcional, ≥ 0 (REGRA #2) | `product-catalog.ts:22` |
| `category_id` | `string?` | opcional (REGRA #2) | `product-catalog.ts:25` |
| `category_name` | `string?` | opcional (REGRA #2) | `product-catalog.ts:26` |
| `stock` | `number` | obrigatório | `product-catalog.ts:56` |
| `colors` | `ProductColor[]` | obrigatório | `product-catalog.ts:62` |
| `materials` | `string[]` | obrigatório | `product-catalog.ts:63` |
| `minQuantity` | `number` | ≥ 1 | `ProductFormSchema.ts:22` |
| `supplier_id` | `string` | obrigatório | `ProductFormSchema.ts:14` |

### Status de estoque
- `stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock'` — obrigatório, derivado de `stock`
- **Fonte:** `product-catalog.ts:74`

### Flags de marketing
- `featured`, `newArrival`, `onSale`, `isKit` — booleanos obrigatórios
- Flags com expiração: `is_featured_expires_at`, `is_new_expires_at`, `is_on_sale_expires_at`, `is_bestseller_expires_at` (null = sem limite)
- **Fonte:** `ProductFormSchema.ts:59–67`

### Contexto de embalagem
- `packagingContext: 'always' | 'with_customization' | 'without_customization' | null`
- **Fonte:** `product-catalog.ts:90`

### Validade de preço
- `price_freshness_threshold_days`: int, 1–365 dias, default 60
- Após expirar, o sistema avisa o vendedor que o preço pode estar desatualizado
- **Fonte:** `ProductFormSchema.ts:27`

---

## 2. Orçamento (`Quote`)

**Fonte:** `src/types/quote.ts`, `src/types/__tests__/quote-status-schema.test.ts`

### Status canônicos (SSOT)
Exatamente **10 status** definidos como tupla imutável:
```
approved, cancelled, converted, draft, expired,
pending, pending_approval, rejected, sent, viewed
```
- Coincide com CHECK `valid_quote_status` no banco (verificado 2026-06-25)
- Validação via Zod: `quoteStatusSchema.safeParse()` — case-sensitive, sem espaços
- **Fonte:** `quote.ts:3–18`, `quote-status-schema.test.ts:12–23`

### Formato do número
- `quote_number`: string formato "ORC-2026-0001" (gerado pelo banco)
- **Fonte:** `quote.ts:35`

### Frete
- `shipping_type`: `'cif'` (cortesia) | `'fob'` (cliente paga) | `'fob_pre'` (pré-negociado com custo)
- **Fonte:** `quote.ts:51`

### Resposta do cliente
- `client_response: 'approved' | 'changes_requested' | 'rejected' | null`
- **Fonte:** `quote.ts:30`

---

## 3. Personalização (Técnica de Gravação)

**Fonte:** `src/types/domain/personalization.ts`, `src/types/gravacao.ts`

### Categorias de técnica
```
'digital' | 'engraving' | 'impression' | 'other' | 'textile' | 'transfer'
```
- **Fonte:** `personalization.ts:56`

### Configuração de cores
- `colorConfig.required: boolean` — se a técnica exige seleção de cor
- `colorConfig.min/max: number` — limites de cores
- `colorConfig.priceByColor: boolean` — se há acréscimo por cor adicional
- `colorConfig.extraColorPrice: number` — custo unitário de cor extra
- **Fonte:** `personalization.ts:18–23`

### Configuração de área
- `areaConfig.priceByArea: boolean` — precificação por área (cm²)
- `areaConfig.priceByStitches: boolean` — precificação por pontos (bordado)
- `areaConfig.minAreaCm2 / maxAreaCm2: number | null`
- `areaConfig.maxStitches: number | null`
- **Fonte:** `personalization.ts:26–31`

### Custos base
- `costs.setup: number` — custo de setup/gravação
- `costs.handling: number` — manuseio
- `costs.multiplier: number` — multiplicador de custo
- **Fonte:** `personalization.ts:34–38`

---

## 4. Organização e Multi-tenancy

**Fonte:** `src/types/infrastructure/promobrind.ts`, `src/types/magazine.ts`

- Toda entidade de dados pertence a uma `organization_id`
- Magazines possuem `organizationId: string | null`
- RLS policies isolam dados por organização (ver docs `04_EXPLICACAO_DAS_POLICIES.md`)

---

## 5. Banco de Dados Canônico (SSOT)

**Fonte:** `CLAUDE.md §REGRA #1`

- **Projeto canônico:** `doufsxqlfjyuvxuezpln` (Gold/Medallion, produção)
- **Projeto proibido (SINGU):** `pqpdolkaeqlyzpdpbizo` — READ-ONLY, nunca recebe escritas de agente
- `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts` **imutável**
- Lovable reverte este campo silenciosamente; Gate 0 detecta

---

## 6. Arquitetura Medallion

**Fonte:** `CLAUDE.md §CONTEXTO`, `docs/03_ARQUITETURA_DO_SISTEMA.md`

- **Bronze:** dados brutos de fornecedores (tabelas `*_raw`, `supplier_products_raw`)
- **Silver:** dados normalizados (tabelas `products`, `product_variants`)
- **Gold:** dados enriquecidos para UI (`products` com scores, imagens processadas)
- **Tabelas críticas que devem existir:** `personalization_techniques`, `products`, `product_variants`, `suppliers`, `supplier_products_raw`, `magazines`, `magazine_items`, `magazine_templates`

---

## 7. Migrations e DDL

**Fonte:** `CLAUDE.md §REGRA #8`, `docs/db/POLITICA_DDL.md`

- DDL **nunca** aplicada via `execute_sql` (MCP/dashboard) sem migration espelho
- Único caminho autorizado: `.github/workflows/db-apply-migration.yml` (`workflow_dispatch`)
- Toda migration nova: arquivo `.sql` em `supabase/migrations/` com timestamp + `migration repair --status applied <version>`
- **`supabase db push` proibido** (REGRA #8/C19)

### Migrations recentes relevantes
| Arquivo | Data | Escopo |
|---|---|---|
| `20261027200000_supplier_stricker_rls_deny_all.sql` | 2026-10-27 | RLS deny-all para supplier Stricker |
| `20261027120000_fix_connections_auto_test_cron_secret.sql` | 2026-10-27 | cron secret idempotente (PR #2688) |
| `20261024163500_fix_audit_security_definer_acl_regrole_cast.sql` | 2026-10-24 | correção security definer |
| `20261022194000_security_revoke_external_connections_anon.sql` | 2026-10-22 | revoga acesso anônimo a conexões externas |

---

## 8. Gates de CI (quality gates obrigatórios)

**Fonte:** `CLAUDE.md §CI — ESTRUTURA DE GATES`, `.github/workflows/deploy-gates.yml`

| Gate | O que testa |
|---|---|
| Gate 0 | SSOT: `doufsxqlfjyuvxuezpln` presente em `client.ts` |
| Gate 1 | ESLint + TypeScript sem erro |
| Gate 1.1 | Campos críticos `Product` (price, sale_price, shortDescription, category_id, category_name) |
| Gate 1.2 | Drift estrutural de `types.ts` (nenhuma tabela/view/enum sumiu sem allowlist) |
| Gate 1.11 | Contratos de workflow C10–C26 (inclui C25: autenticação E2E em kit-coverage) |
| Gate 2 | Vitest — testes unitários |
| Gate 3 | E2E Smoke (Playwright, chromium) |
| Gate Final | Agrega todos os gates — único check required no `main` |

---

## 9. Regras de Deploy

**Fonte:** `CLAUDE.md §REGRA #8`, `CLAUDE.md §REGRA #9`, `CLAUDE.md §REGRA #11`

- **Edge functions:** deploy exclusivo via `.github/workflows/deploy-edge-functions.yml`
- **Vercel:** projeto canônico `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` (team `juca1`); `vercel link` proibido fora do raiz
- **Merge em main = produção automática** (Vercel auto-deploy)
- Toda sessão que cria commit de governança (workflows, gates, migrations) deve fazer `git push` + abrir PR

---

## 10. Segurança e RLS

**Fonte:** `docs/04_EXPLICACAO_DAS_POLICIES.md`, migrations de security, `CLAUDE.md §Gate 1.13`

- RLS habilitada em todas as tabelas com dados de usuário
- Gate 1.13.1: alerta se tabela tem RLS habilitada e **zero políticas** (deny-all silencioso)
- Gate 1.13.2: 7 tabelas com INSERT anônimo devem ter trigger de rate guard
- Policies de segurança: `anon` não pode INSERT em `external_connections`, `mockup_approval_links`, `mcp_kv` (migrations 20261022*)
- `security definer` + `search_path` fixo em todas as funções críticas (migration 20261024*)

---

*Fontes verificadas em commit HEAD do branch `claude/eloquent-ramanujan-0yt2fo` (2026-10-29)*
