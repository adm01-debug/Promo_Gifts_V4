/**
 * ProductPriceSimulator — CTA "Criar Orçamento" (componente real).
 * Mesmos casos do QuantityPriceCalculator.createQuote.test.tsx + o de tamanho:
 * aqui a tela (MultiEngravingResult) e o orçamento usam a mesma RPC
 * fn_get_customization_price com área/quantidade/cores — o tamanho não entra no preço.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }) }));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: vi.fn() }));
const rpc = vi.fn();
vi.mock('@/lib/external-rpc', () => ({ invokeExternalRpc: (...a: unknown[]) => rpc(...a) }));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));
vi.mock('@/lib/personalization/rpc-validator', () => ({ validateRpcPayload: vi.fn() }));
vi.mock('@/components/pricing/simulator', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  ProductSearch: ({ onSelect }: { onSelect: (p: unknown) => void }) => (
    <button onClick={() => onSelect({ id: 'p1', name: 'Caneta', sku: 'C1', price: 2, images: [] })}>
      pick
    </button>
  ),
  ProductVariantSelector: () => null,
  TechniqueSelector: ({ onSelect }: { onSelect: (t: unknown) => void }) => (
    <button
      onClick={() =>
        onSelect({
          id: 'area-dim',
          techniqueId: 'tec-laser',
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
        })
      }
    >
      tech
    </button>
  ),
  CustomizationOptions: ({
    onColorsChange,
    onSizeChange,
  }: {
    onColorsChange: (n: number) => void;
    onSizeChange: (s: string) => void;
  }) => (
    <button
      onClick={() => {
        onColorsChange(2);
        onSizeChange('10x5');
      }}
    >
      size
    </button>
  ),
}));
vi.mock('@/components/pricing/simulator/EngravingList', () => ({
  EngravingList: ({ onAddNew }: { onAddNew: () => void }) => (
    <button onClick={onAddNew}>add</button>
  ),
}));
vi.mock('@/components/pricing/simulator/MultiEngravingResult', () => ({
  MultiEngravingResult: () => null,
}));

import { toast } from 'sonner';
import { ProductPriceSimulator } from '@/components/pricing/ProductPriceSimulator';

beforeEach(() => {
  navigate.mockReset();
  rpc.mockReset();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.warning).mockClear();
});

const PRICE_OK = {
  success: true,
  preco_unitario: 0.5,
  setup_total: 40,
  total_cobrado: 90,
  quantidade: 100,
};

// Deixa o handler assíncrono do CTA (Promise.all das RPCs) terminar.
const flushAsync = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      }),
  );

function setup({ withSize = false } = {}) {
  render(<ProductPriceSimulator />);
  fireEvent.click(screen.getByText('pick'));
  fireEvent.click(screen.getByText('add'));
  fireEvent.click(screen.getByText('tech'));
  if (withSize) fireEvent.click(screen.getByText('size'));
  fireEvent.click(screen.getByText('Adicionar Gravação'));
  return screen.getByText(/Criar Orçamento a partir desta Simulação/);
}

async function clickCta(opts?: { withSize?: boolean }) {
  const btn = setup(opts);
  act(() => {
    fireEvent.click(btn);
  });
  await flushAsync();
}

describe('ProductPriceSimulator CTA Criar Orçamento', () => {
  it('técnica dimensional sem preço: não bloqueia o handoff, avisa e segue sem pricing', async () => {
    rpc.mockResolvedValue({
      success: false,
      error: 'Dimensões obrigatórias para técnica LASER (usa faixa dimensional)',
    });
    await clickCta();
    expect(rpc).toHaveBeenCalledWith(
      'fn_get_customization_price',
      expect.not.objectContaining({ p_largura_cm: expect.anything() }),
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(
      navigate.mock.calls[0][1].state.simulationData.personalizations[0].pricing,
    ).toBeUndefined();
  });

  it('falha de rede/RPC que não é de dimensão: bloqueia com erro e não navega', async () => {
    rpc.mockRejectedValue(new Error('network down'));
    await clickCta();
    expect(toast.error).toHaveBeenCalledWith(
      'Não foi possível calcular o preço da gravação. Tente novamente.',
    );
    expect(toast.warning).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Criar Orçamento a partir desta Simulação/).closest('button'),
    ).not.toBeDisabled();
  });

  it('RPC success:false por outro motivo: bloqueia com erro', async () => {
    rpc.mockResolvedValue({ success: false, error: 'Tabela de preço não encontrada' });
    await clickCta();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('técnica não-dimensional: navega com pricing preenchido e quantidade da tela', async () => {
    rpc.mockResolvedValue(PRICE_OK);
    await clickCta();
    expect(rpc).toHaveBeenCalledWith('fn_get_customization_price', {
      p_area_id: 'area-dim',
      p_quantidade: 100,
      p_num_cores: 1,
    });
    expect(navigate).toHaveBeenCalledTimes(1);
    const st = navigate.mock.calls[0][1].state;
    expect(st.simulationData.quantity).toBe(100);
    expect(st.simulationData.personalizations[0].pricing).toEqual({
      setupPrice: 40,
      unitPrice: 0.5,
      totalPrice: 90,
    });
  });

  it('duplo clique rápido: 1 cálculo e 1 navegação (guarda de loading)', async () => {
    rpc.mockResolvedValue(PRICE_OK);
    const btn = setup();
    act(() => {
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    await flushAsync();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('tamanho escolhido: orçamento recebe o mesmo preço da RPC exibida (tamanho não altera)', async () => {
    rpc.mockResolvedValue({ ...PRICE_OK, num_cores: 2 });
    await clickCta({ withSize: true });
    // Mesmos parâmetros que MultiEngravingResult usa para exibir o preço na tela.
    expect(rpc).toHaveBeenCalledWith('fn_get_customization_price', {
      p_area_id: 'area-dim',
      p_quantidade: 100,
      p_num_cores: 2,
    });
    const p = navigate.mock.calls[0][1].state.simulationData.personalizations[0];
    expect(p.specs).toEqual({ colors: 2 });
    expect(p.pricing).toEqual({ setupPrice: 40, unitPrice: 0.5, totalPrice: 90 });
  });
});
