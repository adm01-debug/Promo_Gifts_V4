# Regras de Negócio — Promo Gifts V4
> Fonte de verdade extraída do codebase em 2026-11-08. Cada regra cita arquivo:linha ou saída de comando.

---

## 1. Projeto Supabase canônico (REGRA#1)

- **SSOT:** `doufsxqlfjyuvxuezpln` (Gold/Medallion — camadas v_products_public, v_variant_sale_prices_public, v_product_images_cdn)
- Fonte: `src/integrations/supabase/client.ts:24` → `const CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln";`
- **PROIBIDO alterar** `CURRENT_PROJECT_ID` ou remover `validateEnv()` — Gate 0 do CI requer ambos
- Fonte: `src/integrations/supabase/client.ts:11-18` (comentário SSOT + aviso ao Claude Code)
- Projetos proibidos: `pqpdolkaeqlyzpdpbizo` (Lovable Cloud vazio), `hncgwjbzdajfdgtqgefe`, `supabase.atomicabr.com.br`
- Fonte: `src/integrations/supabase/client.ts:21-23`

---

## 2. Tipo `Product` — campos obrigatórios (REGRA#2)

Arquivo: `src/types/product-catalog.ts` — interface `Product` (linha 25)

| Campo | Tipo | Obrigatoriedade | Linha |
|---|---|---|---|
| `id` | `string` | obrigatório | 26 |
| `name` | `string` | obrigatório | 27 |
| `shortDescription` | `string` | obrigatório | 30 |
| `price` | `number` | obrigatório (crítico REGRA#2) | 31 |
| `sale_price` | `number \| undefined` | opcional (crítico REGRA#2) | 32 |
| `category_id` | `string \| null \| undefined` | opcional (crítico REGRA#2) | 35 |
| `category_name` | `string \| null \| undefined` | opcional (crítico REGRA#2) | 36 |
| `images` | `string[]` | obrigatório | 52 |
| `sku` | `string` | obrigatório | 53 |
| `stock` | `number` | obrigatório | 54 |
| `colors` | `ProductColor[]` | obrigatório | 57 |
| `materials` | `string[]` | obrigatório | 58 |
| `minQuantity` | `number` | obrigatório | 62 |
| `stockStatus` | `'in-stock' \| 'low-stock' \| 'out-of-stock'` | obrigatório | 90 |
| `featured` | `boolean` | obrigatório | 91 |
| `newArrival` | `boolean` | obrigatório | 92 |
| `onSale` | `boolean` | obrigatório | 93 |
| `isKit` | `boolean` | obrigatório | 94 |
| `category` | `{ id: number \| string; name: string }` | obrigatório | 96 |
| `supplier` | `{ id: string; name: string }` | obrigatório | 97 |
| `tags` | objeto estruturado | obrigatório | 98-104 |

**Regra crítica:** remover `price`, `sale_price`, `shortDescription`, `category_id`, `category_name` quebra o merge em produção — commit `f22e1e2` (2026-06-11) demonstrou isso.

---

## 3. Tabelas principais no schema público

Verificado via `src/integrations/supabase/types.ts` (1178 entidades totais no schema public).

**Tabelas essenciais** (Gate 1.2 / REGRA#4 verifica existência de todas):

| Tabela | Linha types.ts |
|---|---|
| `products` | 31801 |
| `product_variants` | 30601 |
| `suppliers` | 41371 |
| `supplier_products_raw` | 39929 |
| `magazines` | 12243 |
| `magazine_items` | 11693 |
| `magazine_templates` | 12153 |
| `personalization_techniques` | 16636 |
| `categories` | 2983 |
| `quotes` | 35673 |
| `quote_items` | 34777 |
| `orders` | 15531 |
| `order_items` | 15159 |
| `stock_snapshots` | 38214 |
| `cart_templates` | 2929 |

---

## 4. Enums disponíveis

Fonte: `src/integrations/supabase/types.ts:64488-64548` (schema public)

| Enum | Valores |
|---|---|
| `app_role` | `dev`, `supervisor`, `admin`, `manager`, `agente`, `coordenador`, `vendedor` |
| `categoria_cor_enum` | `pantone`, `basica`, `institucional`, `especial`, `bordado`, `hot_stamping`, `serigrafia`, `sublimacao` |
| `familia_cor_enum` | `amarelo`, `laranja`, `vermelho`, `coral`, `rosa`, `magenta`, `roxo`, `lilas`, `azul`, `ciano`, `verde`, `marrom`, `bege`, `neutro`, `metalico` |
| `magazine_status` | `draft`, `published`, `archived` |
| `magazine_reaction_kind` | `like`, `love`, `fire`, `idea` |
| `org_role` | `owner`, `admin`, `member` |
| `payment_status` | `pending`, `authorized`, `captured`, `refunded`, `failed` |
| `produtos_padronizacao_status` | `pending`, `standardized`, `rejected`, `promoted` |

**QuoteStatus** (FE SSOT — `src/types/quote.ts:10-21`):
`approved`, `cancelled`, `converted`, `draft`, `expired`, `pending`, `pending_approval`, `rejected`, `sent`, `viewed`
> Nota: Os 10 status coincidem com CHECK `valid_quote_status` do banco (verificado 2026-06-25) — src/types/quote.ts:7

---

## 5. Regras de migração (E15/E8)

**Único caminho autorizado para aplicar migration em `doufsxqlfjyuvxuezpln`:**
`.github/workflows/db-apply-migration.yml` via `workflow_dispatch(version)`

**Fluxo obrigatório (E15):**
1. `scripts/preflight-migration-apply.mjs` — preflight read-only
2. `psql -1` gated por `environment: production`
3. `migration repair --status applied`
4. Post-check
5. Recibo em `supabase/MIGRATIONS_SYNC_LOG.md` (via PR, nunca push direto em main)

**Proibido:**
- `supabase db push` (REGRA#1 §7)
- `execute_sql` com DDL em sessão de agente (E056 — `src/integrations/supabase/client.ts` comentário; CLAUDE.md §REGRA#8)
- Executar `supabase migration squash --linked` (apaga ledger)
- `supabase migration repair --status applied` **sem versão explícita** (trunca schema_migrations)

**Migration mais recente:** `20261101220000_cron001_stagger_schedules.sql` — escala schedules de cron jobs para evitar timeout de startup.

---

## 6. Testes com contrato (baseline)

Arquivo: `src/components/ui/__tests__/calendar.redesign.test.tsx`

| # | Nome do teste | Linha | Status baseline |
|---|---|---|---|
| 1 | `renderiza mês pt-BR capitalizado em duas linhas ("Julho" + "2026")` | 24 | PASS |
| 2 | `caption tem text-[15px] + font-bold + tracking-tight` | 31 | PASS |
| 3 | `weekday cells: 7 células com 1 letra (D/S/T/Q/Q/S/S)` | 40 | PASS |
| 4 | `domingo recebe modificador text-destructive` | 50 | PASS |
| **5** | **`day_today destaca o dia atual em vermelho`** | **56** | **FAIL (baseline)** |
| **6** | **`day_selected: bg-destructive + text-primary-foreground`** | **66** | **FAIL (baseline)** |
| 7 | `day_outside é oculto (invisible + pointer-events-none)` | 75 | PASS |
| 8 | `sem cores hard-coded (bg-white/black/text-white) em nenhum nó` | 86 | PASS |
| 9 | `fuzz: 50 renders em meses diferentes mantêm caption única e válida` | 97 | PASS |

**Resultado baseline (run real 2026-11-08):**
- `Test Files 1 failed (1); Tests 2 failed | 7 passed (9); Duration 1.79s; EXIT_CODE=0`
- Suite completa excede 240s (OOM); baseline gerado rodando: `npx vitest run src/components/ui/__tests__/calendar.redesign.test.tsx`

---

## 7. Páginas/rotas da aplicação

Fonte: `ls src/pages/` (run 2026-11-08)

| Domínio | Páginas/subpastas |
|---|---|
| Core | `Index.tsx`, `NotFound.tsx` |
| Auth | `auth/` |
| Produtos | `products/` |
| Catálogo/filtros | `filters/`, `advanced-price-search/` |
| Orçamentos | `quotes/` |
| Clientes | `clients/` |
| Magazine | `magazine/` |
| Kit builder | `kit-builder/` |
| Admin | `admin/` |
| BI | `bi/` |
| Mockups | `mockups/` |
| Simulação | `Simulation.tsx` |
| Coleções | `collections/` |
| Ferramentas | `tools/`, `dev/`, `system/`, `magic-up/`, `PromoFlixPlayground.tsx` |
| QA | `QAPage.tsx`, `SidebarQAPage.tsx` |
| Dashboard | `CustomizableDashboard.tsx` |

---

## 8. Políticas RLS relevantes

Fonte: `grep -r "RLS\|GRANT\|CREATE POLICY\|anon" supabase/migrations/`

**Migrações de RLS chave:**

| Migration | Ação | Arquivo |
|---|---|---|
| `20260610122930` | GRANT EXECUTE ON FUNCTION para `anon` (família de vídeo) | `grant_anon_video_function_family_v2.sql` |
| `20260717120020` | ENABLE RLS em todas tabelas public + REVOKE EXECUTE anon em 9 funções catalog SECURITY DEFINER | `dynamic_enable_rls_and_revoke_anon_catalog_functions.sql` |

**Regra geral (Gate 1.13 / Gate 1.13.1 / Gate 1.13.2):**
- RLS habilitada em todas as tabelas `public`
- Tabelas com RLS habilitada e zero policies → deny-all silencioso → bloqueado pelo Gate 1.13.1
- 7 tabelas com INSERT anônimo têm trigger de rate guard (Gate 1.13.2 / E049)
- Auditoria de anon-catalog grant: tabela `anon_catalog_grant_audit_log` (types.ts:1495)

**Corolário E056:** `execute_sql` com DDL (CREATE, ALTER, DROP, GRANT, REVOKE, CREATE POLICY) é **proibido em sessão de agente** mesmo que o PO solicite. Toda mudança de schema nasce como migration SQL no mesmo PR.
