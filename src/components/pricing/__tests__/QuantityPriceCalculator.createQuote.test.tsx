/**
 * QuantityPriceCalculator — CTA "Criar Orçamento" (componente real).
 * RPC mockada com o retorno real de fn_get_customization_price para técnica com
 * usa_faixa_dimensional=true chamada sem largura/altura (≈48% das áreas ativas em prod).
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
const rpc = vi.fn();
vi.mock('@/lib/external-rpc', () => ({ invokeExternalRpc: (...a: unknown[]) => rpc(...a) }));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));
vi.mock('@/hooks/simulation', () => ({ useCustomizationPricing: () => ({ isLoading: false }) }));
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
            id: 'area-dim',
            techniqueId: 'area-dim',
            techniqueName: 'Laser',
            techniqueCode: 'LASER',
            componentName: 'Corpo',
            locationName: 'Corpo',
            locationCode: 'C',
            composedCode: 'LASER',
            maxWidth: null,
            maxHeight: null,
            maxArea: null,
            maxColors: 1,
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
vi.mock('@/components/pricing/calculator/TechniqueConfigCard', () => ({
  TechniqueConfigCard: () => null,
}));
vi.mock('@/components/pricing/calculator/QuantityComparisonTable', () => ({
  QuantityComparisonTable: () => null,
}));

import { toast } from 'sonner';
import { QuantityPriceCalculator } from '@/components/pricing/QuantityPriceCalculator';

beforeEach(() => {
  navigate.mockReset();
  rpc.mockReset();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.warning).mockClear();
});

// Deixa o handler assíncrono do CTA (Promise.all das RPCs) terminar.
const flushAsync = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      }),
  );

async function clickCta() {
  render(<QuantityPriceCalculator />);
  fireEvent.click(screen.getByText('pick'));
  fireEvent.click(screen.getByText('tech'));
  act(() => {
    fireEvent.click(screen.getByText(/Criar Orçamento a partir desta Simulação/));
  });
  await flushAsync();
}

describe('QuantityPriceCalculator CTA Criar Orçamento', () => {
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

  it('técnica não-dimensional: navega com pricing preenchido e quantidade mínima', async () => {
    rpc.mockResolvedValue({
      success: true,
      preco_unitario: 0.5,
      setup_total: 40,
      total_cobrado: 165,
      quantidade: 250,
    });
    await clickCta();
    expect(navigate).toHaveBeenCalledTimes(1);
    const st = navigate.mock.calls[0][1].state;
    expect(st.simulationData.quantity).toBe(250);
    expect(st.simulationData.personalizations[0].pricing).toEqual({
      setupPrice: 40,
      unitPrice: 0.5,
      totalPrice: 165,
    });
  });

  it('duplo clique rápido: 1 cálculo e 1 navegação (guarda de loading)', async () => {
    rpc.mockResolvedValue({
      success: true,
      preco_unitario: 0.5,
      setup_total: 40,
      total_cobrado: 165,
      quantidade: 250,
    });
    render(<QuantityPriceCalculator />);
    fireEvent.click(screen.getByText('pick'));
    fireEvent.click(screen.getByText('tech'));
    const btn = screen.getByText(/Criar Orçamento a partir desta Simulação/);
    act(() => {
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    await flushAsync();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
