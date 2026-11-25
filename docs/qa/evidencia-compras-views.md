# Evidência — Etapa 001 — Consumidores das views `v_compras_*`

> Coletado em 2026-11-23 · commit base 042c2122 · branch original `claude/chore-qa-etapa-001-compras-261123-1100` (PR #4003).
> Recuperado em 2026-11-24 para `main` porque a PR original ficou `CONFLICTING` sobre `05-PROGRESSO.md`.
> A seção "Atualização 2026-11-24" corrige o que foi medido depois.

## Resumo executivo

As três views `v_compras_catalogo`, `v_compras_precos_faixa` e `v_compras_precos_variante` têm exatamente
um consumidor identificado: o repositório `adm01-debug/Promo_Supply_V2`, via edge function `external-db-bridge`.
Nenhum arquivo em `src/` nem em `supabase/functions/` do repositório atual as referencia.

## Arquitetura do consumo

```
Promo Supply V2 (browser)
  src/hooks/useCatalogoPim.ts
    supabase.functions.invoke('external-db-bridge', body)
      supabase/functions/external-db-bridge/index.ts (Supply V2)
        createClient(EXTERNAL_DB_URL, EXTERNAL_DB_KEY)
          externalClient.from('v_compras_catalogo').select(*)
          externalClient.from('v_compras_precos_faixa').select(*)
```

`EXTERNAL_DB_URL` = URL do projeto Promo Gifts V4.
`EXTERNAL_DB_KEY` = chave no secret do Supply V2.

## Colunas sensíveis consumidas

- `v_compras_catalogo`: `cost_price`, `supplier_id`, `supplier_code`, `supplier_name`, `supplier_reference`
- `v_compras_precos_faixa`: `unit_cost`
- `v_compras_precos_variante`: **não** referenciada em `useCatalogoPim.ts`

## Consultas tentadas

- `supabase link` → 403 sem privilégio (Supabase CLI).
- GitHub API (`Promo Supply V2 src/hooks/useCatalogoPim.ts`) → leitura direta bem-sucedida.
- `grep v_compras` em `src/` e `supabase/functions/` do Gifts V4 → zero resultados (confirmado).

## Atualização 2026-11-24 (medição em produção, chave publishable)

Request REST direto com a chave anônima do bundle de produção (`GET /rest/v1/<objeto>?select=*&limit=1`):

| objeto | antes da etapa 004 | depois de `20261124140000` |
|---|---|---|
| `v_compras_catalogo` | 401 (`42501 permission denied for table suppliers`) | 401 |
| `v_compras_precos_faixa` | 401 (mesma cadeia) | 401 |
| `v_compras_precos_variante` | 401 (mesma cadeia) | 401 |
| `markup_configurations` | 200 no SELECT | 401 |
| `v_products_public` / `v_variant_sale_prices_public` / `v_tabela_preco_gravacao_oficial_public` | 200 com dados | 200 com dados |

Duas conclusões que mudam a recomendação original:

1. O `external-db-bridge` **não** usa a chave anônima: as três views já respondiam 401 ao `anon` antes de
   qualquer mudança desta rodada. Revogar o grant não alterou o caminho de quem consome.
2. Mascarar `cost_price`/`unit_cost` (etapas 002/003) foi **rejeitado**: `unit_cost` é o preço da faixa que vira
   `valor_unitario` da cotação (`Promo_Supply_V2/src/pages/gerar-ordem/GerarOrdem.tsx:274`,
   `pcp.price[i]`). A fronteira de custo dessas views é a credencial, não a coluna — executado em
   `supabase/migrations/20261124140000_close_anon_cost_surface.sql`.