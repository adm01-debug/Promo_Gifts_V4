/**
 * Guard regression — useSellerDiscountLimits.setLimit
 *
 * Garante que setLimit NAO faz upsert quando userId esta ausente (vendedor sem vinculo de conta).
 * Defesa de UX complementar a constraint NOT NULL + FK -> profiles do banco (evita o erro 23502).
 */
import { createElement, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSellerDiscountLimits } from '../useSellerDiscountLimits';

// Wrapper de teste: provê um QueryClient isolado por render tree.
function TestProviders({ children }: { children: ReactNode }) {
  const clientRef = useRef<QueryClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
  }
  return createElement(QueryClientProvider, { client: clientRef.current }, children);
}

const renderHookWithProviders = (hook: () => ReturnType<typeof useSellerDiscountLimits>) =>
  renderHook(hook, { wrapper: TestProviders });


const mockUpsert = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      upsert: mockUpsert,
      delete: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      maybeSingle: vi.fn(),
    })),
  },
}));

const mockUser = { id: 'admin-001', email: 'admin@test.com' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue({
    eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
  });
  mockUpsert.mockReturnValue({ error: null });
});

describe('setLimit — guard userId ausente', () => {
  it('retorna false e NAO chama upsert quando userId vazio', async () => {
    const { result } = renderHookWithProviders(() => useSellerDiscountLimits());
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.setLimit('', 15);
    });
    expect(outcome).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('faz upsert normalmente quando userId valido', async () => {
    const { result } = renderHookWithProviders(() => useSellerDiscountLimits());
    await act(async () => {
      await result.current.setLimit('seller-xyz', 20);
    });
    expect(mockUpsert).toHaveBeenCalled();
  });
});
