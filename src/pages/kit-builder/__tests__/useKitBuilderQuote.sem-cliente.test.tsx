import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { KitItem, KitState } from '@/lib/kit-builder';
import { useKitBuilderQuote } from '../useKitBuilderQuote';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'seller-1' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/hooks/kit-builder/useKitPriceValidation', () => ({
  validateKitPricesForQuote: vi.fn(() => Promise.resolve({ status: 'unchanged' })),
}));
vi.mock('@/hooks/kit-builder/useKitMinQuantityValidation', () => ({
  validateKitMinQuantityForQuote: vi.fn(() => Promise.resolve({ status: 'ok' })),
}));
vi.mock('@/hooks/kit-builder/useKitStockValidation', () => ({
  validateKitStockForQuote: vi.fn(() => Promise.resolve({ status: 'available', alerts: [] })),
}));
vi.mock('@/hooks/kit-builder/useKitFitsValidation', () => ({
  validateKitFitsForQuote: vi.fn(() => Promise.resolve({ status: 'ok' })),
}));

const item = {
  id: 'item-1',
  name: 'Caneta',
  sku: 'SKU-1',
  imageUrl: null,
  price: 10,
  quantity: 2,
  width: 1,
  height: 1,
  depth: 1,
  volume: 1,
} as unknown as KitItem;

function buildKitState(): KitState {
  return {
    name: 'Kit Natal',
    box: null,
    items: [item],
    personalization: { box: { enabled: false }, items: {} },
    isValid: true,
  } as unknown as KitState;
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.sessionStorage?.clear();
  vi.mocked(supabase.rpc).mockResolvedValue({
    data: { id: 'quote-1' },
    error: null,
  } as never);
});

describe('useKitBuilderQuote — aviso de orçamento salvo sem cliente', () => {
  it('avisa no salvamento quando nenhum cliente foi informado', async () => {
    const { result } = renderHook(() => useKitBuilderQuote());

    await act(async () => {
      await result.current.handleAddToQuote(buildKitState(), 1, {});
    });

    expect(toast.success).toHaveBeenCalledWith('Orçamento criado com sucesso!');
    expect(toast.warning).toHaveBeenCalledWith(
      'Orçamento salvo sem cliente definido. Edite o orçamento para associar um cliente.',
    );
    expect(navigateMock).toHaveBeenCalledWith('/orcamentos/quote-1');
  });

  it('avisa também quando o nome do cliente é só espaço em branco', async () => {
    const { result } = renderHook(() => useKitBuilderQuote());

    await act(async () => {
      await result.current.handleAddToQuote(buildKitState(), 1, { client_name: '   ' });
    });

    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  it('não avisa quando o cliente foi informado', async () => {
    const { result } = renderHook(() => useKitBuilderQuote());

    await act(async () => {
      await result.current.handleAddToQuote(buildKitState(), 1, {
        client_id: 'client-1',
        client_name: 'ACME',
      });
    });

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('não avisa de salvamento quando a criação do orçamento falha', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'falha de transporte' },
    } as never);
    const { result } = renderHook(() => useKitBuilderQuote());

    await act(async () => {
      await result.current.handleAddToQuote(buildKitState(), 1, {});
    });

    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Erro ao criar orçamento. Tente novamente.');
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
