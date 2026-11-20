import type {
  LeadTimeResult,
  ProductLeadTimeInput,
  SupplierLeadTime,
  SupplierLeadTimeInput,
} from './types';

function isValidDays(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Prazo de liberação do fornecedor para um produto.
 * - produto sem prazo, ou igual ao padrão do fornecedor: padrão (`supplier_default`);
 * - produto diferente do padrão (ou fornecedor sem padrão): exceção (`product_exception`);
 * - nenhum dos dois: `supplier_lead_time` faltando.
 */
export function resolveSupplierLeadTime(
  product: ProductLeadTimeInput,
  supplier: SupplierLeadTimeInput | null,
): LeadTimeResult<SupplierLeadTime> {
  if (product === null || product === undefined) {
    return {
      ok: false,
      issue: {
        code: 'invalid_input',
        message: 'O produto é obrigatório para calcular o prazo do fornecedor.',
        productId: null,
      },
    };
  }
  const productDays = product.leadTimeDays;
  const defaultDays = supplier?.defaultLeadTimeDays ?? null;

  if (
    (productDays !== null && !isValidDays(productDays)) ||
    (defaultDays !== null && !isValidDays(defaultDays))
  ) {
    return {
      ok: false,
      issue: {
        code: 'invalid_input',
        message:
          'O prazo do fornecedor precisa ser um número inteiro de dias úteis, zero ou maior.',
        productId: product.productId,
      },
    };
  }

  if (productDays === null || productDays === defaultDays) {
    if (defaultDays === null) {
      return {
        ok: false,
        issue: {
          code: 'supplier_lead_time',
          message:
            'Falta o prazo do fornecedor: cadastre o prazo padrão do fornecedor ou o prazo do produto.',
          productId: product.productId,
        },
      };
    }
    return { ok: true, value: { days: defaultDays, source: 'supplier_default' } };
  }
  return { ok: true, value: { days: productDays, source: 'product_exception' } };
}
