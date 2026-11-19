/**
 * Empacota produtos **diferentes** na mesma caixa.
 *
 * Cada unidade do produto `i` consome `1 / capacity_i(caixa)` da caixa. A soma
 * dessas frações é o quanto a caixa está tomada — um proxy linear que respeita
 * os três tetos do `fitCount` (encaixe, volume aproveitável e peso) sem
 * precisar resolver um empacotamento 3D de verdade.
 *
 * A caixa escolhida é a **menor** em que todo o restante cabe; se nada segura
 * o restante inteiro, abre a maior e repete. Peças maiores entram primeiro,
 * porque é a ordem que deixa menos buraco.
 */
import { daMenorParaMaior as ordenarDaMenor, volumeCm3 } from './boxOrder';
import type { VolumeDraft } from './computeVolumeTotals';
import { fitCount } from './fitCount';
import type { PackResult } from './packSingleProduct';
import type { FreightSettings, PackItem, ShippingBox } from './types';

const EPSILON = 1e-9;

function volumeUnitarioCm3(item: PackItem): number {
  return volumeCm3(item.dims);
}

export function packMixed(
  items: readonly PackItem[],
  boxes: readonly ShippingBox[],
  settings: FreightSettings,
): PackResult {
  const porVolumeDesc = [...items]
    .filter((item) => item.quantity > 0)
    .sort((a, b) => volumeUnitarioCm3(b) - volumeUnitarioCm3(a));

  if (porVolumeDesc.length === 0) return { status: 'ok', volumes: [] };

  const daMenorParaMaior = ordenarDaMenor(boxes);

  /** Capacidade de cada (produto, caixa), calculada uma vez. */
  const capacidade = new Map<string, number>();
  const capacityOf = (item: PackItem, box: ShippingBox): number => {
    const chave = `${item.productId}|${box.id}`;
    const cacheado = capacidade.get(chave);
    if (cacheado !== undefined) return cacheado;
    const valor = fitCount(item, box, settings).capacity;
    capacidade.set(chave, valor);
    return valor;
  };

  /** Quanto falta de cada peça. Registro mutável, não mapa: sem busca e sem
   * valor ausente para tratar. */
  const pendencias = porVolumeDesc.map((item) => ({ item, falta: item.quantity }));
  const faltando = () => pendencias.filter(({ falta }) => falta > 0);

  /** Todo o restante cabe nesta caixa, por fração e por peso? */
  const seguraTudo = (box: ShippingBox, pendentes: typeof pendencias): boolean => {
    let fracao = 0;
    let pesoG = 0;
    for (const { item, falta } of pendentes) {
      const capacity = capacityOf(item, box);
      if (capacity <= 0) return false;
      fracao += falta / capacity;
      pesoG += falta * item.weightG;
    }
    return fracao <= 1 + EPSILON && pesoG <= box.maxWeightG - box.emptyWeightG + EPSILON;
  };

  const volumes: VolumeDraft[] = [];

  for (let pendentes = faltando(); pendentes.length > 0; pendentes = faltando()) {
    const primeiro = pendentes[0].item;

    // Só caixas que levam ao menos uma unidade da maior peça pendente: garante
    // que cada passagem coloca algo e o laço termina.
    const candidatas = daMenorParaMaior.filter((box) => capacityOf(primeiro, box) > 0);
    if (candidatas.length === 0) return { status: 'nao_cabe', item: primeiro };

    const box =
      candidatas.find((candidata) => seguraTudo(candidata, pendentes)) ??
      candidatas[candidatas.length - 1];

    const disponivelG = box.maxWeightG - box.emptyWeightG;
    const contents: VolumeDraft['contents'] = [];
    let fracaoUsada = 0;
    let pesoUsadoG = 0;

    for (const pendencia of pendentes) {
      const { item, falta } = pendencia;

      const capacity = capacityOf(item, box);
      // A peça não entra nesta caixa (lado grande demais ou peso acima do
      // máximo): vai na próxima aberta.
      if (capacity <= 0) continue;

      const porFracao = Math.floor((1 - fracaoUsada) * capacity + EPSILON);
      const porPeso = Math.floor((disponivelG - pesoUsadoG) / item.weightG + EPSILON);
      const cabe = Math.min(falta, porFracao, porPeso);
      // A caixa já está tomada para esta peça; o que falta dela abre outra.
      if (cabe <= 0) continue;

      contents.push({ item, quantity: cabe });
      fracaoUsada += cabe / capacity;
      pesoUsadoG += cabe * item.weightG;
      pendencia.falta -= cabe;
    }

    volumes.push({ box, contents });
  }

  return { status: 'ok', volumes };
}
