/**
 * Integração da rota `/orcamentos/templates`.
 *
 * Prova que:
 *  1. a rota monta a PÁGINA real de templates (não mais o `<Navigate>` de
 *     aposentadoria que apontava para `/orcamentos`);
 *  2. o usuário CHEGA lá pela UI: o botão "Templates" do header da lista de
 *     orçamentos navega para a rota e a página renderiza.
 *
 * Renderiza `quoteRoutes` de verdade (lazy incluído), com apenas os hooks de
 * dados mockados.
 */
import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, useNavigate } from 'react-router-dom';
import type { useQuotesListPage as _useQuotesListPage } from '@/pages/quotes/useQuotesListPage';

let realNavigate: ((to: string) => void) | null = null;

const baseListHook = {
  navigate: (to: string) => realNavigate?.(to),
  quotes: [],
  isLoading: false,
  isFetching: false,
  error: null,
  fetchQuotes: vi.fn(),
  searchTerm: '',
  setSearchTerm: vi.fn(),
  statusFilter: 'all',
  setStatusFilter: vi.fn(),
  sortBy: 'newest',
  setSortBy: vi.fn(),
  deleteConfirmId: null,
  setDeleteConfirmId: vi.fn(),
  isDeleting: false,
  bulkDeleteIds: [],
  setBulkDeleteIds: vi.fn(),
  isBulkDeleting: false,
  bulkDeleteProgress: { done: 0, total: 0 },
  cancelBulkDelete: vi.fn(),
  filteredQuotes: [],
  onlyPendingStatuses: false,
  handleDelete: vi.fn(),
  handleBulkDelete: vi.fn(),
  handleClearFilters: vi.fn(),
  handleMarkApproved: vi.fn(),
  handleDuplicateWithUndo: vi.fn(),
  updateQuoteStatus: vi.fn(),
} as unknown as ReturnType<typeof _useQuotesListPage>;

vi.mock('@/pages/quotes/useQuotesListPage', async () => {
  const actual = await vi.importActual('@/pages/quotes/useQuotesListPage');
  return { ...actual, useQuotesListPage: () => baseListHook };
});

vi.mock('@/hooks/quotes/useQuoteTemplates', () => ({
  useQuoteTemplates: () => ({
    templates: [],
    allTemplates: [],
    sellers: [],
    loading: false,
    error: null,
    isAdmin: false,
    fetchTemplates: vi.fn(),
    fetchAllTemplates: vi.fn(),
    fetchSellers: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    setDefaultTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    cloneTemplateToSeller: vi.fn(),
  }),
}));

vi.mock('@/components/quotes/QuotesConfigurableList', () => ({
  QuotesConfigurableList: () => <div data-testid="stub-list" />,
}));
vi.mock('@/components/quotes/QuotesStatusChips', () => ({
  QuotesStatusChips: () => <div data-testid="stub-chips" />,
}));
vi.mock('@/components/layout/SkeletonLoaders', () => ({
  QuotesSkeleton: () => <div data-testid="stub-skeleton" />,
  getFallback: () => <div data-testid="stub-fallback" />,
}));
vi.mock('@/components/common/MicroInteractions', () => ({
  FadeInView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AnimatedCounter: ({ value }: { value: number }) => <span>{value}</span>,
}));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { quoteRoutes } from '@/routes/quote-routes';

function NavCapture() {
  realNavigate = useNavigate();
  return null;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavCapture />
      <Suspense fallback={<div data-testid="route-suspense" />}>
        <Routes>{quoteRoutes}</Routes>
      </Suspense>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  realNavigate = null;
});

describe('rota /orcamentos/templates', () => {
  it('monta a página de templates (não redireciona para /orcamentos)', async () => {
    renderAt('/orcamentos/templates');

    expect(await screen.findByTestId('page-title-orcamentos-templates')).toHaveTextContent(
      'Templates de Orçamento',
    );
    expect(screen.queryByTestId('page-title-orcamentos')).not.toBeInTheDocument();
  });

  it('o botão "Templates" da lista de orçamentos leva à página', async () => {
    const user = userEvent.setup();
    renderAt('/orcamentos');

    expect(await screen.findByTestId('page-title-orcamentos')).toBeInTheDocument();

    const entry = screen.getByTestId('quote-templates-button');
    expect(entry).toHaveAttribute('aria-label', 'Templates de orçamento');
    await user.click(entry);

    await waitFor(() => {
      expect(screen.getByTestId('page-title-orcamentos-templates')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('page-title-orcamentos')).not.toBeInTheDocument();
  });
});
