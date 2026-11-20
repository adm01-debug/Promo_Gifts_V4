/**
 * Decide se o prazo de liberação de um produto é o padrão do fornecedor ou uma
 * exceção (decisão 10 do plano de frete, opção C): vazio ou igual ao padrão do
 * fornecedor conta como "padrão"; só um valor diferente é "exceção".
 */
export type LeadTimeSource = 'excecao' | 'padrao';

/** Dias válidos (inteiro ≥ 0); `NaN`, `null` e `undefined` são "vazio". */
function asDays(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * `null` quando não há o que comparar: o fornecedor não tem padrão cadastrado
 * (ou ainda carrega), e o produto tem prazo próprio.
 */
export function getLeadTimeSource(
  productDays: number | null | undefined,
  supplierDefaultDays: number | null | undefined,
): LeadTimeSource | null {
  const own = asDays(productDays);
  const standard = asDays(supplierDefaultDays);
  if (own === null) return standard === null ? null : 'padrao';
  if (standard === null) return null;
  return own === standard ? 'padrao' : 'excecao';
}
