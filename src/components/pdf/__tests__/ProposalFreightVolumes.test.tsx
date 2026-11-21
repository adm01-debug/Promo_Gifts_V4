/**
 * Etapa 69 — bloco de volumes no PDF.
 *
 * `ProposalHtmlTemplate` só renderiza o bloco "Volumes estimados para
 * transporte" quando o plano está ok E `showFreightPlanToClient === true`.
 * O `ProposalFreightVolumes` é validado com snapshot estável (relógio congelado).
 */
import React from 'react';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProposalHtmlTemplate, type ProposalTemplateData } from '../ProposalHtmlTemplate';
import { ProposalFreightVolumes } from '../proposal/ProposalFreightVolumes';
import { computeItemsHash, planFreight, type FreightPlan } from '@/lib/freight';
import { CAIXAS_PADRAO, SETTINGS_PADRAO } from '@/lib/freight/__tests__/fixtures/boxes';
import { LINHA_CADERNETA, LINHA_SQUEEZE } from '@/lib/freight/__tests__/fixtures/items';

const FROZEN_ISO = '2026-03-15T12:34:56.000Z';
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FROZEN_ISO));
});
afterAll(() => {
  vi.useRealTimers();
});

const PLAN: FreightPlan = planFreight(
  [
    { row: LINHA_CADERNETA, quantity: 2 },
    { row: LINHA_SQUEEZE, quantity: 1 },
  ],
  CAIXAS_PADRAO,
  {
    mixMode: 'misturar',
    computedAt: FROZEN_ISO,
    itemsHash: computeItemsHash([
      { productId: LINHA_CADERNETA.id, quantity: 2 },
      { productId: LINHA_SQUEEZE.id, quantity: 1 },
    ]),
  },
  SETTINGS_PADRAO,
);

function makeData(overrides: Partial<ProposalTemplateData> = {}): ProposalTemplateData {
  return {
    quoteNumber: '10015/26',
    date: '15/03/2026',
    validUntil: '30/03/2026',
    client: { name: 'Contato ACME', company: 'ACME Indústria e Comércio LTDA' },
    seller: { name: 'João Vendedor' },
    items: [
      { name: 'Caneta metálica premium', sku: 'PV-10570', quantity: 500, unitPrice: 12.9 },
    ],
    subtotal: 6450,
    shippingType: 'cif',
    shippingCost: 0,
    total: 6450,
    freightPlan: { status: 'ok', plan: PLAN },
    showFreightPlanToClient: true,
    ...overrides,
  };
}

describe('ProposalHtmlTemplate — bloco de volumes (etapa 69)', () => {
  it('sem plano ou sem permissão → bloco NÃO aparece', () => {
    const semPlano = makeData({ freightPlan: null });
    const htmlA = renderToStaticMarkup(<ProposalHtmlTemplate data={semPlano} />);
    expect(htmlA).not.toContain('Volumes estimados para transporte');

    const semAutorizacao = makeData({ showFreightPlanToClient: false });
    const htmlB = renderToStaticMarkup(<ProposalHtmlTemplate data={semAutorizacao} />);
    expect(htmlB).not.toContain('Volumes estimados para transporte');
  });

  it('plano ok + autorizado → bloco aparece com caixas e totais', () => {
    const html = renderToStaticMarkup(<ProposalHtmlTemplate data={makeData()} />);
    expect(html).toContain('Volumes estimados para transporte');
    expect(html).toContain('Peso total:');
    expect(html).toContain('Volume total:');
  });
});

describe('ProposalFreightVolumes — snapshot estável', () => {
  it('renderiza a tabela Caixa × Quantidade e os totais', () => {
    const html = renderToStaticMarkup(<ProposalFreightVolumes plan={PLAN} />);
    expect(html).toMatchSnapshot();
    expect(html).toContain('<table');
    expect(html).toContain('Caixa P');
  });
});
