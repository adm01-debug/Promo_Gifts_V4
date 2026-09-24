# Kit Maker — Cobertura de áreas de gravação (etapa 11)

Data: 23/09/2026. Projeto canônico: `doufsxqlfjyuvxuezpln`. Consultas via
`pg_catalog`/SQL direto (REGRA #8, corolário), somente leitura.

**Reverificado em 24/09/2026** ao resolver conflito de merge com uma versão
divergente deste mesmo doc (12,4% de cobertura, calculado com `product_type`
incluindo `kit`/`packaging` no denominador — número incorreto que chegou a
ser mergeado em `main`). Reconsulta direta confirma a metodologia abaixo
(só `product_type = 'product'`): 6.719 produtos ativos, 3.136 com área —
**46,7%**. Os totais absolutos divergem levemente da tabela original de
23/09 (6.707/3.135) por serem outro snapshot do catálogo vivo um dia
depois — o denominador e a metodologia são os mesmos, e a cobertura
resultante é a mesma (46,7%) nos dois momentos.

## Correção de premissa em relação ao plano

O plano de finalização (`KIT_MAKER_PLANO_FINALIZACAO_20_ETAPAS_2026-09-23.md`,
etapas 11 e 12) referencia `v_kit_component_print_areas` como a fonte de
áreas de gravação. Essa view é alimentada por `kit_component_print_areas`,
que é escopada a `product_kit_components` — os **templates de kit curados**
(a mesma feature citada no Anexo do plano como fora de escopo: "curadoria
dos 6 templates de kit"), não ao catálogo genérico que o Kit Maker freeform
usa.

Medição direta: `product_kit_components.component_product_id` (o único
caminho de `kit_component_print_areas` até `products.id`) está preenchido
para apenas **7 produtos em todo o catálogo**, e os 7 estão com
`is_active = false`. Ou seja, **cobertura de produtos ativos via essa
tabela = 0/6707 (0%)**.

A tabela correta — genérica, por produto, sem passar por kit templates — é
`print_area_techniques` (`product_id → products.id` direto,
`is_active`, `location_code`, `location_name`, `max_width`, `max_height`).
Esta é a fonte que a etapa 12 deve usar.

## Cobertura real (via `print_area_techniques`)

| Métrica | Valor |
| --- | --- |
| Produtos ativos (`is_active = true AND product_type = 'product'`) | 6.707 |
| Produtos ativos com ≥ 1 área cadastrada (`print_area_techniques`, `is_active = true`) | 3.135 |
| Cobertura | **46,7 %** |

Consulta:

```sql
WITH active_products AS (
  SELECT id, name, sku FROM public.products
  WHERE is_active = true AND product_type = 'product'
),
products_with_area AS (
  SELECT DISTINCT product_id FROM public.print_area_techniques WHERE is_active = true
)
SELECT
  (SELECT count(*) FROM active_products) AS total_active_products,
  (SELECT count(*) FROM active_products ap WHERE ap.id IN (SELECT product_id FROM products_with_area)) AS active_products_with_area;
```

## Top 50 produtos ativos mais usados sem área cadastrada

"Mais usados" = frequência combinada em `quote_items.product_id` +
`order_items.product_id`. O histórico de pedidos/orçamentos no catálogo
ainda é raso: dos 50 produtos sem área, apenas 8 têm ao menos 1 uso
registrado (todos com exatamente 1); os demais 42 não têm nenhum uso
registrado — a lista abaixo está ordenada por uso desc, nome asc como
desempate, então a segunda metade é essencialmente alfabética dentro do
conjunto "zero uso", não um ranking real de popularidade.

| # | Produto | SKU | Usos (quotes+orders) |
| --- | --- | --- | --- |
| 1 | Caderneta em bambu | 18759 | 1 |
| 2 | Caixa de som em alumínio 100% reciclado com microfone e autonomia de 3h | 57252 | 1 |
| 3 | Conj. De garrafa e caneca em aço inox 330/180 ml - 3 pçs | IX-02411 | 1 |
| 4 | Garrafa térmica 780ml | 18518A | 1 |
| 5 | Garrafa térmica inox 320ml | 18904 | 1 |
| 6 | Mala de viagem 41 litros | 15129 | 1 |
| 7 | Mochila poliéster 23 litros | 14709 | 1 |
| 8 | Mochila/pasta desmonta | 14708 | 1 |
| 9–50 | (42 produtos com 0 uso registrado — ordem alfabética; ver consulta abaixo para a lista completa) | — | 0 |

Consulta completa (top 50):

```sql
WITH active_products AS (
  SELECT id, name, sku FROM public.products
  WHERE is_active = true AND product_type = 'product'
),
products_with_area AS (
  SELECT DISTINCT product_id FROM public.print_area_techniques WHERE is_active = true
),
usage AS (
  SELECT product_id, count(*) AS uses FROM public.quote_items WHERE product_id IS NOT NULL GROUP BY product_id
  UNION ALL
  SELECT product_id, count(*) AS uses FROM public.order_items WHERE product_id IS NOT NULL GROUP BY product_id
),
usage_agg AS (
  SELECT product_id, sum(uses) AS total_uses FROM usage GROUP BY product_id
)
SELECT ap.name, ap.sku, coalesce(ua.total_uses, 0) AS total_uses
FROM active_products ap
LEFT JOIN usage_agg ua ON ua.product_id = ap.id
WHERE ap.id NOT IN (SELECT product_id FROM products_with_area)
ORDER BY total_uses DESC NULLS LAST, ap.name ASC
LIMIT 50;
```

## Implicação para a etapa 12

Com 46,7 % de cobertura real (via `print_area_techniques`, não via
`v_kit_component_print_areas`), a etapa 12 é viável como planejada: select
com as áreas reais quando existirem (`print_area_techniques` por
`product_id`), fallback para "Frente" fixo nos 53,3 % sem área cadastrada —
o comportamento atual não regride para esse grupo.
