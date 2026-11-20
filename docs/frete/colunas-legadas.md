# Colunas legadas de frete em `products`

Estas colunas existem na tabela `products`, mas o motor de frete (`src/lib/freight`) **não as lê**.
A lista do que o motor lê é `PRODUCT_MEASURE_COLUMNS` em `src/lib/freight/columns.ts`.

| Coluna | Por que não é lida |
|---|---|
| `shipping_weight_kg` | 100% vazia nos 7.951 produtos ativos (medido em 19/11/2026). O peso vem de `weight_g`. |
| `shipping_height_cm`, `shipping_width_cm`, `shipping_length_cm` | 100% vazias nos 7.951 produtos ativos. As medidas vêm de `height_cm`, `width_cm`, `length_cm` e `diameter_cm`. |
| `cubic_weight` | Preenchida sem regra conhecida (57% dos produtos sem regra). O motor calcula o peso cubado a partir da caixa de transporte real, com o divisor de `freight_settings`. |

Também fora do cálculo, por decisão do projeto: `box_height_mm`, `box_width_mm`, `box_length_mm`, `box_weight_kg`,
`box_quantity` e `box_volume_cm3` descrevem a caixa master do fornecedor, que o frete ignora e reembala nas caixas
padrão da empresa (ver o README do módulo em `src/lib/freight/README.md`).

O formulário de produto ainda grava as quatro colunas `shipping_*` e `cubic_weight` e a lista do admin ainda as
carrega; nenhuma tela de frete as consulta.

## Remoção futura

Não remover agora. Em produção, 10 dependências de view (`pg_depend`, medido em 20/11/2026) usam essas colunas; o `DROP COLUMN` falha enquanto elas existirem. Remover as colunas exige, nesta ordem: tirar os campos do formulário
(`ProductFormSchema.ts`, `AdminProductFormPage.tsx`) e de `useProductsManager.ts`, depois uma migration
`DROP COLUMN` por PR própria e aplicada pelo workflow `db-apply-migration.yml`, com o aval do dono.
