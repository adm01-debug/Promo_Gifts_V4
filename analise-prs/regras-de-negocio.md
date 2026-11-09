# Regras de Negócio — Promo Brindes V4

Documento gerado a partir de código, diffs, schema e testes observados na sessão de análise de PRs.
Data: 2026-11-09 | Sessão: `claude_05/youthful-ride-vcdchy` | Main SHA: `c2bbc6be51e461ac401726b0c50aa816ff4ae40b`

---

## 1. Isolamento de Tenant (org_id / supplier_id)

**Fonte:** RLS policies em produção (`doufsxqlfjyuvxuezpln`), PRs #3257, #3261, #3273.

- Toda tabela multi-tenant possui `org_id` (ou `supplier_id` no contexto de supply).
- RLS habilitado em todas as tabelas expostas via PostgREST; `anon` nunca enxerga dados de outro tenant.
- Gate 1.13 (CI) valida que nenhuma tabela com RLS tem zero policies (deny-all silencioso).
- Gate 1.13.2 valida que 7 tabelas com INSERT anônimo têm trigger de rate guard.
- PR #3257: migrations de idempotência em RLS deny-all e partições — reforço de que RLS é gate de segurança, não conveniência.
- PR #3261: arquivos espelho DRIFT CRON-001 — cron jobs também seguem o fluxo de migration.

## 2. Precificação de Produto

**Fonte:** `src/types/product-catalog.ts` (REGRA #2 CLAUDE.md), histórico de incidentes.

```typescript
price: number       // preço original — obrigatório
sale_price?: number // preço de venda — opcional
```

- Ambos os campos DEVEM existir no tipo `Product`. Remover `price` ou `sale_price` é proibido (REGRA #2).
- `price` é o preço base; `sale_price` é o preço promocional. A UI exibe `sale_price` se presente.
- Incidente 2026-06-11: commit `f22e1e2` removeu esses campos durante merge — levou 3 commits para restaurar.
- Validação automática: Gate 1.1 (CI) verifica presença dos campos críticos do tipo `Product`.

## 3. Kit Builder — Fluxo de Validação Pré-Orçamento

**Fonte:** `src/pages/kit-builder/useKitBuilderQuote.ts`, PRs #3269, #3270, #3272, #3252, #3253, #3276, #3277.

Ordem de validações antes de criar o orçamento (dentro do bloco `!serverConfirmedCommit`):

1. **Preços** (`validateKitPricesForQuote` — `useKitPriceValidation.ts`)
   - Verifica se todos os itens têm preço válido no momento da criação
   
2. **Quantidade mínima** (`validateKitMinQuantityForQuote` — `useKitMinQuantityValidation.ts`) — FT-079
   - Consulta `vw_products_min_quantity` para cada produto do kit
   - Regra: `item.quantity × kitQuantity >= effective_min_quantity`
   - Fail-closed em erro de DB (bloqueia com mensagem clara)
   - Fail-open quando `effectiveMin <= 1` (produto sem mínimo não bloqueia)
   - Fonte: PR #3269 (`claude/feat-ft079-front-min-quantity-261108-2340`)

3. **Estoque** (`validateKitStockForQuote` — `useKitStockValidation.ts`)
   - Verifica estoque disponível para cada item do kit

4. **Volume/encaixe** (`validateKitFitsForQuote` — `useKitFitsValidation.ts`) — FT-088
   - Chama `fn_check_item_fits(p_packaging_id, p_product_id, p_current_used_liters)` sequencialmente
   - Bloqueia apenas quando `fits === false` (explícito)
   - Fail-open em erro de RPC (erros individuais → `continue`)
   - Retorna `'skipped'` quando não há caixa selecionada
   - Fonte: PR #3270 (`claude/feat-ft088-front-fits-261108-2300`)

**Invariante:** O bloco de validação só executa quando `!serverConfirmedCommit` — não re-valida retry de orçamento já confirmado (idempotência).

## 4. Kit Builder — Navegação por Etapas

**Fonte:** PRs #3272, #3276, #3277, #3292.

- Fluxo de etapas: Produtos → Embalagem → Personalização → Resumo → Orçamento
- **FT-122** (PR #3292): guard em `goToStep` — impede navegar para etapa não completada (draft).
- **PR #3276**: confetti só na transição válido; botão "Cancelar Substituição" corrigido.
- **PR #3272**: conecta `isConflictError` e `consumeUnloadBackup` — tratamento de conflito de estado.
- `useKitBuilderPageState.ts` é god-node do estado de navegação — #3276 e #3277 tocam esse arquivo.

## 5. SSOT Supabase (Projeto Gold)

**Fonte:** REGRA #1 CLAUDE.md, `src/integrations/supabase/client.ts`.

```
CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'  // IMUTÁVEL
```

- O projeto `pqpdolkaeqlyzpdpbizo` é proibido em qualquer código executável.
- Gate 0 (CI): `validate-supabase-config.mjs` falha se o ID canônico não estiver presente.
- O Lovable reverte este arquivo silenciosamente — Gate 0 detecta isso.

## 6. Migrations — Fluxo Único Autorizado

**Fonte:** REGRA #8/E15 CLAUDE.md, PRs #3257, #3261, #3264, #3265, #3273.

- Migrations em produção **só** via `workflow_dispatch` em `.github/workflows/db-apply-migration.yml`.
- `execute_sql` com DDL é **proibido** em sessões de agente (E056).
- Migrations devem ser: aditivas, idempotentes, sem DROP/RENAME/ALTER TYPE/DELETE em massa.
- PRs com `CREATE INDEX CONCURRENTLY` via migration espelho: REGRA#8 → DECISAO_HUMANA (aprovação PO).
- Arquivos espelho DRIFT: reconciliam DDL aplicada fora do fluxo — precisam de PR (não push direto).

## 7. CI/Workflows — Regras de Escrita

**Fonte:** REGRA CI CLAUDE.md, PRs #3129, #3137, #3127, #3274, #3275.

- **Proibido** tocar `.github/workflows/` sem aprovação explícita do PO.
- Gate Final (`deploy-gates.yml`) é o único check required em `main`.
- PRs que tocam `.github/workflows/` → veredito **DECISAO_HUMANA** automaticamente.
- Exceção: PRs docs-only sob `docs/**` têm bypass E14/E197 (Gate Final não dispara).
- Arquivos na raiz (ex.: `PENDENCIAS.md`, `CHANGELOG.md`) **não** recebem bypass — disparam CI normalmente.

## 8. Arquitetura Bronze → Silver → Gold

**Fonte:** CLAUDE.md, PRs de migration, cron jobs.

- **Bronze:** ingestão bruta (webhooks, imports externos) → `*_raw` tables.
- **Silver:** limpeza e enriquecimento → views materializadas, `*_clean` tables.
- **Gold:** `doufsxqlfjyuvxuezpln` — produto final, queries de front, orçamentos.
- Cron jobs (`process_scheduled_reports`, `send_scheduled_reports`) gerenciam o pipeline periódico.
- PR #3263: versiona migrations de cron jobs `process/send-scheduled-reports` (FT-074).

## 9. Orçamentos e Carrinhos

**Fonte:** PRs #3253, #3272, Gate 5.5.

- Gate 5.5: RPC `restore_seller_cart` deve existir no projeto canônico.
- PR #3253: corrige arredondamento de ponto flutuante em `calculateTotalKitPrice` — preço total do kit deve ser valor monetário preciso (não float IEEE 754).
- `consumeUnloadBackup` (PR #3272): backup do estado do kit no `beforeunload` deve ser consumido corretamente ao retornar à página.

## 10. SINGU — Fora do Escopo

**Fonte:** Regras da sessão de análise.

- Sistema SINGU (externo) é READ-ONLY nesta análise.
- PRs que escrevem no SINGU não são mergeadas autonomamente.
