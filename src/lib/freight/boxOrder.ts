/**
 * Volume interno de uma caixa e as ordens derivadas dele.
 *
 * Existe porque quatro lugares precisavam do mesmo número — os dois
 * empacotadores, o resumo de uma linha e a escolha da maior caixa no
 * `planFreight` — e cada cópia era uma chance de duas delas discordarem.
 *
 * "Maior" e "menor" no motor são sempre por **volume interno**, não por peso
 * máximo nem pela ordem de cadastro: é o espaço que decide o encaixe.
 */
import type { Dimensions, ShippingBox } from './types';

export function volumeCm3(dims: Dimensions): number {
  return dims.heightCm * dims.widthCm * dims.lengthCm;
}

export function volumeInternoCm3(box: ShippingBox): number {
  return volumeCm3(box.inner);
}

/** Da maior para a menor. Empate pelo código, para a ordem ser estável. */
export function daMaiorParaMenor(boxes: readonly ShippingBox[]): ShippingBox[] {
  return [...boxes].sort((a, b) => {
    const diff = volumeInternoCm3(b) - volumeInternoCm3(a);
    return diff !== 0 ? diff : a.code.localeCompare(b.code);
  });
}

/** Da menor para a maior. */
export function daMenorParaMaior(boxes: readonly ShippingBox[]): ShippingBox[] {
  return daMaiorParaMenor(boxes).reverse();
}

/** A maior caixa da lista, ou `null` se a lista está vazia. */
export function maiorCaixa(boxes: readonly ShippingBox[]): ShippingBox | null {
  return daMaiorParaMenor(boxes)[0] ?? null;
}
