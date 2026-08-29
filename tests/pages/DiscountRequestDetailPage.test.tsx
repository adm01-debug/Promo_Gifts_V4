import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const maybeSingleMock = vi.fn();
const requestUpdateEqMock = vi.fn();
const quoteUpdateEqMock = vi.fn();
const getUserMock = vi.fn();
const fromMock = vi.fn((table: string) => {
  if (table === 'discount_approval_requests') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: maybeSingleMock,
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: requestUpdateEqMock,
      }),
    };
  }

  if (table === 'quotes') {
    return {
      update: vi.fn().mockReturnValue({
        eq: quoteUpdateEqMock,
      }),
    };
  }

  throw new Error(`Unexpected table mock: ${table}`);
});

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
    auth: {
      getUser: getUserMock,
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: true,
    rolesLoaded: true,
  }),
}));

vi.mock('@/components/admin/DiscountApprovalAuditTrail', () => ({
  DiscountApprovalAuditTrail: ({ requestId }: { requestId: string }) => (
    <div data-testid="audit-trail">audit:{requestId}</div>
  ),
}));

vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/aprovacoes-desconto/req-1']}>
          <Routes>
            <Route path="/admin/aprovacoes-desconto/:id" element={<Page />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

const baseRow = {
  id: 'req-1',
  quote_id: 'quote-1',
  seller_id: 'seller-1',
  requested_discount_percent: 12,
  max_allowed_percent: 10,
  seller_notes: 'cliente prioritario',
  admin_notes: null,
  status: 'pending' as const,
  created_at: '2026-08-27T12:00:00.000Z',
  responded_at: null,
  quotes: {
    quote_number: 'Q-001',
    client_name: 'ACME',
    client_company: 'ACME Ltda',
    total: 1000,
    real_discount_percent: 0,
  },
  seller: {
    full_name: 'Vendedor Teste',
    email: 'seller@test.local',
  },
};

let Page: typeof import('@/pages/admin/DiscountRequestDetailPage').default;

beforeEach(async () => {
  vi.clearAllMocks();
  if (!Page) {
    Page = (await import('@/pages/admin/DiscountRequestDetailPage')).default;
  }
  maybeSingleMock.mockResolvedValue({ data: baseRow, error: null });
  getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
  requestUpdateEqMock.mockResolvedValue({ error: null });
  quoteUpdateEqMock.mockResolvedValue({ error: null });
});

describe('DiscountRequestDetailPage', () => {
  it('registra sucesso quando request e quote são atualizados', async () => {
    renderPage();

    await screen.findByTestId('discount-request-detail');
    await userEvent.click(screen.getByTestId('discount-request-approve'));

    await waitFor(() => {
      expect(requestUpdateEqMock).toHaveBeenCalledWith('id', 'req-1');
      expect(quoteUpdateEqMock).toHaveBeenCalledWith('id', 'quote-1');
      expect(toastSuccessMock).toHaveBeenCalledWith('Decisão registrada');
    });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('não reporta sucesso quando a atualização do orçamento falha', async () => {
    quoteUpdateEqMock.mockResolvedValueOnce({ error: new Error('quote update failed') });

    renderPage();

    await screen.findByTestId('discount-request-detail');
    await userEvent.click(screen.getByTestId('discount-request-approve'));

    await waitFor(() => {
      expect(requestUpdateEqMock).toHaveBeenCalledWith('id', 'req-1');
      expect(quoteUpdateEqMock).toHaveBeenCalledWith('id', 'quote-1');
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Operação não pôde ser concluída. Tente novamente em instantes.',
      );
    });
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });
});
