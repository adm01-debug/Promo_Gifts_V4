import { describe, expect, it } from 'vitest';
import { resolveSupplierLeadTime } from '../supplierLeadTime';

const produto = (leadTimeDays: number | null) => ({ productId: 'p1', leadTimeDays });
const fornecedor = (defaultLeadTimeDays: number | null) => ({ defaultLeadTimeDays });

describe('resolveSupplierLeadTime', () => {
  it.each([
    // produto sem prazo (null) -> usa o padrão do fornecedor: 3
    [
      'produto null herda o padrão',
      produto(null),
      fornecedor(3),
      { days: 3, source: 'supplier_default' },
    ],
    // produto 3 == padrão 3 -> continua herdado: 3
    [
      'produto igual ao padrão é herdado',
      produto(3),
      fornecedor(3),
      { days: 3, source: 'supplier_default' },
    ],
    // produto 5 != padrão 3 -> exceção: 5
    [
      'produto diferente do padrão é exceção',
      produto(5),
      fornecedor(3),
      { days: 5, source: 'product_exception' },
    ],
    // produto 0 != padrão 3 -> exceção válida de 0 dias
    [
      'zero dia é exceção válida',
      produto(0),
      fornecedor(3),
      { days: 0, source: 'product_exception' },
    ],
    // fornecedor sem padrão, produto 4 -> o produto é a única fonte: exceção 4
    [
      'fornecedor sem padrão, produto com prazo',
      produto(4),
      fornecedor(null),
      { days: 4, source: 'product_exception' },
    ],
    // sem registro do fornecedor (null), produto 4 -> exceção 4
    [
      'sem configuração do fornecedor, produto com prazo',
      produto(4),
      null,
      { days: 4, source: 'product_exception' },
    ],
  ])('%s', (_nome, product, supplier, esperado) => {
    expect(resolveSupplierLeadTime(product, supplier)).toEqual({ ok: true, value: esperado });
  });

  it.each([
    ['nem produto nem fornecedor têm prazo', produto(null), fornecedor(null)],
    ['sem configuração do fornecedor e sem prazo no produto', produto(null), null],
  ])('%s: devolve supplier_lead_time faltando', (_nome, product, supplier) => {
    const result = resolveSupplierLeadTime(product, supplier);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issue.code).toBe('supplier_lead_time');
      expect(result.issue.productId).toBe('p1');
    }
  });

  it.each([
    ['produto negativo', produto(-1), fornecedor(3)],
    ['produto fracionado', produto(2.5), fornecedor(3)],
    ['padrão negativo', produto(null), fornecedor(-2)],
    ['padrão NaN', produto(null), fornecedor(Number.NaN)],
  ])('%s: devolve invalid_input', (_nome, product, supplier) => {
    const result = resolveSupplierLeadTime(product, supplier);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.code).toBe('invalid_input');
  });

  it('produto nulo ou indefinido é invalid_input, não exceção', () => {
    // @ts-expect-error entrada fora do tipo, de propósito
    const withNull = resolveSupplierLeadTime(null, { defaultLeadTimeDays: 3 });
    // @ts-expect-error entrada fora do tipo, de propósito
    const withUndefined = resolveSupplierLeadTime(undefined, null);
    expect(!withNull.ok && withNull.issue.code).toBe('invalid_input');
    expect(!withUndefined.ok && withUndefined.issue.code).toBe('invalid_input');
  });
});
