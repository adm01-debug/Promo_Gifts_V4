/**
 * Empacota **um** produto, em quantidade qualquer, nas caixas padrão.
 *
 * A heurística é a que um expedidor usa na prática:
 *
 * 1. enquanto sobra mais do que uma caixa grande leva, fecha caixas grandes
 *    cheias — é o que minimiza o número de volumes;
 * 2. o resto vai na **menor** caixa que ainda o segura — é o que evita
 *    despachar uma GG com 10% de ocupação.
 *
 * Não é ótimo e não precisa ser: o plano é uma estimativa, e as invariantes
 * que importam (quantidade preservada, nenhum volume acima do peso máximo)
 * estão travadas no fuzz.
 *
 * As caixas cheias saem de **uma conta**, não de um laço por caixa: a
 * quantidade vem de um campo digitado, e um zero a mais não pode virar um laço
 * de milhões de voltas. Passou de `maxVolumes`, o resultado é
 * `volumes_demais` com a contagem — e nenhum volume é montado.
 */
import { daMaiorParaMenor } from './boxOrder';
import type { VolumeDraft } from './computeVolumeTotals';
import { fitCount } from './fitCount';
import { MAX_VOLUMES_POR_PLANO } from './limits';
import type { FreightSettings, PackItem, ShippingBox } from './types';

export type PackResult =
  | { status: 'nao_cabe'; item: PackItem }
  | { status: 'ok'; volumes: VolumeDraft[] }
  | { status: 'volumes_demais'; quantos: number };

/** Caixas iguais em sequência: `vezes` volumes com o mesmo conteúdo. */
export interface LoteDeVolumes {
  volume: VolumeDraft;
  vezes: number;
}

/**
 * Conta os volumes dos lotes e só os monta se couberem em `maxVolumes`.
 *
 * Cada volume montado é um objeto próprio (caixa a caixa, como o plano
 * devolve), então a contagem vem **antes**: é ela que impede alocar milhões de
 * objetos para depois descobrir que o pedido era absurdo.
 */
export function fecharLotes(lotes: readonly LoteDeVolumes[], maxVolumes: number): PackResult {
  const quantos = lotes.reduce((soma, { vezes }) => soma + vezes, 0);
  // `!(a <= b)`, e não `a > b`: uma contagem que não é número (quantidade
  // infinita entregue direto ao empacotador) também para aqui, em vez de
  // passar como "zero volume".
  if (!(quantos <= maxVolumes)) return { status: 'volumes_demais', quantos };

  const volumes: VolumeDraft[] = [];
  for (const { volume, vezes } of lotes) {
    for (let i = 0; i < vezes; i += 1) {
      volumes.push({ box: volume.box, contents: volume.contents.map((c) => ({ ...c })) });
    }
  }
  return { status: 'ok', volumes };
}

/** `⌈a ÷ b⌉` para inteiros positivos, sem passar por uma divisão fracionária. */
function divisaoParaCima(a: number, b: number): number {
  const sobra = a % b;
  return (a - sobra) / b + (sobra > 0 ? 1 : 0);
}

export function packSingleProduct(
  item: PackItem,
  boxes: readonly ShippingBox[],
  settings: FreightSettings,
  maxVolumes: number = MAX_VOLUMES_POR_PLANO,
): PackResult {
  if (item.quantity <= 0) return { status: 'ok', volumes: [] };

  // A capacidade viaja junto com a caixa: sem busca em mapa, sem o `?? 0` que
  // seria um ramo inalcançável.
  const cabem = daMaiorParaMenor(boxes)
    .map((box) => ({ box, capacity: fitCount(item, box, settings).capacity }))
    .filter(({ capacity }) => capacity > 0);

  const [maior] = cabem;
  if (!maior) return { status: 'nao_cabe', item };

  const daMenorParaMaior = [...cabem].reverse();
  // A maior caixa por espaço nem sempre é a que leva mais unidades (o peso
  // máximo pode cortar antes): é esta capacidade que diz se alguma caixa
  // sozinha ainda fecha o que falta.
  const maiorCapacidade = cabem.reduce((teto, { capacity }) => Math.max(teto, capacity), 0);

  const lotes: LoteDeVolumes[] = [];
  let restante = item.quantity;

  // No máximo duas voltas: as caixas cheias de uma vez, depois a que fecha.
  while (restante > 0) {
    // `falta` é const do escopo do laço: o fechamento abaixo não enxerga um
    // `restante` que muda embaixo dele.
    const falta = restante;
    const menorQueFecha = daMenorParaMaior.find(({ capacity }) => capacity >= falta);
    if (menorQueFecha) {
      lotes.push({
        volume: { box: menorQueFecha.box, contents: [{ item, quantity: restante }] },
        vezes: 1,
      });
      restante = 0;
      continue;
    }

    // Nenhuma caixa sozinha segura o que falta (falta > maiorCapacidade): fecha
    // caixas cheias da maior até sobrar o que alguma segura. São
    // ⌈(falta − maiorCapacidade) ÷ capacidade da maior⌉ caixas, todas de uma vez.
    const cheias = divisaoParaCima(restante - maiorCapacidade, maior.capacity);
    lotes.push({
      volume: { box: maior.box, contents: [{ item, quantity: maior.capacity }] },
      vezes: cheias,
    });
    restante -= cheias * maior.capacity;
  }

  return fecharLotes(lotes, maxVolumes);
}
