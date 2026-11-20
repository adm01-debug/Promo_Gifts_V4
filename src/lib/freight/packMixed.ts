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
 *
 * Quando a maior caixa fecha cheia só com a maior peça, as caixas seguintes
 * saem idênticas até a peça quase acabar. Elas são **contadas de uma vez**, não
 * uma volta de laço por caixa: a quantidade vem de um campo digitado, e um zero
 * a mais não pode virar um laço de milhões de voltas. Passou de `maxVolumes`,
 * o resultado é `volumes_demais` com a contagem — e nenhum volume é montado.
 */
import { daMenorParaMaior as ordenarDaMenor, volumeCm3 } from './boxOrder';
import type { VolumeDraft } from './computeVolumeTotals';
import { fitCount } from './fitCount';
import { MAX_VOLUMES_POR_PLANO } from './limits';
import { fecharLotes, type LoteDeVolumes, type PackResult } from './packSingleProduct';
import type { FreightSettings, PackItem, ShippingBox } from './types';

const EPSILON = 1e-9;

function volumeUnitarioCm3(item: PackItem): number {
  return volumeCm3(item.dims);
}

export function packMixed(
  items: readonly PackItem[],
  boxes: readonly ShippingBox[],
  settings: FreightSettings,
  maxVolumes: number = MAX_VOLUMES_POR_PLANO,
): PackResult {
  const porVolumeDesc = [...items]
    .filter((item) => item.quantity > 0)
    .sort((a, b) => volumeUnitarioCm3(b) - volumeUnitarioCm3(a));

  if (porVolumeDesc.length === 0) return { status: 'ok', volumes: [] };

  const daMenorParaMaior = ordenarDaMenor(boxes);
  const posicaoDaCaixa = new Map(daMenorParaMaior.map((box, posicao) => [box, posicao]));

  /**
   * Capacidade de cada (peça, caixa), calculada uma vez.
   *
   * A chave inclui as medidas, não só o `productId`. Dentro do plano isso
   * nunca decide nada: `buildGroups` soma as linhas do mesmo produto numa peça
   * só, e `planFreight` bloqueia o pedido em que o mesmo `productId` chega com
   * medidas ou peso diferentes. A chave protege quem chama `packMixed` direto
   * com duas peças de mesmo id e medidas diferentes: uma chave só de id
   * devolveria a capacidade da outra — número errado, sem erro.
   *
   * A caixa entra pela **posição** na lista ordenada, não pelo `id`: duas
   * caixas com o mesmo id (ou sem id) seriam tomadas por uma só, e a menor
   * emprestaria a capacidade à maior.
   */
  const capacidade = new Map<string, number>();
  const capacityOf = (item: PackItem, box: ShippingBox): number => {
    const { heightCm, widthCm, lengthCm } = item.dims;
    const chave = `${item.productId}|${heightCm}x${widthCm}x${lengthCm}|${item.weightG}|${posicaoDaCaixa.get(box)}`;
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

  const lotes: LoteDeVolumes[] = [];

  for (;;) {
    const pendentes = faltando();
    const [proxima, ...demais] = pendentes;
    if (!proxima) break;
    const primeiro = proxima.item;

    // Só caixas que levam ao menos uma unidade da maior peça pendente: garante
    // que cada passagem coloca algo e o laço termina.
    const candidatas = daMenorParaMaior.filter((box) => capacityOf(primeiro, box) > 0);
    const maiorCandidata = candidatas.at(-1);
    if (!maiorCandidata) return { status: 'nao_cabe', item: primeiro };

    const box = candidatas.find((candidata) => seguraTudo(candidata, pendentes)) ?? maiorCandidata;

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

    lotes.push({ volume: { box, contents }, vezes: 1 });

    // Ainda falta da maior peça? Então ela não coube inteira: a caixa que
    // acabou de fechar é a maior candidata, cheia só com ela (as outras peças
    // não receberam nada). A próxima volta repete esta — mesma caixa, mesmo
    // conteúdo — enquanto sobrar ao menos uma caixa cheia dessa peça e nenhuma
    // candidata segurar o restante inteiro. Nada mais muda de uma volta para a
    // outra: só a peça da frente diminui.
    const cheia = capacityOf(primeiro, maiorCandidata);
    const repete = (falta: number): boolean =>
      !candidatas.some((candidata) =>
        seguraTudo(candidata, [{ item: primeiro, falta }, ...demais]),
      );

    // Quantas caixas iguais vêm em seguida: a maior quantidade `iguais` em que
    // a última delas ainda começa numa situação que repete. O teto é quantas
    // caixas cheias o que falta ainda enche; se a peça acabou, é zero.
    // Diminuir a peça da frente só facilita segurar tudo, então "repete" vale
    // até um ponto e não volta a valer depois — busca binária, no lugar de uma
    // volta por caixa.
    let iguais = 0;
    let teto = Math.floor(proxima.falta / cheia);
    while (iguais < teto) {
      const meio = iguais + Math.ceil((teto - iguais) / 2);
      if (repete(proxima.falta - (meio - 1) * cheia)) iguais = meio;
      else teto = meio - 1;
    }
    if (iguais === 0) continue;

    lotes.push({
      volume: { box: maiorCandidata, contents: [{ item: primeiro, quantity: cheia }] },
      vezes: iguais,
    });
    proxima.falta -= iguais * cheia;
  }

  return fecharLotes(lotes, maxVolumes);
}
