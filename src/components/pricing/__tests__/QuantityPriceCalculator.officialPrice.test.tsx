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
// Fonte local antiga (preço bruto da faixa + ×cor + ×tamanho): não pode mais definir o valor exibido.
vi.mock('@/hooks/simulation', () => ({
  useCustomizationPricing: () => ({
    isLoading: false,
    priceTables: [{ table_code: 'LASER', customization_type_name: 'Laser', price_by_color: true }],
    calculatePrice: () => ({ unitPrice: 0.3, setupPrice: 40, slaDays: 5 }),
  }),
}));
vi.mock('@/lib/personalization/rpc-validator', () => ({ validateRpcPayload: vi.fn() }));
vi.mock('@/components/pricing/simulator/ProductSearch', () => ({
  ProductSearch: ({ onSelect }: { onSelect: (p: unknown) => void }) => (
    <button onClick={() => onSelect({ id: 'p1', name: 'Caneta', sku: 'C1', price: 2, images: [] })}>
      pick
    </button>
  ),
}));
vi.mock('@/components/pricing/calculator/TechniqueMultiSelector', () => ({
  TechniqueMultiSelector: ({
    onToggleTechnique,
  }: {
    onToggleTechnique: (t: unknown, add: boolean) => void;
  }) => (
    <button
      onClick={() =>
        onToggleTechnique(
          {
            id: 'area-1',
            techniqueId: 'area-1',
            techniqueName: 'Laser',
            techniqueCode: 'LASER',
            componentName: 'Corpo',
            locationName: 'Corpo',
            locationCode: 'C',
            composedCode: 'LASER',
            maxWidth: null,
            maxHeight: null,
            maxArea: null,
            maxColors: 2,
            isDefault: false,
          },
          true,
        )
      }
    >
      tech
    </button>
  ),
}));

import { QuantityPriceCalculator } from '@/components/pricing/QuantityPriceCalculator';
import { formatCurrency } from '@/components/pricing/calculator/types';
import { buildSimulatorQuoteItem } from '@/hooks/quotes/useQuoteBuilderState.helpers';
import { calculateQuoteTotals } from '@/hooks/quotes/quoteHelpers';

const QUANTITIES = [250, 500, 1000, 2500, 5000];

/** Resposta oficial simulada: depende de quantidade e cores (como a RPC real). */
function officialPrice(args: Record<string, number>) {
  const unit = 0.6 * args.p_num_cores;
  return {
    success: true,
    preco_unitario: unit,
    setup_total: 86,
    total_cobrado: Math.round(unit * args.p_quantidade * 100) / 100,
    quantidade: args.p_quantidade,
  };
}

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

function techniqueRow() {
  const row = screen.getByText('Laser', { selector: 'p' }).closest('tr');
  if (!row) throw new Error('linha da técnica não renderizada');
  return within(row);
}

beforeEach(() => {
  navigate.mockReset();
  rpc.mockReset();
});

describe('QuantityPriceCalculator — preço oficial na tabela de comparação', () => {
  it('exibe por tiragem o total vindo da RPC e é idêntico ao total que chega ao orçamento', async () => {
    rpc.mockImplementation((_fn: string, args: Record<string, number>) =>
      Promise.resolve(officialPrice(args)),
    );
    await setup();

    for (const qty of QUANTITIES) {
      expect(rpc).toHaveBeenCalledWith('fn_get_customization_price', {
        p_area_id: 'area-1',
        p_quantidade: qty,
        p_num_cores: 1,
      });
      const engraving = officialPrice({ p_quantidade: qty, p_num_cores: 1 }).total_cobrado;
      expect(techniqueRow().getByText(totalLabel(2 * qty + engraving))).toBeTruthy();
    }

    act(() => {
      fireEvent.click(screen.getByText(/Criar Orçamento a partir desta Simulação/));
    });
    await flushAsync();
    expect(navigate).toHaveBeenCalledTimes(1);
    const built = buildSimulatorQuoteItem(navigate.mock.calls[0][1].state.simulationData);
    if (!built) throw new Error('item do orçamento não montado');
    const quoteTotal = calculateQuoteTotals({}, [built.item]).total;
    expect(built.item.quantity).toBe(250);
    expect(techniqueRow().getByText(totalLabel(quoteTotal))).toBeTruthy();
  });

  it('mudar cores recalcula pela RPC (num_cores) e não há seletor de tamanho', async () => {
    rpc.mockImplementation((_fn: string, args: Record<string, number>) =>
      Promise.resolve(officialPrice(args)),
    );
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

  it('erro de RPC não-dimensional: mostra erro na célula, sem valor', async () => {
    rpc.mockResolvedValue({ success: false, error: 'Tabela de preço não encontrada' });
    await setup();
    expect(techniqueRow().getAllByText('Erro ao calcular')).toHaveLength(5);
    expect(techniqueRow().queryByText(/Total:/)).toBeNull();
  });

  it('enquanto a RPC não responde: células em carregamento', async () => {
    rpc.mockReturnValue(new Promise(() => {}));
    await setup();
    expect(screen.getAllByTestId('comparison-cell-loading')).toHaveLength(5);
  });
});
