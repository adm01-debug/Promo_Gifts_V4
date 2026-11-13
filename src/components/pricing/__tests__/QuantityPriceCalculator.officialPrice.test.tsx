/**
 * QuantityPriceCalculator — tabela de comparação usa o preço OFICIAL
 * (RPC fn_get_customization_price), o mesmo enviado ao orçamento no handoff.
 * Tabela, card de configuração e CTA reais; só a RPC e a busca/seleção são mockadas.
 */
import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
const rpc = vi.fn();
vi.mock('@/lib/external-rpc', () => ({ invokeExternalRpc: (...a: unknown[]) => rpc(...a) }));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));
vi.mock('@/lib/personalization/rpc-validator', () => ({ validateRpcPayload: vi.fn() }));
vi.mock('@/components/pricing/simulator/ProductSearch', () => ({
  ProductSearch: ({ onSelect }: { onSelect: (p: unknown) => void }) => (
    <button onClick={() => onSelect({ id: 'p1', name: 'Caneta', sku: 'C1', price: 2, images: [] })}>
      pick
    </button>
  ),
}));
const technique = (id: string, name: string) => ({
  id,
  techniqueId: id,
  techniqueName: name,
  techniqueCode: name.toUpperCase(),
  componentName: 'Corpo',
  locationName: 'Corpo',
  locationCode: 'C',
  composedCode: name.toUpperCase(),
  maxWidth: null,
  maxHeight: null,
  maxArea: null,
  maxColors: 2,
  isDefault: false,
});
vi.mock('@/components/pricing/calculator/TechniqueMultiSelector', () => ({
  TechniqueMultiSelector: ({
    onToggleTechnique,
  }: {
    onToggleTechnique: (t: unknown, add: boolean) => void;
  }) => (
    <>
      <button onClick={() => onToggleTechnique(technique('area-1', 'Laser'), true)}>tech</button>
      <button onClick={() => onToggleTechnique(technique('area-2', 'Silk'), true)}>tech2</button>
    </>
  ),
}));

import { QuantityPriceCalculator } from '@/components/pricing/QuantityPriceCalculator';
import { formatCurrency } from '@/components/pricing/calculator/types';
import { buildSimulatorQuoteItem } from '@/hooks/quotes/useQuoteBuilderState.helpers';
import { calculateQuoteTotals } from '@/hooks/quotes/quoteHelpers';

const QUANTITIES = [250, 500, 1000, 2500, 5000];

/** Resposta oficial simulada: depende de área, quantidade e cores, com faturamento mínimo de R$ 200. */
function officialPrice(args: Record<string, number | string>) {
  const unit = (args.p_area_id === 'area-2' ? 0.4 : 0.6) * Number(args.p_num_cores);
  return {
    success: true,
    preco_unitario: unit,
    setup_total: 86,
    total_cobrado: Math.max(Math.round(unit * Number(args.p_quantidade) * 100) / 100, 200),
    quantidade: args.p_quantidade,
  };
}
const officialRpc = (_fn: string, args: Record<string, number | string>) =>
  Promise.resolve(officialPrice(args));

// Testing Library normaliza o espaço não separável do Intl para espaço comum.
const totalLabel = (value: number) => `Total: ${formatCurrency(value)}`.replace(/\s+/g, ' ');

const flushAsync = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      }),
  );

async function setup() {
  render(<QuantityPriceCalculator />);
  fireEvent.click(screen.getByText('pick'));
  fireEvent.click(screen.getByText('tech'));
  await flushAsync();
}

function techniqueRow(name = 'Laser') {
  const row = screen.getByText(name, { selector: 'p' }).closest('tr');
  if (!row) throw new Error('linha da técnica não renderizada');
  return within(row);
}

async function createQuoteTotal() {
  act(() => {
    fireEvent.click(screen.getByText(/Criar Orçamento a partir desta Simulação/));
  });
  await flushAsync();
  expect(navigate).toHaveBeenCalledTimes(1);
  const built = buildSimulatorQuoteItem(navigate.mock.calls[0][1].state.simulationData);
  if (!built) throw new Error('item do orçamento não montado');
  return { item: built.item, total: calculateQuoteTotals({}, [built.item]).total };
}

beforeEach(() => {
  navigate.mockReset();
  rpc.mockReset();
});

describe('QuantityPriceCalculator — preço oficial na tabela de comparação', () => {
  it('exibe por tiragem o total vindo da RPC e é idêntico ao total que chega ao orçamento', async () => {
    rpc.mockImplementation(officialRpc);
    await setup();

    for (const qty of QUANTITIES) {
      expect(rpc).toHaveBeenCalledWith('fn_get_customization_price', {
        p_area_id: 'area-1',
        p_quantidade: qty,
        p_num_cores: 1,
      });
      const engraving = officialPrice({
        p_area_id: 'area-1',
        p_quantidade: qty,
        p_num_cores: 1,
      }).total_cobrado;
      expect(techniqueRow().getByText(totalLabel(2 * qty + engraving))).toBeTruthy();
    }
    // Faturamento mínimo: 250 × 0,60 = 150 → cobra 200 (vem da RPC, não de unit × qtd).
    expect(techniqueRow().getByText(totalLabel(2 * 250 + 200))).toBeTruthy();

    const quote = await createQuoteTotal();
    expect(quote.item.quantity).toBe(250);
    expect(techniqueRow().getByText(totalLabel(quote.total))).toBeTruthy();
  });

  it('marca a coluna da tiragem que vai para o orçamento', async () => {
    rpc.mockImplementation(officialRpc);
    await setup();
    const header = screen.getByText('Vai para o orçamento').closest('th');
    expect(header?.textContent).toContain('250 un');
    expect(screen.getAllByText('Vai para o orçamento')).toHaveLength(1);
  });

  it('2 técnicas: linha "Orçamento" mostra o total exato que chega ao orçamento', async () => {
    rpc.mockImplementation(officialRpc);
    await setup();
    fireEvent.click(screen.getByText('tech2'));
    await flushAsync();

    const quoteRow = within(screen.getByTestId('quote-total-row'));
    for (const qty of QUANTITIES) {
      const engraving = ['area-1', 'area-2'].reduce(
        (sum, area) =>
          sum + officialPrice({ p_area_id: area, p_quantidade: qty, p_num_cores: 1 }).total_cobrado,
        0,
      );
      expect(quoteRow.getByText(totalLabel(2 * qty + engraving))).toBeTruthy();
    }

    const quote = await createQuoteTotal();
    expect(quote.item.personalizations).toHaveLength(2);
    expect(quote.total).toBe(2 * 250 + 200 + 200);
    expect(quoteRow.getByText(totalLabel(quote.total))).toBeTruthy();
  });

  it('mudar cores de uma técnica só refaz as chamadas dela; a outra linha não volta ao loading', async () => {
    rpc.mockImplementation(officialRpc);
    await setup();
    fireEvent.click(screen.getByText('tech2'));
    await flushAsync();
    expect(rpc).toHaveBeenCalledTimes(10);

    const laserCard = screen
      .getByText('Laser', { selector: 'h3, div' })
      .closest('.border-primary\\/20');
    if (!(laserCard instanceof HTMLElement)) throw new Error('card da técnica não renderizado');
    fireEvent.click(within(laserCard).getByRole('button', { name: '2' }));
    expect(techniqueRow('Silk').queryAllByTestId('comparison-cell-loading')).toHaveLength(0);
    expect(techniqueRow('Silk').getAllByText(/Total:/)).toHaveLength(5);
    await flushAsync();
    expect(rpc).toHaveBeenCalledTimes(15);
    expect(rpc.mock.calls.slice(10).every(([, a]) => a.p_area_id === 'area-1')).toBe(true);
  });

  it('total_cobrado ausente: tabela e orçamento tratam igual (gravação 0)', async () => {
    rpc.mockResolvedValue({ success: true, preco_unitario: 0.5, setup_total: 0 });
    await setup();
    const quote = await createQuoteTotal();
    expect(quote.total).toBe(2 * 250);
    expect(techniqueRow().getByText(totalLabel(quote.total))).toBeTruthy();
  });

  it('mudar cores recalcula pela RPC (num_cores) e não há seletor de tamanho', async () => {
    rpc.mockImplementation(officialRpc);
    await setup();
    expect(screen.queryByText('Tamanho')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await flushAsync();
    expect(rpc).toHaveBeenCalledWith('fn_get_customization_price', {
      p_area_id: 'area-1',
      p_quantidade: 250,
      p_num_cores: 2,
    });
    expect(techniqueRow().getByText(totalLabel(2 * 250 + 300))).toBeTruthy();
  });

  it('técnica dimensional: mostra estado sem preço, sem inventar valor', async () => {
    rpc.mockResolvedValue({
      success: false,
      error: 'Dimensões obrigatórias para técnica LASER (usa faixa dimensional)',
    });
    await setup();
    expect(techniqueRow().getAllByText(/Sem preço: informe largura e altura/)).toHaveLength(5);
    expect(techniqueRow().queryByText(/Total:/)).toBeNull();
  });

  it('recusa da RPC (success:false): mostra o motivo na célula, sem valor', async () => {
    rpc.mockResolvedValue({ success: false, error: 'Tabela de preço não encontrada' });
    await setup();
    expect(techniqueRow().getAllByText('Sem preço: Tabela de preço não encontrada')).toHaveLength(
      5,
    );
    expect(techniqueRow().queryByText(/Total:/)).toBeNull();
  });

  it('falha técnica só em algumas colunas: erro nelas, preço nas demais', async () => {
    rpc.mockImplementation((_fn: string, args: Record<string, number | string>) =>
      args.p_quantidade === 1000
        ? Promise.reject(new Error('network down'))
        : Promise.resolve(officialPrice(args)),
    );
    await setup();
    expect(techniqueRow().getAllByText('Erro ao calcular')).toHaveLength(1);
    expect(techniqueRow().getAllByText(/Total:/)).toHaveLength(4);
  });

  it('enquanto a RPC não responde: células em carregamento', async () => {
    rpc.mockReturnValue(new Promise(() => {}));
    await setup();
    expect(screen.getAllByTestId('comparison-cell-loading')).toHaveLength(5);
  });
});
