import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';
import { useDiscountApproval } from '../useDiscountApproval';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'seller-1', email: 'seller@test.invalid' } }),
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
vi.mock('@/lib/security/rls-denial-logger', () => ({ logRlsDenial: vi.fn() }));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('useDiscountApproval transactional RPCs', () => {
  it('solicita usando somente quote e notas; percentuais do cliente não são confiados', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { id: 'dar-1', status: 'pending' },
      error: null,
    } as never);
    const { result } = renderHook(() => useDiscountApproval(), { wrapper });

    let ok = false;
    await act(async () => {
      ok = await result.current.requestApproval('quote-1', 99, 98, ' fechar negócio ');
    });

    expect(ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('request_discount_approval_transactional', {
      _quote_id: 'quote-1',
      _seller_notes: 'fechar negócio',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('decide por uma única RPC sem compensação multi-tabela no cliente', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { id: 'dar-1', status: 'rejected' },
      error: null,
    } as never);
    const { result } = renderHook(() => useDiscountApproval(), { wrapper });

    let ok = false;
    await act(async () => {
      ok = await result.current.respondToApproval('dar-1', false, ' ajustar preço ');
    });

    expect(ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('respond_discount_approval_transactional', {
      _request_id: 'dar-1',
      _approved: false,
      _admin_notes: 'ajustar preço',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
