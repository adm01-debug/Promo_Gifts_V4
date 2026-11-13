/**
 * QuoteViewPage — exclusão negada pela RLS.
 *
 * `deleteQuote` devolve `false` quando a RLS nega (0 linhas); o toast de erro sai do
 * onError da mutation. A página NÃO pode navegar para /orcamentos nem exibir o toast
 * "Orçamento excluído" com Desfazer nesse caso. Renderiza a página real e abre o
 * diálogo pela UI (menu "Mais opções" > Excluir > confirmar "Excluir").
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ReactRouterDom from 'react-router-dom';

const { navigate, deleteQuote, fetchQuote, showUndoToast } = vi.hoisted(() => ({
  navigate: vi.fn(),
  deleteQuote: vi.fn(),
  fetchQuote: vi.fn(),
  showUndoToast: vi.fn(),
}));

const QUOTE_ID = 'quote-123';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return {
    ...actual,
    useParams: () => ({ id: QUOTE_ID }),
    useNavigate: () => navigate,
  };
});

vi.mock('@/hooks/quotes', () => ({
  useQuotes: () => ({
    fetchQuote,
    logQuoteHistory: vi.fn(),
    duplicateQuote: vi.fn(),
    deleteQuote,
    createQuote: vi.fn(),
  }),
  useDiscountApproval: () => ({ getApprovalStatus: vi.fn().mockResolvedValue(null) }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null }),
}));

vi.mock('@/utils/undoToast', () => ({ showUndoToast }));

vi.mock('@/lib/crm-db', () => ({ selectCrmById: vi.fn() }));

vi.mock('@/utils/proposalPdfReactGenerator', () => ({
  generateProposalPDFv2: vi.fn(),
  downloadPDF: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

// Componentes pesados/irrelevantes para o fluxo de exclusão.
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/quotes/QuoteStatusTimeline', () => ({ QuoteStatusTimeline: () => null }));
vi.mock('@/components/quotes/QuoteMobileActionBar', () => ({ QuoteMobileActionBar: () => null }));
vi.mock('@/components/quotes/QuoteVersionHistory', () => ({ QuoteVersionHistory: () => null }));
vi.mock('@/components/quotes/QuoteHistoryPanel', () => ({ QuoteHistoryPanel: () => null }));
vi.mock('@/components/quotes/PdfGenerationDialog', () => ({ PdfGenerationDialog: () => null }));
vi.mock('@/components/quotes/QuoteClientInfo', () => ({ QuoteClientInfo: () => null }));
vi.mock('@/components/quotes/QuoteItemsTable', () => ({ QuoteItemsTable: () => null }));
vi.mock('@/components/quotes/QuoteTotalsSummary', () => ({ QuoteTotalsSummary: () => null }));

import QuoteViewPage from '../QuoteViewPage';

const QUOTE = {
  id: QUOTE_ID,
  quote_number: 'ORC-0001',
  status: 'draft',
  created_at: '2026-01-10T12:00:00Z',
  updated_at: '2026-01-10T12:00:00Z',
  client_name: 'Cliente Teste',
  items: [],
};

async function confirmDeleteViaUi() {
  const user = userEvent.setup();
  render(<QuoteViewPage />);

  await user.click(await screen.findByRole('button', { name: 'Mais opções' }));
  await user.click(await screen.findByTestId('quote-actions-delete'));

  const dialog = await screen.findByTestId('quote-delete-dialog');
  expect(dialog).toBeInTheDocument();
  await user.click(screen.getByTestId('quote-delete-dialog-yes'));

  await waitFor(() => expect(deleteQuote).toHaveBeenCalledWith(QUOTE_ID));
}

describe('QuoteViewPage — exclusão negada (RLS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchQuote.mockResolvedValue(QUOTE);
  });

  it('deleteQuote → false: não navega para /orcamentos nem mostra toast de desfazer', async () => {
    deleteQuote.mockResolvedValue(false);

    await confirmDeleteViaUi();
    // Deixa a cadeia de promises do onConfirm (finally → setIsDeleting(false)) terminar.
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(navigate).not.toHaveBeenCalledWith('/orcamentos');
    expect(showUndoToast).not.toHaveBeenCalled();
  });

  it('deleteQuote → true: navega para /orcamentos e mostra toast de desfazer uma vez', async () => {
    deleteQuote.mockResolvedValue(true);

    await confirmDeleteViaUi();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/orcamentos'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(showUndoToast).toHaveBeenCalledTimes(1);
    expect(showUndoToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Orçamento excluído' }),
    );
  });
});
