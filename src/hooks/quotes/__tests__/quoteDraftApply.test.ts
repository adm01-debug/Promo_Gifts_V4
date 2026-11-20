/**
 * Testes — quoteDraftApply
 *
 * Cobre o contrato que faltava: ler o rascunho que o QuoteAutoSave grava em
 * `quote_draft_<quoteId>` e aplicá-lo de volta ao builder.
 *
 * O teste mais importante aqui é a ORDEM do frete. O `setShippingType` exposto
 * pelo useQuoteBuilderState é o handleShippingTypeChange (:155-170), que zera o
 * shippingCost quando o tipo não é 'fob_pre'. Se alguém reordenar as duas
 * chamadas em applyDraftToBuilder, a restauração perde o frete — e é isso que
 * `preserva o frete` abaixo trava.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyDraftToBuilder,
  discardStoredQuoteDraft,
  draftDiffersFromCurrent,
  inspectStoredQuoteDraft,
  quoteDraftKey,
  readStoredQuoteDraft,
} from '../quoteDraftApply';

function makeTarget() {
  const order: string[] = [];
  const spy = (name: string) =>
    vi.fn(() => {
      order.push(name);
    });
  return {
    order,
    target: {
      setClientId: spy('setClientId'),
      setContactId: spy('setContactId'),
      setCompanyInfo: spy('setCompanyInfo'),
      setContactInfo: spy('setContactInfo'),
      setItems: spy('setItems'),
      setDiscountType: spy('setDiscountType'),
      setDiscountValue: spy('setDiscountValue'),
      setNegotiationMarkup: spy('setNegotiationMarkup'),
      setPaymentMethod: spy('setPaymentMethod'),
      setPaymentTerms: spy('setPaymentTerms'),
      setDeliveryTime: spy('setDeliveryTime'),
      setShippingType: spy('setShippingType'),
      setShippingCost: spy('setShippingCost'),
      setFreightMixMode: spy('setFreightMixMode'),
      setShowFreightPlanToClient: spy('setShowFreightPlanToClient'),
      setValidUntil: spy('setValidUntil'),
      setValidityDays: spy('setValidityDays'),
      setNotes: spy('setNotes'),
      handleDeliveryModeChange: spy('handleDeliveryModeChange'),
      handleDeliveryDateChange: spy('handleDeliveryDateChange'),
    },
  };
}

const KEY = quoteDraftKey('quote-1');

function storeDraft(data: unknown, savedAt = '2026-11-17T10:00:00.000Z') {
  localStorage.setItem(KEY, JSON.stringify({ id: 'quote-1', data, savedAt, version: 1 }));
}

const item = {
  product_id: 'p1',
  product_name: 'Caneca',
  quantity: 10,
  unit_price: 12.5,
};

const emptyCurrent = {
  clientId: '',
  contactId: '',
  validUntil: '',
  discountType: 'percent' as const,
  discountValue: 0,
  negotiationMarkup: 0,
  paymentMethod: '',
  paymentTerms: '',
  deliveryTime: '',
  shippingType: '',
  shippingCost: 0,
  notes: '',
  items: [],
};

beforeEach(() => {
  localStorage.clear();
});

describe('quoteDraftKey', () => {
  it('usa o prefixo que o QuoteAutoSave grava', () => {
    expect(quoteDraftKey('abc')).toBe('quote_draft_abc');
  });
});

describe('readStoredQuoteDraft', () => {
  it('devolve null quando não há rascunho', () => {
    expect(readStoredQuoteDraft(KEY)).toBeNull();
  });

  it('devolve null e não lança quando o envelope está corrompido', () => {
    localStorage.setItem(KEY, '{nao-e-json');
    expect(readStoredQuoteDraft(KEY)).toBeNull();
  });

  it('não apaga o rascunho corrompido — descartar é decisão do usuário', () => {
    localStorage.setItem(KEY, '{nao-e-json');
    readStoredQuoteDraft(KEY);
    expect(localStorage.getItem(KEY)).toBe('{nao-e-json');
  });

  it('devolve null quando o conteúdo não passa pelo schema', () => {
    storeDraft({ items: [{ product_id: 'p1' }] });
    expect(readStoredQuoteDraft(KEY)).toBeNull();
  });

  it('devolve null quando savedAt não é data válida', () => {
    storeDraft({ notes: 'x' }, 'ontem');
    expect(readStoredQuoteDraft(KEY)).toBeNull();
  });

  it('lê o rascunho válido com savedAt em epoch ms', () => {
    storeDraft({ notes: 'oi', items: [item] });
    const stored = readStoredQuoteDraft(KEY);
    expect(stored?.savedAt).toBe(new Date('2026-11-17T10:00:00.000Z').getTime());
    expect(stored?.data.notes).toBe('oi');
    expect(stored?.data.items).toHaveLength(1);
  });
});

describe('draftDiffersFromCurrent', () => {
  it('nulo no rascunho e vazio na tela não contam como diferença', () => {
    expect(draftDiffersFromCurrent({}, emptyCurrent)).toBe(false);
  });

  it('detecta item a mais no rascunho', () => {
    expect(draftDiffersFromCurrent({ items: [item] }, emptyCurrent)).toBe(true);
  });

  it('detecta desconto diferente', () => {
    expect(draftDiffersFromCurrent({ discountValue: 15 }, emptyCurrent)).toBe(true);
  });

  it('não acusa diferença quando o rascunho repete a tela', () => {
    expect(
      draftDiffersFromCurrent(
        { notes: 'igual', items: [item] },
        { ...emptyCurrent, notes: 'igual', items: [item] },
      ),
    ).toBe(false);
  });
});

describe('applyDraftToBuilder', () => {
  it('restaura o modo de mistura e o switch do plano de volumes', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ freightMixMode: 'separar', showFreightPlanToClient: true }, target);

    expect(target.setFreightMixMode).toHaveBeenCalledWith('separar');
    expect(target.setShowFreightPlanToClient).toHaveBeenCalledWith(true);
  });

  it('valor estranho no rascunho vira o padrão (misturar, desligado)', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ freightMixMode: 'qualquer', showFreightPlanToClient: 'sim' }, target);

    expect(target.setFreightMixMode).toHaveBeenCalledWith('misturar');
    expect(target.setShowFreightPlanToClient).toHaveBeenCalledWith(false);
  });

  it('rascunho antigo, sem os dois campos, não mexe no plano', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ notes: 'x' }, target);

    expect(target.setFreightMixMode).not.toHaveBeenCalled();
    expect(target.setShowFreightPlanToClient).not.toHaveBeenCalled();
  });

  it('preserva o frete: setShippingType vem antes de setShippingCost', () => {
    const { order, target } = makeTarget();
    applyDraftToBuilder({ shippingType: 'cif', shippingCost: 1234 }, target);

    expect(target.setShippingType).toHaveBeenCalledWith('cif');
    expect(target.setShippingCost).toHaveBeenCalledWith(1234);
    expect(order.indexOf('setShippingType')).toBeLessThan(order.indexOf('setShippingCost'));
  });

  it('entrega por data: muda o modo antes de aplicar a data (o handler limpa o campo)', () => {
    const { order, target } = makeTarget();
    applyDraftToBuilder({ deliveryTime: 'date:2026-12-24' }, target);

    expect(target.handleDeliveryModeChange).toHaveBeenCalledWith('data');
    expect(target.handleDeliveryDateChange).toHaveBeenCalledTimes(1);
    expect(order.indexOf('handleDeliveryModeChange')).toBeLessThan(
      order.indexOf('handleDeliveryDateChange'),
    );
    expect(target.setDeliveryTime).not.toHaveBeenCalled();
  });

  it('entrega por prazo: muda o modo antes de gravar o texto', () => {
    const { order, target } = makeTarget();
    applyDraftToBuilder({ deliveryTime: '15 dias úteis' }, target);

    expect(target.handleDeliveryModeChange).toHaveBeenCalledWith('prazo');
    expect(target.setDeliveryTime).toHaveBeenCalledWith('15 dias úteis');
    expect(order.indexOf('handleDeliveryModeChange')).toBeLessThan(
      order.indexOf('setDeliveryTime'),
    );
    expect(target.handleDeliveryDateChange).not.toHaveBeenCalled();
  });

  it('sincroniza o Select de validade junto com a data (QBP-12)', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ validUntil: '2026-12-01' }, target);

    expect(target.setValidUntil).toHaveBeenCalledWith('2026-12-01');
    expect(target.setValidityDays).toHaveBeenCalledTimes(1);
  });

  it('não toca em campo ausente do rascunho', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ notes: 'só isso' }, target);

    expect(target.setNotes).toHaveBeenCalledWith('só isso');
    expect(target.setClientId).not.toHaveBeenCalled();
    expect(target.setItems).not.toHaveBeenCalled();
    expect(target.setShippingType).not.toHaveBeenCalled();
  });

  it('ignora markup zero ou negativo, como o onRestore original', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ negotiationMarkup: 0 }, target);
    expect(target.setNegotiationMarkup).not.toHaveBeenCalled();
  });

  it('aplica itens e cliente do rascunho', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ clientId: 'c1', items: [item] }, target);
    expect(target.setClientId).toHaveBeenCalledWith('c1');
    expect(target.setItems).toHaveBeenCalledWith([item]);
  });
});

describe('discardStoredQuoteDraft', () => {
  it('remove o rascunho e todo o histórico _v<n>', () => {
    storeDraft({ notes: 'x' });
    localStorage.setItem(`${KEY}_v1`, '{}');
    localStorage.setItem(`${KEY}_v2`, '{}');
    localStorage.setItem('quote_draft_outro', '{}');

    discardStoredQuoteDraft(KEY);

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(`${KEY}_v1`)).toBeNull();
    expect(localStorage.getItem(`${KEY}_v2`)).toBeNull();
    expect(localStorage.getItem('quote_draft_outro')).toBe('{}');
  });
});

describe('applyDraftToBuilder — campos colhidos do QuoteBuilderDraftRecovery de outro agente', () => {
  it('respeita deliveryMode explícito "prazo" mesmo sem prefixo date:', () => {
    const { order, target } = makeTarget();
    applyDraftToBuilder({ deliveryMode: 'prazo', deliveryTime: '20 dias' }, target);

    expect(target.handleDeliveryModeChange).toHaveBeenCalledWith('prazo');
    expect(target.setDeliveryTime).toHaveBeenCalledWith('20 dias');
    expect(target.handleDeliveryDateChange).not.toHaveBeenCalled();
    expect(order.indexOf('handleDeliveryModeChange')).toBeLessThan(
      order.indexOf('setDeliveryTime'),
    );
  });

  it('respeita deliveryMode explícito "data" usando deliveryDate ISO', () => {
    const { order, target } = makeTarget();
    applyDraftToBuilder({ deliveryMode: 'data', deliveryDate: '2026-12-24T12:00:00.000Z' }, target);

    expect(target.handleDeliveryModeChange).toHaveBeenCalledWith('data');
    expect(target.handleDeliveryDateChange).toHaveBeenCalledTimes(1);
    const [dataAplicada] = target.handleDeliveryDateChange.mock.calls[0];
    expect(dataAplicada instanceof Date).toBe(true);
    expect((dataAplicada as Date).toISOString()).toBe('2026-12-24T12:00:00.000Z');
    expect(order.indexOf('handleDeliveryModeChange')).toBeLessThan(
      order.indexOf('handleDeliveryDateChange'),
    );
  });

  it('modo "data" sem data alguma não inventa data', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ deliveryMode: 'data' }, target);

    expect(target.handleDeliveryModeChange).toHaveBeenCalledWith('data');
    expect(target.handleDeliveryDateChange).not.toHaveBeenCalled();
    expect(target.setDeliveryTime).not.toHaveBeenCalled();
  });

  it('deliveryDate explícito vence o prefixo date: do deliveryTime', () => {
    const { target } = makeTarget();
    applyDraftToBuilder(
      {
        deliveryMode: 'data',
        deliveryTime: 'date:2026-01-01',
        deliveryDate: '2026-07-15T12:00:00.000Z',
      },
      target,
    );

    const [dataAplicada] = target.handleDeliveryDateChange.mock.calls[0];
    expect((dataAplicada as Date).toISOString()).toBe('2026-07-15T12:00:00.000Z');
  });

  it('usa o validityDays do rascunho em vez de deduzir da data', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ validUntil: '2026-12-01', validityDays: '45' }, target);

    expect(target.setValidUntil).toHaveBeenCalledWith('2026-12-01');
    expect(target.setValidityDays).toHaveBeenCalledWith('45');
  });

  it('aplica validityDays mesmo sem validUntil', () => {
    const { target } = makeTarget();
    applyDraftToBuilder({ validityDays: '15' }, target);

    expect(target.setValidityDays).toHaveBeenCalledWith('15');
    expect(target.setValidUntil).not.toHaveBeenCalled();
  });
});

describe('inspectStoredQuoteDraft — distingue ausente de ilegível', () => {
  it('ausente quando não há nada gravado', () => {
    expect(inspectStoredQuoteDraft(KEY)).toEqual({ estado: 'ausente' });
  });

  it('ilegível/json-invalido quando o arquivo não é JSON', () => {
    localStorage.setItem(KEY, '{nao-e-json');
    expect(inspectStoredQuoteDraft(KEY)).toEqual({ estado: 'ilegivel', motivo: 'json-invalido' });
  });

  it('ilegível/envelope-invalido quando o JSON não é objeto', () => {
    localStorage.setItem(KEY, '"so-uma-string"');
    expect(inspectStoredQuoteDraft(KEY)).toEqual({
      estado: 'ilegivel',
      motivo: 'envelope-invalido',
    });
  });

  it('ilegível/data-invalida quando savedAt não é data', () => {
    storeDraft({ notes: 'x' }, 'ontem');
    expect(inspectStoredQuoteDraft(KEY)).toEqual({ estado: 'ilegivel', motivo: 'data-invalida' });
  });

  it('ilegível/fora-de-forma quando o conteúdo não passa pelo schema', () => {
    storeDraft({ items: [{ product_id: 'p1' }] });
    expect(inspectStoredQuoteDraft(KEY)).toEqual({ estado: 'ilegivel', motivo: 'fora-de-forma' });
  });

  it('ok com o rascunho quando está íntegro', () => {
    storeDraft({ notes: 'oi' });
    const r = inspectStoredQuoteDraft(KEY);
    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') expect(r.draft.data.notes).toBe('oi');
  });

  it('nenhum estado ilegível apaga o rascunho — descartar é do usuário', () => {
    localStorage.setItem(KEY, '{nao-e-json');
    inspectStoredQuoteDraft(KEY);
    expect(localStorage.getItem(KEY)).toBe('{nao-e-json');
  });

  it('readStoredQuoteDraft devolve null em qualquer estado que não seja ok', () => {
    localStorage.setItem(KEY, '{nao-e-json');
    expect(readStoredQuoteDraft(KEY)).toBeNull();
    localStorage.clear();
    expect(readStoredQuoteDraft(KEY)).toBeNull();
  });
});
