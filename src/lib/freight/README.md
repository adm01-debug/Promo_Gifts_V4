# Motor de frete (`src/lib/freight`)

Funções puras. Sem React, sem Supabase, sem formatação de tela — quem consome é
`useFreightPlan` (bloco E). Um arquivo por responsabilidade.

**Unidades:** centímetro e grama, sempre. `box_*_mm` e `box_weight_kg` do
catálogo são convertidos na entrada (`units.ts`). Volume em cm³, exceto
`volumeM3`. Zero é ausência de dado, não medida (`isKnownMeasure`).

**Contrato final** (blocos A–B): `planFreight(items, boxes, options, settings): FreightPlan`
com `status: 'ok' | 'dados_insuficientes' | 'nao_cabe'`, `volumes[]`, `totals`,
`warnings[]`, `missing[]`.

**Pronto:**

| Arquivo | O que faz |
|---|---|
| `types.ts` | contrato de dados do motor |
| `units.ts` | `mmToCm`, `kgToG`, `cm3ToM3`, `round1`, `round2`, `isKnownMeasure` |
| `columns.ts` | `PRODUCT_MEASURE_COLUMNS` — as 8 únicas colunas de `products` que o motor lê |
| `resolveItemDimensions.ts` | linha de `products` → medidas, ou qual campo falta |
| `expandQuantities.ts` | quantidades × nº de kits, com validação retornada |
| `boxOrder.ts` | volume interno e as ordens maior↔menor, usadas por todo o resto |
| `fitCount.ts` | quantas peças iguais cabem numa caixa: encaixe, volume e peso |
| `buildGroups.ts` | quem divide caixa com quem (`ships_separately` vence o vendedor) |
| `packSingleProduct.ts` | um produto, N unidades, nas caixas padrão |
| `packMixed.ts` | produtos diferentes na mesma caixa |
| `computeVolumeTotals.ts` | peso bruto, cubado (dois divisores), m³ e ocupação de um volume |
| `planFreight.ts` | orquestra tudo e devolve o `FreightPlan` |
| `formatPlanSummary.ts` | `3× G + 1× P · 55,2 kg · 0,24 m³ · cubado 39,9 kg` |

**A heurística de empacotamento é estimativa, não ótimo.** Um produto: fecha
caixas da maior enquanto sobra mais do que uma leva, e o resto vai na menor que
ainda o segura. Misturado: cada unidade do produto `i` consome `1/capacity_i` da
caixa, peças maiores entram primeiro, e a caixa escolhida é a menor em que todo
o restante cabe. O que o fuzz com semente fixa garante em 200 combinações:
nenhuma peça desaparece, nenhum volume passa do peso máximo, a ocupação nunca
promete mais de 100% e `ships_separately` nunca divide caixa.

**Precedência de medidas:** peça (`height/width/length_cm`) → cilíndrico
(`diameter_cm` + `height_cm`) → `incomplete`. Sem peso **ou** sem dimensão não
há estimativa parcial (decisão 7): o plano para e aponta o cadastro.

**As colunas `box_*` não são lidas.** O plano original mandava usá-las como
embalagem individual; os dados refutam. Medido em 19/11/2026 em
`doufsxqlfjyuvxuezpln`, entre os produtos ativos com os três lados de `box_*`:

| Métrica | Valor |
|---|---|
| Com `box_quantity > 1` | 1.153 de 1.197 |
| Média de peças por caixa | 228,6 (máximo 5.000) |
| Mediana de volume da caixa ÷ volume da peça | 71,3× |
| Com `box_weight_kg` > 3× `weight_g` | 931 de 943 |

É a caixa master do fornecedor, que a decisão 3 manda ignorar para frete.
Custo da escolha: 254 produtos que têm os três lados de `box_*` mas não os da
peça passam a bloquear em vez de produzir número errado (6.275 → 6.021 com
dimensão utilizável, de 7.951 ativos). Dividir `box_*` por `box_quantity` foi
descartado: daria um volume por unidade, não três lados, e o encaixe precisa
dos três — derivar lado por raiz cúbica inventaria geometria.

**Nada de relógio nem de aleatório aqui:** `computedAt` e `itemsHash` entram
por parâmetro, para o plano ser reproduzível em teste e comparável no banco.

**Parâmetros nunca no código:** divisores de cubagem, fator de aproveitamento e
CEP de origem vêm de `freight_settings` (bloco C) e viajam em `FreightSettings`.

**Sem consumidor de produção ainda:** `mmToCm` e `kgToG` não são chamados por
nenhum arquivo fora dos testes depois que `box_*` saiu da leitura. Ficam porque
o bloco C os consome: `shipping_boxes.wall_thickness_mm` (externa − 2 × espessura
→ interna) e o peso máximo da caixa, que o admin digita em kg e a coluna guarda
em `max_weight_g`. Se o bloco C não usar nenhum dos dois, apague os dois.

**O peso cubado sai nos dois divisores** (Correios 6.000 e rodoviário 3.333
cm³/kg) porque qual deles vale é decisão da cotação, no bloco I. O
`formatPlanSummary` mostra o dos Correios; o rodoviário fica em
`totals.cubicWeightG.rodoviario`.

**Dívida conhecida:** `mmToCm` existe também em `src/lib/kit-builder/types.ts`
(mesma regra, mesmo resultado). A unificação cabe no bloco F, que já edita o
kit-builder; unificar agora seria refactor fora do escopo deste bloco.

**Testes:** `__tests__/*.test.ts` (vitest). Rode sempre por `npm test`, nunca
`npx vitest` — o `TZ=America/Sao_Paulo` do script é obrigatório.
