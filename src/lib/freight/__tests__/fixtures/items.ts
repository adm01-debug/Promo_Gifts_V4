/**
 * Peças de teste do bloco B, em medidas redondas, para os valores esperados
 * poderem ser conferidos à mão no comentário de cada caso.
 *
 * Capacidades nas quatro caixas padrão (calculadas em `fitCount.test.ts`):
 *
 * | Peça | P | M | G | GG |
 * |---|---|---|---|---|
 * | caderneta 21 × 14 × 1, 120 g | 64 | 128 | 140 | 250 |
 * | squeeze 25 × 7 × 7, 80 g | 16 | 24 | 49 | 70 |
 */
import type { ProductMeasureRow } from '../../columns';
import type { PackItem } from '../../types';

export function pecaDeTeste(
  productId: string,
  dims: [number, number, number],
  weightG: number,
  quantity: number,
  extras: Partial<PackItem> = {},
): PackItem {
  const [heightCm, widthCm, lengthCm] = dims;
  return {
    productId,
    name: `Peça ${productId}`,
    sku: `SKU-${productId}`,
    quantity,
    dims: { heightCm, widthCm, lengthCm },
    weightG,
    shipsSeparately: false,
    source: 'product',
    ...extras,
  };
}

/** Caderneta 21 × 14 × 1 cm, 120 g, volume 294 cm³. */
export const caderneta = (quantity: number, extras: Partial<PackItem> = {}): PackItem =>
  pecaDeTeste('caderneta', [21, 14, 1], 120, quantity, { name: 'Caderneta A5', ...extras });

/** Squeeze 25 × 7 × 7 cm, 80 g, volume 1.225 cm³. */
export const squeeze = (quantity: number, extras: Partial<PackItem> = {}): PackItem =>
  pecaDeTeste('squeeze', [25, 7, 7], 80, quantity, { name: 'Squeeze 500 ml', ...extras });

/** Barra de 61 cm: não entra em nenhuma caixa ativa. */
export const barraGigante = (quantity: number): PackItem =>
  pecaDeTeste('barra-61', [61, 10, 10], 500, quantity, { name: 'Barra de 61 cm' });

/**
 * A mesma peça como linha de `products`, para os testes de `planFreight` que
 * entram pela borda (linha do catálogo) e não pelo `PackItem` já resolvido.
 */
export function linhaDeTeste(
  productId: string,
  dims: [number, number, number] | null,
  weightG: number | null,
  name = `Peça ${productId}`,
): ProductMeasureRow {
  const [heightCm, widthCm, lengthCm] = dims ?? [null, null, null];
  return {
    id: productId,
    name,
    sku: `SKU-${productId}`,
    height_cm: heightCm,
    width_cm: widthCm,
    length_cm: lengthCm,
    diameter_cm: null,
    weight_g: weightG,
    ships_separately: false,
  };
}

export const LINHA_CADERNETA = linhaDeTeste('caderneta', [21, 14, 1], 120, 'Caderneta A5');
export const LINHA_SQUEEZE = linhaDeTeste('squeeze', [25, 7, 7], 80, 'Squeeze 500 ml');
export const LINHA_BARRA_61 = linhaDeTeste('barra-61', [61, 10, 10], 500, 'Barra de 61 cm');
export const LINHA_SEM_PESO = linhaDeTeste('sem-peso', [10, 10, 10], null, 'Peça sem peso');
