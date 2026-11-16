import { describe, expect, it } from 'vitest';
import { quoteDraftRecoverySchema } from '../quoteDraftRecovery';

/**
 * Contrato do validador usado por QuoteAutoSave.loadDraft.
 *
 * Antes dele, loadDraft devolvia `draft.data` como `unknown` e o consumidor lia os campos
 * direto (useQuoteBuilderState lê saved.shippingType, saved.shippingCost, saved.validUntil,
 * saved.notes). Um rascunho gravado por versão anterior do app, truncado por cota ou editado
 * à mão entrava no estado da tela sem conferência.
 */
describe('quoteDraftRecoverySchema', () => {
  it('aceita rascunho vazio — autosave grava parcial desde a primeira tecla', () => {
    expect(quoteDraftRecoverySchema.safeParse({}).success).toBe(true);
  });

  it('aceita o rascunho típico de um orçamento em edição', () => {
    const r = quoteDraftRecoverySchema.safeParse({
      clientId: 'c-1',
      companyInfo: { id: 'c-1', name: 'Acme' },
      validUntil: '2026-12-31',
      deliveryMode: 'prazo',
      shippingType: 'pac',
      shippingCost: 42.5,
      notes: 'entregar na portaria',
      items: [{ product_id: 'p-1', product_name: 'Caneca', quantity: 10, unit_price: 12.9 }],
    });
    expect(r.success).toBe(true);
  });

  it('preserva campo desconhecido em vez de descartar o rascunho', () => {
    const r = quoteDraftRecoverySchema.safeParse({ clientId: 'c-1', campoNovoDoFuturo: 7 });
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as Record<string, unknown>).campoNovoDoFuturo).toBe(7);
  });

  it('recusa valor numérico que chegou como texto', () => {
    expect(quoteDraftRecoverySchema.safeParse({ shippingCost: 'muito caro' }).success).toBe(false);
  });

  it('recusa NaN e Infinity, que sobrevivem a um JSON.parse malfeito', () => {
    expect(quoteDraftRecoverySchema.safeParse({ shippingCost: Number.NaN }).success).toBe(false);
    expect(
      quoteDraftRecoverySchema.safeParse({ discountValue: Number.POSITIVE_INFINITY }).success,
    ).toBe(false);
  });

  it('recusa data de validade que não é uma data de calendário', () => {
    expect(quoteDraftRecoverySchema.safeParse({ validUntil: '2026-02-31' }).success).toBe(false);
    expect(quoteDraftRecoverySchema.safeParse({ validUntil: '31/12/2026' }).success).toBe(false);
    expect(quoteDraftRecoverySchema.safeParse({ validUntil: '' }).success).toBe(true);
  });

  it('recusa item sem os campos que a tela usa para calcular o total', () => {
    expect(
      quoteDraftRecoverySchema.safeParse({ items: [{ product_name: 'Caneca', quantity: 10 }] })
        .success,
    ).toBe(false);
    expect(
      quoteDraftRecoverySchema.safeParse({
        items: [{ product_id: 'p-1', product_name: 'Caneca', quantity: 'dez', unit_price: 1 }],
      }).success,
    ).toBe(false);
  });

  it('recusa modo de entrega fora do par aceito pela tela', () => {
    expect(quoteDraftRecoverySchema.safeParse({ deliveryMode: 'retirada' }).success).toBe(false);
    expect(quoteDraftRecoverySchema.safeParse({ deliveryMode: 'data' }).success).toBe(true);
  });
});
