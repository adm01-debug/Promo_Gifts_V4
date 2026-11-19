# Motor de frete (`src/lib/freight`)

Funções puras. Sem React, sem Supabase, sem formatação de tela — quem consome é
`useFreightPlan` (bloco E). Um arquivo por responsabilidade.

**Unidades:** centímetro e grama, sempre. `box_*_mm` e `box_weight_kg` do
catálogo são convertidos na entrada (`units.ts`). Volume em cm³, exceto
`volumeM3`. Zero é ausência de dado, não medida (`isKnownMeasure`).

**Contrato final** (blocos A–B): `planFreight(items, boxes, options, settings): FreightPlan`
com `status: 'ok' | 'dados_insuficientes' | 'nao_cabe'`, `volumes[]`, `totals`,
`warnings[]`, `missing[]`.

**Pronto neste bloco (A):**

| Arquivo | O que faz |
|---|---|
| `types.ts` | contrato de dados do motor |
| `units.ts` | `mmToCm`, `kgToG`, `cm3ToM3`, `round1`, `round2`, `isKnownMeasure` |
| `columns.ts` | `PRODUCT_MEASURE_COLUMNS` — as únicas colunas de `products` que o motor lê |
| `resolveItemDimensions.ts` | linha de `products` → medidas, ou qual campo falta |
| `expandQuantities.ts` | quantidades × nº de kits, com validação retornada |

**Precedência de medidas:** embalagem (`box_*_mm`, 3 lados) → peça
(`height/width/length_cm`) → cilíndrico (`diameter_cm` + `height_cm`) →
`incomplete`. Sem peso **ou** sem dimensão não há estimativa parcial
(decisão 7): o plano para e aponta o cadastro.

**Nada de relógio nem de aleatório aqui:** `computedAt` e `itemsHash` entram
por parâmetro, para o plano ser reproduzível em teste e comparável no banco.

**Parâmetros nunca no código:** divisores de cubagem, fator de aproveitamento e
CEP de origem vêm de `freight_settings` (bloco C) e viajam em `FreightSettings`.

**Dívida conhecida:** `mmToCm` existe também em `src/lib/kit-builder/types.ts`
(mesma regra, mesmo resultado). A unificação cabe no bloco F, que já edita o
kit-builder; unificar agora seria refactor fora do escopo deste bloco.

**Testes:** `__tests__/*.test.ts` (vitest). Rode sempre por `npm test`, nunca
`npx vitest` — o `TZ=America/Sao_Paulo` do script é obrigatório.
