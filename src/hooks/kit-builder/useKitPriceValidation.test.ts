import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitBox, KitItem } from '@/lib/kit-builder';
import { validateKitPricesForQuote } from './useKitPriceValidation';

const { dbInvokeMock } = vi.hoisted(() => ({ dbInvokeMock: vi.fn() }));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: dbInvokeMock }));

const box = { id: 'box-1', name: 'Caixa', price: 50 } as KitBox;
const item = { id: 'item-1', name: 'Caneta', price: 10 } as KitItem;

describe('validateKitPricesForQuote', () => {
  beforeEach(() => {
    dbInvokeMock.mockReset();
  });

  it('lê os preços atuais da camada Gold uma vez por produto', async () => {
    dbInvokeMock.mockResolvedValue({
      records: [
        { id: 'box-1', sale_price: 50, active: true },
        { id: 'item-1', sale_price: 10, active: true },
      ],
      count: null,
    });

    await expect(validateKitPricesForQuote(box, [item, { ...item, lineId: 'item-1:repetido' }])).resolves.toEqual({
      status: 'unchanged',
    });
    expect(dbInvokeMock).toHaveBeenCalledWith({
      table: 'products',
      operation: 'select',
      select: 'id,sale_price,active',
      filters: { id: ['box-1', 'item-1'] },
      limit: 2,
      countMode: 'none',
    });
  });

  it('detecta preço diferente e identifica a linha que mudou', async () => {
    dbInvokeMock.mockResolvedValue({
      records: [
        { id: 'box-1', sale_price: 50, active: true },
        { id: 'item-1', sale_price: 12.5, active: true },
      ],
      count: null,
    });

    await expect(validateKitPricesForQuote(box, [item])).resolves.toEqual({
      status: 'changed',
      productNames: ['Caneta'],
    });
  });

  it('compara valores na precisão comercial de centavos', async () => {
    dbInvokeMock.mockResolvedValue({
      records: [{ id: 'item-1', sale_price: 10.0000000001, active: true }],
      count: null,
    });

    await expect(validateKitPricesForQuote(null, [item])).resolves.toEqual({
      status: 'unchanged',
    });
  });

  it('falha fechado para valores com fração de centavo', async () => {
    dbInvokeMock.mockResolvedValue({
      records: [{ id: 'item-1', sale_price: 1.005, active: true }],
      count: null,
    });

    await expect(validateKitPricesForQuote(null, [{ ...item, price: 1.005 }])).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it.each([
    ['produto ausente', []],
    ['produto inativo', [{ id: 'item-1', sale_price: 10, active: false }]],
    ['preço ausente', [{ id: 'item-1', sale_price: null, active: true }]],
  ])('falha fechado quando há %s', async (_scenario, records) => {
    dbInvokeMock.mockResolvedValue({ records, count: null });

    await expect(validateKitPricesForQuote(null, [item])).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('falha fechado quando a consulta ao catálogo falha', async () => {
    dbInvokeMock.mockRejectedValueOnce(new Error('PostgREST indisponível'));

    await expect(validateKitPricesForQuote(box, [item])).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('não permite orçamento sem nenhuma linha comercial', async () => {
    await expect(validateKitPricesForQuote(null, [])).resolves.toEqual({
      status: 'unavailable',
    });
    expect(dbInvokeMock).not.toHaveBeenCalled();
  });
});
