import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ userId: 'user-A' }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: auth.userId } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_column: string, userId: string) => ({
          order: async () => ({
            data: [{ id: `kit-${userId}`, user_id: userId }],
            error: null,
          }),
        }),
      }),
    }),
  },
}));

import { useCustomKitPersistence } from '@/hooks/kit-builder/useCustomKitPersistence';

describe('useCustomKitPersistence account cache', () => {
  it('não mostra kits da conta A ao trocar para B na mesma sessão de navegador', async () => {
    auth.userId = 'user-A';
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result, rerender } = renderHook(() => useCustomKitPersistence(), { wrapper });
    await waitFor(() => expect(result.current.savedKits[0]?.id).toBe('kit-user-A'));

    auth.userId = 'user-B';
    rerender();
    expect(result.current.savedKits.some((kit) => kit.user_id === 'user-A')).toBe(false);
    await waitFor(() => expect(result.current.savedKits[0]?.id).toBe('kit-user-B'));
    expect(queryClient.getQueryData(['custom-kits', 'user-A'])).toEqual([
      { id: 'kit-user-A', user_id: 'user-A' },
    ]);
    expect(queryClient.getQueryData(['custom-kits', 'user-B'])).toEqual([
      { id: 'kit-user-B', user_id: 'user-B' },
    ]);
  });
});
