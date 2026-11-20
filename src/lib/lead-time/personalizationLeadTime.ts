import type {
  LeadTimeIssue,
  LeadTimeResult,
  MultiPersonalizationRule,
  PersonalizationInput,
  PersonalizationItemInput,
  PersonalizationLeadTimeEntry,
  PersonalizationLeadTimeResult,
  PersonalizationLookup,
  PriceBandInput,
} from './types';

function issue(
  code: LeadTimeIssue['code'],
  message: string,
  productId: string,
): { ok: false; issue: LeadTimeIssue } {
  return { ok: false, issue: { code, message, productId } };
}

function failure(issues: readonly LeadTimeIssue[]): PersonalizationLeadTimeResult {
  const [first] = issues;
  return first
    ? { ok: false, issue: first, issues }
    : {
        ok: false,
        issue: { code: 'invalid_input', message: 'Falha sem detalhe.', productId: null },
        issues,
      };
}

function structuralProblem(
  item: PersonalizationItemInput,
  personalizations: readonly PersonalizationInput[],
  lookup: PersonalizationLookup,
  rule: MultiPersonalizationRule,
): string | null {
  if (item === null || item === undefined) return 'O item do orçamento é obrigatório.';
  if (
    !Array.isArray(personalizations) ||
    personalizations.some((entry) => entry === null || entry === undefined)
  ) {
    return 'A lista de personalizações do item é obrigatória (use lista vazia quando não há).';
  }
  if (
    lookup === null ||
    lookup === undefined ||
    !Array.isArray(lookup.techniques) ||
    !Array.isArray(lookup.bands)
  ) {
    return 'As técnicas cadastradas e as faixas da tabela de preço são obrigatórias (use listas vazias quando não há).';
  }
  if (rule !== 'max' && rule !== 'sum')
    return 'A regra de várias personalizações precisa ser "max" ou "sum".';
  return null;
}

function isValidDays(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isBandMatch(band: PriceBandInput, tabelaPrecoId: string, quantity: number): boolean {
  return (
    band.tabelaPrecoId === tabelaPrecoId &&
    band.minQuantity <= quantity &&
    (band.maxQuantity === null || quantity <= band.maxQuantity)
  );
}

function resolveEntry(
  item: PersonalizationItemInput,
  personalization: PersonalizationInput,
  lookup: PersonalizationLookup,
): LeadTimeResult<PersonalizationLeadTimeEntry> {
  const { techniqueId, locationCode } = personalization;
  const quantity = personalization.quantity ?? item.quantity;
  const where = locationCode === null ? '' : ` no local "${locationCode}"`;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return issue(
      'invalid_input',
      `A quantidade da personalização${where} precisa ser um número inteiro maior que zero.`,
      item.productId,
    );
  }

  const registered = lookup.techniques.find(
    (row) =>
      row.productId === item.productId &&
      row.locationCode === locationCode &&
      row.tabelaPrecoId === techniqueId,
  );
  if (registered && registered.productionDays !== null) {
    if (!isValidDays(registered.productionDays)) {
      return issue(
        'invalid_input',
        `O prazo cadastrado da personalização${where} precisa ser um número inteiro de dias úteis, zero ou maior.`,
        item.productId,
      );
    }
    return {
      ok: true,
      value: { techniqueId, locationCode, days: registered.productionDays, source: 'registered' },
    };
  }

  // Faixas dimensionais repetem a mesma faixa de quantidade; havendo prazos diferentes, vale o maior (mais seguro).
  const days = lookup.bands
    .filter((band) => isBandMatch(band, techniqueId, quantity))
    .map((band) => band.leadTimeDays)
    .filter((value): value is number => value !== null);
  if (days.length === 0) {
    return issue(
      'personalization_lead_time',
      `Falta o prazo da personalização${where} para ${quantity} unidades: cadastre o prazo da técnica neste produto ou a faixa na tabela de preço.`,
      item.productId,
    );
  }
  if (!days.every(isValidDays)) {
    return issue(
      'invalid_input',
      `O prazo da tabela de preço${where} precisa ser um número inteiro de dias úteis, zero ou maior.`,
      item.productId,
    );
  }
  const longest = Math.max(...days);
  return { ok: true, value: { techniqueId, locationCode, days: longest, source: 'price_table' } };
}

/**
 * Prazo de personalização de um item. Cada personalização usa o prazo cadastrado
 * por produto x local x técnica; sem ele, a faixa da tabela de preço pela
 * quantidade (limites inclusivos). Várias personalizações combinam por
 * `rule`: `max` (rodam em paralelo) ou `sum` (uma depois da outra). Reúne as
 * pendências de TODAS as personalizações em `issues` (`issue` é a primeira).
 */
export function resolvePersonalizationLeadTime(
  item: PersonalizationItemInput,
  personalizations: readonly PersonalizationInput[],
  lookup: PersonalizationLookup,
  rule: MultiPersonalizationRule,
): PersonalizationLeadTimeResult {
  const productId = item === null || item === undefined ? null : item.productId;
  const structure = structuralProblem(item, personalizations, lookup, rule);
  if (structure !== null)
    return failure([{ code: 'invalid_input', message: structure, productId }]);

  const entries: PersonalizationLeadTimeEntry[] = [];
  const issues: LeadTimeIssue[] = [];
  for (const personalization of personalizations) {
    const entry = resolveEntry(item, personalization, lookup);
    if (entry.ok) entries.push(entry.value);
    else issues.push(entry.issue);
  }
  if (issues.length > 0) return failure(issues);
  if (entries.length === 0) return { ok: true, value: { days: 0, source: null, entries } };

  const days =
    rule === 'sum'
      ? entries.reduce((total, entry) => total + entry.days, 0)
      : Math.max(...entries.map((entry) => entry.days));
  const longest = entries.reduce((best, entry) => (entry.days > best.days ? entry : best));
  return { ok: true, value: { days, source: longest.source, entries } };
}
