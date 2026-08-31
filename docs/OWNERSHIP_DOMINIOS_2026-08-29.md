# Ownership por Domínio — v0.1 RASCUNHO (2026-08-29)

> **Status: RASCUNHO — aguardando `[VALIDAÇÃO PO]`** (nomes reais) e **`[AUTORIZAÇÃO GITHUB]`**
> (aplicar mudanças ao `.github/CODEOWNERS`).
> **Etapa do plano:** 003 (P0).
> **Regra de concordância:** `CODEOWNERS` e este mapa devem convergir. Drift entre os dois é
> defeito de governança e bloqueia a conclusão da etapa.

## 1. Estado atual (evidência)

- `.github/CODEOWNERS` protege hoje **apenas** arquivos críticos (SSOT Supabase, scripts,
  `.env*`, workflows, Edge Functions com correção de segurança manual) — todos com
  `@adm01-debug` como owner único.
- Não há owners formais para domínios de produto (catálogo, orçamento, estoque, kits,
  revistas, integrações).
- A v0.2 da matriz de fluxos tem **owner TBD em 11 dos 12 fluxos** (exceção: Magazine,
  "Promo Brindes Engineering", a confirmar).

## 2. Domínios propostos e owners (a nomear pelo PO)

| Domínio | Escopo (paths principais) | Owner proposto | Backup | Base/evidência |
|---|---|---|---|---|
| UI / design system | `src/components/ui/`, `src/index.css`, tokens semânticos | TBD | TBD | Baseline visual `BASELINE_VISUAL_FLUXOS_CRITICOS_2026-08-26.md` |
| Catálogo + Produto | `src/pages/products/`, `src/hooks/products/`, `productService` | TBD | TBD | Matriz v0.2 fluxos 1–2 |
| Busca | `src/components/search/`, `src/pages/advanced-price-search/`, `src/hooks/products/useProductMatch.ts` | TBD | TBD | Matriz v0.2 fluxo 3 |
| Carrinho | `src/pages/products/seller-carts/`, `useSellerCarts*` | TBD | TBD | Matriz v0.2 fluxo 4 |
| Orçamento + Desconto | `src/pages/quotes/`, `src/hooks/quotes/`, `discount_approval_*` | TBD | TBD | Matriz v0.2 fluxos 5–6 |
| Estoque | `src/hooks/stock/`, `src/components/inventory/`, `StockDashboard*` | TBD | TBD | Matriz v0.2 fluxo 7 |
| Kits | `src/pages/kit-builder/`, `src/hooks/kit-builder/`, `src/components/kit-builder/` | TBD | TBD | Matriz v0.2 fluxo 10 (lacunas confirmadas) |
| Revistas | `src/pages/magazine/`, `src/services/magazineService.ts`, Edge `magazine-*` | Promo Brindes Engineering (confirmar) | TBD | Matriz v0.2 fluxo 9 |
| Autenticação + RBAC | `src/pages/auth/`, `src/routes/guards/`, `src/lib/rbac/` | TBD | TBD | Matriz v0.2 fluxo 11 |
| CRM / integrações | Edge `crm-db-bridge`, `bitrix-sync`, `sync-quote-bitrix`, `src/pages/clients/` | TBD | TBD | Matriz v0.2 fluxo 12 |
| Banco de dados | `supabase/migrations/`, `src/integrations/supabase/types.ts` | TBD | TBD | REGRA #1 (SSOT `doufsxqlfjyuvxuezpln`) |
| Edge Functions | `supabase/functions/` | TBD | TBD | 107 funções (convenção: diretórios de função; excluídos `_shared/`, `tests/`, `README.md`, `deno.json` — 111 entradas brutas); subset já em CODEOWNERS |
| CI / qualidade | `.github/workflows/`, `scripts/`, `playwright.config.ts` | TBD | TBD | Gates 0–6 |
| Arquivos protegidos | Tabela "ARQUIVOS PROTEGIDOS" do CLAUDE.md | `@adm01-debug` (vigente) | TBD | Incidente 401 (2026-06-11) |

## 3. Proposta de evolução do CODEOWNERS (NÃO aplicada)

Após `[VALIDAÇÃO PO]` dos nomes e `[AUTORIZAÇÃO GITHUB]`, adicionar entradas por domínio
mantendo **íntegras** as regras atuais de arquivos protegidos (defesa do incidente 401):

```text
# Exemplo de formato (valores TBD até validação do PO):
# src/pages/products/          @owner-catalogo
# src/pages/quotes/            @owner-orcamento
# src/hooks/stock/             @owner-estoque
# supabase/migrations/         @owner-banco
# supabase/functions/          @owner-edge
```

## 4. Critério de conclusão da etapa 003

1. PO nomeia owner + backup reais para cada linha da tabela §2.
2. CODEOWNERS atualizado reflete exatamente esta tabela (com `[AUTORIZAÇÃO GITHUB]`).
3. Matriz de fluxos v0.2 passa a referenciar os mesmos owners (sem TBD).
