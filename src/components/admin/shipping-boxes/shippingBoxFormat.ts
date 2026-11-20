/**
 * Formatação PT-BR dos números do cadastro de caixas de transporte.
 * Uso só de exibição: nada daqui volta para o banco.
 */

const CM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const LITERS = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const KG = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const FACTOR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
/** A empresa opera em São Paulo: a data não pode depender do fuso da máquina. */
const DAY = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

/** Mostrado no lugar de um valor que ainda não dá para calcular. */
export const NO_VALUE = '—';

function cm(value: number | null): string {
  return value === null ? NO_VALUE : CM.format(value);
}

/** "26,4 × 32,4 × 32,4 cm" — altura × largura × comprimento. */
export function formatDimensionsCm(
  heightCm: number | null,
  widthCm: number | null,
  lengthCm: number | null,
): string {
  return `${cm(heightCm)} × ${cm(widthCm)} × ${cm(lengthCm)} cm`;
}

/** "27,7 L", sempre com uma casa decimal. */
export function formatLiters(liters: number | null): string {
  return liters === null ? NO_VALUE : `${LITERS.format(liters)} L`;
}

/** Gramas do banco exibidos em quilos: 10000 → "10 kg", 12500 → "12,5 kg". */
export function formatWeightKg(grams: number): string {
  return `${KG.format(grams / 1000)} kg`;
}

/** Fator de aproveitamento com duas casas: 0.9 → "0,90". */
export function formatFillFactor(factor: number): string {
  return FACTOR.format(factor);
}

/** Dia da exclusão, no fuso de São Paulo: "19/11/2026". */
export function formatDeletedDay(deletedAt: string | null): string {
  if (deletedAt === null) return NO_VALUE;
  const date = new Date(deletedAt);
  return Number.isNaN(date.getTime()) ? NO_VALUE : DAY.format(date);
}
