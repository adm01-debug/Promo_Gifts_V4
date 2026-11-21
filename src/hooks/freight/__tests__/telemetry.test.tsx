/**
 * telemetry.test.ts — telemetria do plano de volumes (etapa 59).
 *
 * Cada cálculo de plano emite EXATAMENTE um evento `freight_plan_computed`
 * com o `origin` certo (quote | kit | simulator), e o insert é fire-and-forget
 * (nunca quebra o fluxo). O harness registra os inserts em `telemetriaInserts`.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ALL_PRODUCT_FIXTURES } from '@/lib/freight/__tests__/fixtures/products';
import {
  fromSimulado,
  reiniciarSimulacao,
  telemetriaInserts,
} from '@/components/freight-plan/__tests__/freightPlanCard.harness';
import { useFreightPlan } from '../useFreightPlan';
import { useKitFreightPlan } from '../useKitFreightPlan';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => fromSimulado(tabela),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u-teste' } }, error: null }) },
  },
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

function insertsDoEvento() {
  return telemetriaInserts.filter((row) => row.name === 'freight_plan_computed');
}

describe('trackFreightPlanComputed — etapa 59', () => {
  beforeEach(() => reiniciarSimulacao());

  it('orçamento (useFreightPlan) emite 1× com origin quote', async () => {
    const { result } = renderHook(
      () =>
        useFreightPlan({
          items: [
            { productId: caderneta.id, name: caderneta.name, quantity: 2 },
            { productId: caneta.id, name: caneta.name, quantity: 3 },
          ],
          mixMode: 'misturar',
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.plan?.status).toBe('ok'));

    const eventos = insertsDoEvento();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].event_type).toBe('interaction');
    expect(eventos[0].metadata).toMatchObject({
      status: 'ok',
      origin: 'quote',
      volumes: expect.any(Number),
    });
  });

  it('simulador emite 1× com origin simulator', async () => {
    const { result } = renderHook(
      () =>
        useFreightPlan({
          items: [{ productId: caneta.id, name: caneta.name, quantity: 10 }],
          mixMode: 'misturar',
          origin: 'simulator',
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.plan?.status).toBe('ok'));

    const eventos = insertsDoEvento();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].metadata.origin).toBe('simulator');
  });

  it('kit emite 1× com origin kit e não recalcula evento no mesmo plano', async () => {
    const kit = {
      box: { id: caixa.id, name: caixa.name },
      items: [{ id: caderneta.id, name: caderneta.name, quantity: 2 }],
    };
    const { result, rerender } = renderHook(() => useKitFreightPlan(kit, 1), { wrapper });
    await waitFor(() => expect(result.current.plan?.status).toBe('ok'));
    rerender();

    const eventos = insertsDoEvento();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].metadata.origin).toBe('kit');
  });
});
