# Regras de Negócio — Promo Gifts V4
# Construído a partir de fontes reais (não de memória)
# Última atualização: 2026-10-28 | Sessão: https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo

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

- **Required checks em `main` (3):** "Gate Final - Deploy Ready" e "Gate E23 - Secret Scan (gitleaks)" em `deploy-gates.yml`, e "Analyze (javascript-typescript)" em `codeql.yml` — lista em `.github/required-checks.json`
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

---

## Procedência — seções recuperadas de duas branches encerradas

As seções 12–18 vêm do arquivo `analise-prs/regras-de-negocio.md` de duas branches que foram
fechadas: `claude_05/youthful-ride-vcdchy` (tip 2026-11-09) e `claude_pink/sleepy-cannon-h000nc`
(tip 2026-11-10). Cada afirmação abaixo foi reconferida contra o código da `main` e contra o banco
canônico (leitura) em 17/11/2026. O que não teve prova está em "Não reconfirmado", no fim.

## 12. Isolamento de Tenant e RLS

- O escopo de tenant no schema `public` é `supplier_id` (80 colunas; 7 policies o referenciam) — verificado em produção por `information_schema.columns` / `pg_policies` em 17/11/2026.
- Gate 1.13 compara `.security/policies-baseline.json` com `pg_policies` ao vivo (`--require-live`); fork e Dependabot rodam só a checagem estática — `.github/workflows/deploy-gates.yml:357`
- Gate 1.13.1 reprova tabela com RLS ligada e zero policies que não esteja na allowlist de deny-all declarado — `.github/workflows/deploy-gates.yml:368`
- Gate 1.13.2 exige trigger de rate guard nas 7 tabelas com INSERT anônimo (`analytics_events`, `catalog_analytics`, `product_views`, `search_analytics`, `frontend_telemetry`, `kill_switch_hits`, `password_reset_requests`) — `.github/workflows/deploy-gates.yml:379`

## 13. Kit Builder — Validação Pré-Orçamento

- Todas as validações rodam dentro de `if (!serverConfirmedCommit)`: orçamento já confirmado no servidor não é revalidado no retry — `src/pages/kit-builder/useKitBuilderQuote.ts:369`
- Ordem fixa: preços → quantidade mínima → estoque → volume/encaixe — `src/pages/kit-builder/useKitBuilderQuote.ts:370`, `src/pages/kit-builder/useKitBuilderQuote.ts:382`, `src/pages/kit-builder/useKitBuilderQuote.ts:397`, `src/pages/kit-builder/useKitBuilderQuote.ts:409`
- A mínima lê a view `vw_products_min_quantity` — `src/hooks/kit-builder/useKitMinQuantityValidation.ts:30`
- Regra: `item.quantity × kitQuantity` precisa ser ≥ `effective_min_quantity` — `src/hooks/kit-builder/useKitMinQuantityValidation.ts:45-46`
- Produto com `effectiveMin <= 1` nunca bloqueia (fail-open) — `src/hooks/kit-builder/useKitMinQuantityValidation.ts:44`
- Erro de banco na mínima é fail-closed: status `unavailable` e nenhum orçamento criado — `src/hooks/kit-builder/useKitMinQuantityValidation.ts:33` e `src/pages/kit-builder/useKitBuilderQuote.ts:383`
- O encaixe chama `fn_check_item_fits(p_packaging_id, p_product_id, p_current_used_liters)` item por item, acumulando litros — `src/hooks/kit-builder/useKitFitsValidation.ts:42` (assinatura confirmada em produção via `pg_proc`)
- Só bloqueia com `fits === false` explícito; `fits = null` (produto sem dimensão) passa — `src/hooks/kit-builder/useKitFitsValidation.ts:53`
- Erro de RPC em um item é fail-open (`continue`) — `src/hooks/kit-builder/useKitFitsValidation.ts:70`
- Sem embalagem selecionada o encaixe retorna `skipped` — `src/hooks/kit-builder/useKitFitsValidation.ts:34`

## 14. Kit Builder — Navegação por Etapas

- São 4 etapas: `box`, `items`, `personalization`, `summary` — `src/lib/kit-builder/types.ts:228`
- Duas ordens, conforme o fluxo: `items-first` = items → box → personalization → summary; o outro = box → items → personalization → summary — `src/hooks/kit-builder/useKitBuilder.ts:443-445`
- `goToStep` só aceita a etapa atual ou uma já concluída (`completedSteps`) — `src/hooks/kit-builder/useKitBuilder.ts:433-437`
- O backup de `beforeunload` é consumido ao reentrar na página — `src/hooks/kit-builder/useKitAutoSave.ts:395` e `src/pages/kit-builder/KitBuilderPage.tsx:67`

## 15. Precificação de Produto

- `Product` mantém `price: number` obrigatório e `sale_price?: number` opcional — `src/types/product-catalog.ts:31-32`
- Gate 1.1 bloqueia a remoção desses campos; o motivo está registrado no próprio script (Lovable renomeou `price`→`sale_price` em 2026-06-11 e causou 400 em produção) — `scripts/check-product-type-fields.mjs:35-43` e `.github/workflows/deploy-gates.yml:237`
- `calculateTotalKitPrice` arredonda subtotal, total e preço unitário a 2 casas (`Math.round(x*100)/100`), evitando resíduo de float — `src/lib/kit-builder/price-calculator.ts:95-97`

## 16. Orçamentos e Carrinhos

- A restauração do carrinho do vendedor é atômica, via RPC `restore_seller_cart` — `src/hooks/products/useSellerCarts.helpers.ts:342` (a função existe no canônico, confirmada via `pg_proc`)
- A RPC é deliberadamente invisível para `anon`; o Gate 5.5 confere a assinatura publicada usando service_role — `.github/workflows/deploy-gates.yml:735`

## 17. Produtos e Pedido Mínimo

- Soft-delete: `deleted_at IS NULL` = registro ativo — `src/hooks/crm/useCrmCompanies.ts:39`; a coluna `products.deleted_at` existe no canônico.
- `vw_products_min_quantity` existe em produção e expõe `category_min`, `product_override`, `effective_min_quantity` e `min_quantity_source` — mínimo por produto com fallback por categoria (verificado em 17/11/2026).

## 18. Gates de CI reconfirmados

- Nomes e linhas em `.github/workflows/deploy-gates.yml`: Gate 0 SSOT (`.github/workflows/deploy-gates.yml:142`), Gate 0.5 npm audit (`.github/workflows/deploy-gates.yml:160`), Gate 1 Lint+TypeScript (`.github/workflows/deploy-gates.yml:198`), Gate 1.6 bundle size (`.github/workflows/deploy-gates.yml:797`), Gate 1.9 ratchets (`.github/workflows/deploy-gates.yml:322`), Gate 1.9.1 console baseline (`.github/workflows/deploy-gates.yml:332`), Gate 1.10 indexed-access (`.github/workflows/deploy-gates.yml:400`), Gate 1.14 inventário de segredos (`.github/workflows/deploy-gates.yml:415`), Gate 2 vitest (`.github/workflows/deploy-gates.yml:513`), Gate 3 E2E smoke (`.github/workflows/deploy-gates.yml:591`), Gate 6 build (`.github/workflows/deploy-gates.yml:759`).
- `main` exige 3 checks required, não um: `Gate Final - Deploy Ready`, `Analyze (javascript-typescript)` e `Gate E23 - Secret Scan (gitleaks)` — `.github/required-checks.json:10-20`
- `TEST_ADMIN_PASSWORD`, `TEST_SELLER_PASSWORD`, `SMOKE_HEALTH_FN_URL` e `vars.SMOKE_BASE_URL` estão no inventário lido pelo Gate 1.14 — `docs/ci/SEGREDOS.md:52-54` e `docs/ci/SEGREDOS.md:125`
- As migrations espelho CRON-001 existem na main: `supabase/migrations/20261101223908_cron001_stagger_additional_jobs.sql` e `supabase/migrations/20261101232022_cron001_stagger_schedules_reapply.sql`

### Não reconfirmado

- **`org_id` como chave de tenant** — não existe coluna `org_id` em `public` hoje; o escopo é `supplier_id` (§12).
- **Etapa "Orçamento" no wizard do Kit Builder** — `KitBuilderStep` tem 4 valores e nenhum é orçamento; o orçamento parte de `summary`.
- **"Gate Final é o único check required em `main`"** — hoje são 3 (§18).
- **"Bypass docs-only vale só para `docs/**`; arquivos na raiz disparam CI"** — o bypass vem da ausência do filtro `code:`, logo um PR que só toca `PENDENCIAS.md` fica docs-only — `.github/workflows/deploy-gates.yml:96-121`
- **Arquitetura Bronze → Silver → Gold com tabelas `*_raw`/`*_clean`** — não há schema `bronze`/`silver`/`gold` nem tabela `*_clean` no canônico (só 4 tabelas `*_raw`); o rótulo não corresponde a estrutura no banco.
- **Cron `process_scheduled_reports` / `send_scheduled_reports`** — existem com hífen: `process-scheduled-reports` e `send-scheduled-reports`.
- **"8321 produtos ativos"** — número instantâneo: 8360 em 17/11/2026.
- **SINGU fora do escopo, regras de merge autônomo, Dependabot #3327–#3334, OOM do hook `scripts/check-eslint-baseline.mjs`** — regras de sessão ou estado de PRs já encerradas, sem prova no código de hoje; a parte de governança já está em `AGENTS.md`.
