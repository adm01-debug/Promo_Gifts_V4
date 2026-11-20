/**
 * Texto do plano para o CLIENTE: só os totais.
 *
 * Formato: `4 volumes · 18,4 kg · 0,21 m³`. Sem código de caixa, ocupação,
 * fator de aproveitamento, peso cubado nem avisos: isso é conversa interna do
 * vendedor (para ela, `formatPlanSummary`). O peso é o bruto, o que o cliente
 * vai ver na balança.
 */
import type { FreightPlan } from './types';

const KG = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const GRAMS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const M3 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Abaixo de 1 kg o peso sai em gramas: `0,0 kg` não diz nada ao cliente. */
function formatWeight(grams: number): string {
  const rounded = Math.round(grams);
  return rounded < 1000 ? `${GRAMS.format(rounded)} g` : `${KG.format(grams / 1000)} kg`;
}

export function formatPlanForClient(plan: FreightPlan): string {
  if (plan.status !== 'ok' || plan.volumes.length === 0) return '';

  const quantos = plan.volumes.length;
  const volumes = quantos === 1 ? '1 volume' : `${quantos} volumes`;
  const peso = formatWeight(plan.totals.grossWeightG);
  const m3 = M3.format(plan.totals.volumeM3);

  return `${volumes} · ${peso} · ${m3} m³`;
}
