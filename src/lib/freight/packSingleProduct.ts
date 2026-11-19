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
 */
import { daMaiorParaMenor } from './boxOrder';
import type { VolumeDraft } from './computeVolumeTotals';
import { fitCount } from './fitCount';
import type { FreightSettings, PackItem, ShippingBox } from './types';

export type PackResult =
  { status: 'nao_cabe'; item: PackItem } | { status: 'ok'; volumes: VolumeDraft[] };

export function packSingleProduct(
  item: PackItem,
  boxes: readonly ShippingBox[],
  settings: FreightSettings,
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

  const volumes: VolumeDraft[] = [];
  let restante = item.quantity;

  while (restante > 0) {
    // `falta` é const do escopo do laço: o fechamento abaixo não enxerga um
    // `restante` que muda embaixo dele.
    const falta = restante;
    const menorQueFecha = daMenorParaMaior.find(({ capacity }) => capacity >= falta);
    if (menorQueFecha) {
      volumes.push({ box: menorQueFecha.box, contents: [{ item, quantity: restante }] });
      restante = 0;
      continue;
    }

    // Nenhuma caixa sozinha segura o que falta: fecha uma da maior, cheia.
    volumes.push({ box: maior.box, contents: [{ item, quantity: maior.capacity }] });
    restante -= maior.capacity;
  }

  return { status: 'ok', volumes };
}
