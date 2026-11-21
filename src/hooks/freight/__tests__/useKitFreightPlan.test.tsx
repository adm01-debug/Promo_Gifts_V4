/**
 * useKitFreightPlan — plano de volumes do kit via kitToPackInput.
 *
 * Kit com caixa própria: a peça é a caixa fechada (peso = caixa + Σ itens),
 * 1 linha, mixMode: 'misturar'. Kit sem caixa: cada item vira linha do
 * caminho normal. Item sem peso cadastrado → dados_insuficientes.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ALL_PRODUCT_FIXTURES } from '@/lib/freight/__tests__/fixtures/products';
import {
  fromSimulado,
  reiniciarSimulacao,
} from '@/components/freight-plan/__tests__/freightPlanCard.harness';
import { useKitFreightPlan } from '../useKitFreightPlan';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tabela: string) => fromSimulado(tabela) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const wrapper = ({ children }: { children: ReactNode }) => <Providers>{children}</Providers>;

const caderneta = ALL_PRODUCT_FIXTURES.find(
  (p) => p.name === 'Caderneta kraft B6 com porta caneta',
)!;
const caneta = ALL_PRODUCT_FIXTURES.find((p) => p.name === 'Caneta reciclavel')!;
const caixa = ALL_PRODUCT_FIXTURES.find((p) => p.name === 'Kit squeeze e acessórios - 4 pçs')!;

describe('useKitFreightPlan', () => {
  beforeEach(() => reiniciarSimulacao());

  it('kit com caixa própria calcula a caixa fechada (peso = caixa + Σ itens)', async () => {
    const kit = {
      box: { id: caixa.id, name: caixa.name },
      items: [
        { id: caderneta.id, name: caderneta.name, quantity: 2 },
        { id: caneta.id, name: caneta.name, quantity: 3 },
      ],
    };
    const { result } = renderHook(() => useKitFreightPlan(kit, 1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plan?.status).toBe('ok');
    expect(result.current.plan?.mixMode).toBe('misturar');
  });

  it('kit sem caixa vira linhas normais do motor', async () => {
    const kit = {
      box: null,
      items: [{ id: caderneta.id, name: caderneta.name, quantity: 4 }],
    };
    const { result } = renderHook(() => useKitFreightPlan(kit, 1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plan?.status).toBe('ok');
  });

  it('item sem peso cadastrado deixa o plano em dados_insuficientes', async () => {
    const kit = {
      box: null,
      items: [{ id: 'produto-sem-peso', name: 'Sem peso', quantity: 1 }],
    };
    const { result } = renderHook(() => useKitFreightPlan(kit, 1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plan?.status).toBe('dados_insuficientes');
  });
});
