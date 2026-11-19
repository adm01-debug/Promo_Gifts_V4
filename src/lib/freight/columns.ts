/**
 * Colunas de `public.products` que o motor de frete lê — e só elas.
 *
 * Existe como constante única por dois motivos: o `select` da query e o tipo da
 * linha nunca divergirem, e o incidente de 2026-10-13 (colunas inexistentes no
 * `select` causando 400 em produção, ver `scripts/check-select-columns.mjs`)
 * não se repetir aqui.
 *
 * Deliberadamente fora da lista:
 *
 * - `shipping_weight_kg`, `shipping_height_cm`, `shipping_width_cm`,
 *   `shipping_length_cm` — 100% vazias nos 7.951 produtos ativos.
 * - `cubic_weight` — preenchida sem regra conhecida. O motor calcula o peso
 *   cubado a partir da caixa real; não confia em coluna pré-calculada.
 * - `box_height_mm`, `box_width_mm`, `box_length_mm`, `box_weight_kg` — são a
 *   caixa master do fornecedor, não a embalagem individual. Medido em
 *   19/11/2026: dos 1.197 produtos ativos com os três lados preenchidos, 1.153
 *   têm `box_quantity > 1` (média 228,6 peças por caixa, máximo 5.000), e a
 *   mediana do volume dessa caixa é 71× o volume da peça. Ler essas colunas
 *   infla o frete em ordens de magnitude, e a decisão 3 do projeto já manda
 *   ignorar a caixa master. Ver o README do módulo.
 */
import type { Database } from '@/integrations/supabase/types';

/**
 * Ordem estável: o `select` gerado é comparável entre versões no diff.
 *
 * `ships_separately` entra aqui no bloco D, junto com a migration que cria a
 * coluna. Até então a linha vem sem o campo e `resolveItemDimensions` lê
 * `false`, que é o default da coluna.
 */
export const PRODUCT_MEASURE_COLUMNS = [
  'id',
  'name',
  'sku',
  'height_cm',
  'width_cm',
  'length_cm',
  'diameter_cm',
  'weight_g',
] as const;

/** Lista pronta para `supabase.from('products').select(...)`. */
export const PRODUCT_MEASURE_SELECT = PRODUCT_MEASURE_COLUMNS.join(', ');

/** Nome de uma coluna lida pelo motor. */
export type ProductMeasureColumn = (typeof PRODUCT_MEASURE_COLUMNS)[number];

/**
 * Linha de `products` como o motor a enxerga, **derivada** do schema gerado em
 * vez de redigitada.
 *
 * O `Pick` é a guarda: se um nome de `PRODUCT_MEASURE_COLUMNS` não existir em
 * `products`, `npm run qa:typecheck` falha aqui — em vez de a query devolver
 * 400 em produção, que foi o incidente de 2026-10-13. O import é **só de tipo**
 * (apagado na compilação), então o motor continua sem dependência de runtime
 * do Supabase.
 */
type ProductsRow = Database['public']['Tables']['products']['Row'];

export type ProductMeasureRow = Pick<ProductsRow, ProductMeasureColumn>;
