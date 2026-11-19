/**
 * As quatro caixas padrão da empresa, confirmadas pelo dono em 19/11/2026.
 *
 * As medidas informadas são **externas**. O papelão tem 3 mm, então a interna é
 * a externa menos 0,6 cm por eixo. Peso da caixa vazia é ignorado (0) por
 * decisão; `fillFactor` padrão 0,90.
 *
 * Volume interno conferido contra o que o dono informou:
 *
 * | Código | Externa (cm) | Interna (cm) | Interno (cm³) | Informado |
 * |---|---|---|---|---|
 * | P | 27 × 33 × 33 | 26,4 × 32,4 × 32,4 | 27.713,664 | 27,7 L |
 * | M | 33 × 33 × 47 | 32,4 × 32,4 × 46,4 | 48.708,864 | 48,7 L |
 * | G | 36 × 36 × 54 | 35,4 × 35,4 × 53,4 | 66.918,744 | 66,9 L |
 * | GG | 40 × 50 × 60 | 39,4 × 49,4 × 59,4 | 115.613,784 | 115,6 L |
 *
 * Os valores esperados dos testes do bloco B saem **destas** caixas, calculados
 * à mão no comentário de cada caso.
 */
import type { ShippingBox } from '../../types';

/** Espessura do papelão em cm: 3 mm em cada parede, 0,6 cm por eixo. */
const PAREDE_CM = 0.3;

function caixa(
  code: string,
  name: string,
  outer: [number, number, number],
  maxWeightKg: number,
): ShippingBox {
  const [heightCm, widthCm, lengthCm] = outer;
  return {
    id: `fixture-${code.toLowerCase()}`,
    code,
    name,
    outer: { heightCm, widthCm, lengthCm },
    inner: {
      heightCm: heightCm - 2 * PAREDE_CM,
      widthCm: widthCm - 2 * PAREDE_CM,
      lengthCm: lengthCm - 2 * PAREDE_CM,
    },
    emptyWeightG: 0,
    maxWeightG: maxWeightKg * 1000,
    fillFactor: 0.9,
  };
}

export const CAIXA_P = caixa('P', 'Caixa P', [27, 33, 33], 10);
export const CAIXA_M = caixa('M', 'Caixa M', [33, 33, 47], 20);
export const CAIXA_G = caixa('G', 'Caixa G', [36, 36, 54], 25);
export const CAIXA_GG = caixa('GG', 'Caixa GG', [40, 50, 60], 30);

/** As quatro caixas ativas, na ordem em que o dono as listou. */
export const CAIXAS_PADRAO: ShippingBox[] = [CAIXA_P, CAIXA_M, CAIXA_G, CAIXA_GG];

/** Parâmetros globais do cálculo, como `freight_settings` os guardará. */
export const SETTINGS_PADRAO = {
  cubicDivisorCorreios: 6000,
  cubicDivisorRodoviario: 3333,
  defaultFillFactor: 0.9,
} as const;
