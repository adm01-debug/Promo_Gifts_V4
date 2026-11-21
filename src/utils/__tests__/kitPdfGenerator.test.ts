/**
 * kitPdfGenerator — cobertura dos drifts corrigidos no resgate do gerador:
 *  (a) personalização chaveada por `lineId` (mesmo produto em duas variantes);
 *  (b) `priceKnown: false` nunca imprime R$ 0,00 como preço real;
 *  (c) kit mínimo não lança.
 *
 * jspdf e jspdf-autotable são mockados: o teste verifica o CONTEÚDO entregue
 * ao autoTable, não o binário do PDF.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { KitBox, KitItem, KitState } from '@/lib/kit-builder';
import type { FreightPlan } from '@/lib/freight';

const { autoTableMock, jsPdfCtorMock, docStub, textCalls } = vi.hoisted(() => {
  const calls: unknown[][] = [];
  const stub = {
    lastAutoTable: { finalY: 100 },
    internal: { pageSize: { getHeight: () => 297 } },
    addPage: vi.fn(),
    getNumberOfPages: vi.fn(() => 1),
    setPage: vi.fn(),
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    getTextWidth: vi.fn(() => 20),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    text: vi.fn((value: unknown) => {
      calls.push([value]);
    }),
    output: vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' })),
  };
  // Declaração (não arrow): o gerador chama `new jsPDF(...)`.
  function jsPdfStub() {
    return stub;
  }
  return {
    autoTableMock: vi.fn(),
    jsPdfCtorMock: vi.fn(jsPdfStub),
    docStub: stub,
    textCalls: calls,
  };
});

vi.mock('jspdf', () => ({ default: jsPdfCtorMock }));
vi.mock('jspdf-autotable', () => ({ default: autoTableMock }));

const { generateKitPDF } = await import('@/utils/kitPdfGenerator');

function makeItem(overrides: Partial<KitItem> = {}): KitItem {
  return {
    id: 'prod-1',
    name: 'Caneca',
    sku: 'SKU-1',
    imageUrl: null,
    price: 25,
    width: 10,
    height: 10,
    depth: 10,
    volume: 1000,
    quantity: 1,
    ...overrides,
  };
}

function makeBox(overrides: Partial<KitBox> = {}): KitBox {
  return {
    id: 'box-1',
    name: 'Caixa Kraft',
    sku: 'BOX-1',
    imageUrl: null,
    price: 10,
    internalWidth: 30,
    internalHeight: 20,
    internalDepth: 15,
    internalVolume: 9000,
    ...overrides,
  };
}

function makeState(overrides: Partial<KitState> = {}): KitState {
  return {
    name: 'Kit Teste',
    kitType: 'montado',
    box: null,
    items: [],
    personalization: { box: { enabled: false }, items: {} },
    totalItemsVolume: 0,
    availableVolume: 0,
    volumeUsagePercent: 0,
    totalWeight: 0,
    boxPrice: 0,
    itemsPrice: 0,
    personalizationPrice: 0,
    totalPrice: 0,
    isValid: true,
    validationErrors: [],
    ...overrides,
  };
}

/** Linhas do corpo da primeira tabela desenhada (Composição do Kit). */
function compositionBody(): string[][] {
  const call = autoTableMock.mock.calls[0] as [unknown, { body: string[][] }];
  return call[1].body;
}

function allAutoTableBodies(): string[][] {
  return autoTableMock.mock.calls.flatMap(
    (call) => (call as [unknown, { body: string[][] }])[1].body,
  );
}

beforeEach(() => {
  autoTableMock.mockClear();
  jsPdfCtorMock.mockClear();
  docStub.text.mockClear();
  textCalls.length = 0;
});

describe('generateKitPDF', () => {
  it('usa a personalização da linha certa quando o mesmo produto aparece em duas variantes', () => {
    const azul = makeItem({
      id: 'prod-1',
      lineId: 'prod-1:var-azul',
      selectedVariantId: 'var-azul',
      name: 'Caneca Azul',
    });
    const vermelha = makeItem({
      id: 'prod-1',
      lineId: 'prod-1:var-vermelha',
      selectedVariantId: 'var-vermelha',
      name: 'Caneca Vermelha',
    });

    generateKitPDF({
      kitState: makeState({
        items: [azul, vermelha],
        personalization: {
          box: { enabled: false },
          items: {
            'prod-1:var-azul': { enabled: true, techniqueName: 'Serigrafia' },
            'prod-1:var-vermelha': { enabled: true, techniqueName: 'Laser' },
            // Chave legada pelo id do produto: só vale como fallback.
            'prod-1': { enabled: true, techniqueName: 'Bordado' },
          },
        },
      }),
      kitQuantity: 1,
    });

    const body = compositionBody();
    expect(body[0][0]).toBe('Caneca Azul');
    expect(body[0][5]).toBe('Serigrafia');
    expect(body[1][0]).toBe('Caneca Vermelha');
    expect(body[1][5]).toBe('Laser');
    expect(JSON.stringify(body)).not.toContain('Bordado');
  });

  it('cai para a chave legada pelo id do produto quando não há entrada por lineId', () => {
    generateKitPDF({
      kitState: makeState({
        items: [makeItem({ id: 'prod-9', name: 'Caderno' })],
        personalization: {
          box: { enabled: false },
          items: { 'prod-9': { enabled: true, techniqueName: 'Hot Stamping' } },
        },
      }),
      kitQuantity: 1,
    });

    expect(compositionBody()[0][5]).toBe('Hot Stamping');
  });

  it('não imprime R$ 0,00 para item com priceKnown false', () => {
    generateKitPDF({
      kitState: makeState({
        box: makeBox(),
        items: [makeItem({ price: 0, priceKnown: false, name: 'Caneca sem preço' })],
      }),
      kitQuantity: 1,
    });

    const body = compositionBody();
    const semPreco = body.find((row) => row[0] === 'Caneca sem preço');
    expect(semPreco?.[4]).toBe('Não informado');

    // Nenhuma tabela (composição ou detalhamento) pode exibir zero como preço.
    expect(JSON.stringify(allAutoTableBodies())).not.toContain('R$ 0,00');
    // E o detalhamento de preços não é renderizado como tabela de números.
    const printed = textCalls.flat().map((v) => JSON.stringify(v));
    expect(printed.some((t) => t.includes('Há preço não informado ou inválido'))).toBe(true);
  });

  it('imprime o piso/setup da personalização no detalhamento de preços', () => {
    generateKitPDF({
      kitState: makeState({
        items: [makeItem()],
        personalization: {
          box: { enabled: false },
          items: {
            'prod-1:base': {
              enabled: true,
              techniqueName: 'Serigrafia',
              estimatedPrice: 2,
              setupCost: 80,
            },
          },
        },
      }),
      kitQuantity: 10,
    });

    const flat = JSON.stringify(allAutoTableBodies());
    expect(flat).toContain('Piso/setup considerado');
    expect(flat).toContain('80,00');
  });

  it('não lança com kit mínimo (sem caixa, sem itens) e devolve um Blob', () => {
    expect(() => generateKitPDF({ kitState: makeState(), kitQuantity: 1 })).not.toThrow();
    const blob = generateKitPDF({ kitState: makeState(), kitQuantity: 1 });
    expect(blob).toBeInstanceOf(Blob);
    expect(jsPdfCtorMock).toHaveBeenCalled();
  });

  it('imprime a seção de volumes para transporte quando o plano de frete está ok', () => {
    const plan = makeFreightPlan({ status: 'ok' });
    generateKitPDF({ kitState: makeState(), kitQuantity: 1, freightPlan: plan });

    const printed = textCalls.flat().map((v) => JSON.stringify(v));
    expect(printed.some((t) => t.includes('Volumes para transporte'))).toBe(true);
    // formatPlanForClient: só totais, conversa de cliente
    expect(printed.some((t) => t.includes('1 volume · 18,4 kg · 0,21 m³'))).toBe(true);
    // Nenhum detalhe interno de vendedor vaza para o cliente
    expect(JSON.stringify(printed)).not.toContain('Caixa G');
    expect(JSON.stringify(printed)).not.toContain('cubado');
  });

  it('não imprime a seção quando o plano tem dados insuficientes', () => {
    const plan = makeFreightPlan({ status: 'dados_insuficientes' });
    generateKitPDF({ kitState: makeState(), kitQuantity: 1, freightPlan: plan });

    const printed = textCalls.flat().map((v) => JSON.stringify(v));
    expect(printed.some((t) => t.includes('Volumes para transporte'))).toBe(false);
  });

  it('não quebra sem plano de frete (comportamento atual)', () => {
    expect(() =>
      generateKitPDF({ kitState: makeState({ items: [makeItem()] }), kitQuantity: 1 }),
    ).not.toThrow();
    const printed = textCalls.flat().map((v) => JSON.stringify(v));
    expect(printed.some((t) => t.includes('Volumes para transporte'))).toBe(false);
  });
});

function makeFreightPlan(overrides: Partial<FreightPlan> = {}): FreightPlan {
  return {
    status: 'ok',
    volumes: [
      {
        box: {
          id: 'box-g',
          code: 'G',
          name: 'Caixa G',
          inner: { width: 40, height: 30, depth: 30 },
          outer: { width: 42, height: 32, depth: 32 },
          emptyWeightG: 400,
          maxWeightG: 30000,
          fillFactor: 0.9,
        },
        items: [{ productId: 'prod-1', quantity: 1 }],
        grossWeightG: 18400,
        cubicWeightG: { correios: 31000, rodoviario: 25000 },
        volumeM3: 0.21,
        fillRatio: 0.8,
      },
    ],
    totals: {
      boxesByCode: { G: 1 },
      grossWeightG: 18400,
      volumeM3: 0.21,
      cubicWeightG: { correios: 31000, rodoviario: 25000 },
    },
    warnings: [],
    missing: [],
    mixMode: 'misturar',
    computedAt: '2026-11-21T12:00:00.000Z',
    itemsHash: 'hash-test',
    ...overrides,
  };
}
