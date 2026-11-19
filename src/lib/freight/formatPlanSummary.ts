/**
 * Resumo do plano em uma linha, para cabeçalho de card e barra de resumo.
 *
 * Formato: `3× G + 1× P · 18,4 kg · 0,21 m³ · cubado 35,0 kg`.
 *
 * O peso cubado mostrado é o dos **Correios** (divisor 6.000 cm³/kg). Qual
 * divisor vale é decisão da cotação (bloco I); para um resumo de tela o dos
 * Correios é o de leitura mais comum, e o rodoviário continua disponível em
 * `totals.cubicWeightG.rodoviario`.
 */
import { volumeInternoCm3 } from './boxOrder';
import type { FreightPlan } from './types';

const KG = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const M3 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatPlanSummary(plan: FreightPlan): string {
  if (plan.status !== 'ok' || plan.volumes.length === 0) return '';

  // Da maior caixa para a menor, por volume interno: é a ordem em que o
  // expedidor fala ("duas G e uma P"), não a alfabética.
  const porCodigo = new Map<string, { quantas: number; volumeInterno: number }>();
  for (const volume of plan.volumes) {
    const atual = porCodigo.get(volume.box.code);
    porCodigo.set(volume.box.code, {
      quantas: (atual?.quantas ?? 0) + 1,
      volumeInterno: volumeInternoCm3(volume.box),
    });
  }

  const caixas = [...porCodigo.entries()]
    .sort(([codeA, a], [codeB, b]) =>
      b.volumeInterno !== a.volumeInterno
        ? b.volumeInterno - a.volumeInterno
        : codeA.localeCompare(codeB),
    )
    .map(([code, { quantas }]) => `${quantas}× ${code}`)
    .join(' + ');

  const kg = KG.format(plan.totals.grossWeightG / 1000);
  const m3 = M3.format(plan.totals.volumeM3);
  const cubado = KG.format(plan.totals.cubicWeightG.correios / 1000);

  return `${caixas} · ${kg} kg · ${m3} m³ · cubado ${cubado} kg`;
}
