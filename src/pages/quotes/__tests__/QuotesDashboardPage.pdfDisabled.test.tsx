/**
 * QuotesDashboardPage — botão PDF bloqueado enquanto o painel não tem dados.
 *
 * O header (com o botão PDF) é renderizado também nos estados de loading e de
 * erro. Sem guarda, clicar em "PDF" nesses estados gera um PDF com métricas
 * zeradas/vazias — arquivo que o usuário acha que é o relatório real.
 *
 * Cobre:
 *  1) isLoading=true → botão PDF disabled e exportToPdf não é chamado nos cliques.
 *  2) error preenchido → botão PDF disabled e exportToPdf não é chamado.
 *  3) dados carregados → botão PDF habilitado e exportToPdf é chamado.
 */
import type * as UseQuotesDashboardModule from '@/pages/quotes/quotes-dashboard/useQuotesDashboard';
import type { useQuotesDashboard as _useQuotesDashboard } from '@/pages/quotes/quotes-dashboard/useQuotesDashboard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type HookReturn = ReturnType<typeof _useQuotesDashboard>;

const exportToPdf = vi.fn();

const emptyMetrics = {
  totalQuotes: 0,
  totalValue: 0,
  approvedValue: 0,
  approvalRate: 0,
  rejectionRate: 0,
  averageResponseTime: 0,
  averageValue: 0,
  pendingQuotes: 0,
  statusDistribution: [],
  monthlyData: [],
  conversionFunnel: [],
};

const baseHook = {
  quotes: [],
  isLoading: false,
  error: null,
  selectedPeriod: 'month',
  setSelectedPeriod: vi.fn(),
  selectedClientId: 'all',
  setSelectedClientId: vi.fn(),
  clients: [],
  quotesClients: [],
  loadingClients: false,
  selectedClientName: null,
  metrics: emptyMetrics,
  exportToPdf,
} as unknown as HookReturn;

let hookValue: HookReturn = baseHook;

vi.mock('@/pages/quotes/quotes-dashboard/useQuotesDashboard', async () => {
  const actual = await vi.importActual<typeof UseQuotesDashboardModule>(
    '@/pages/quotes/quotes-dashboard/useQuotesDashboard',
  );
  return {
    ...actual,
    useQuotesDashboard: () => hookValue,
  };
});

vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));

import QuotesDashboardPage from '@/pages/quotes/QuotesDashboardPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <QuotesDashboardPage />
    </MemoryRouter>,
  );
}

function pdfButton() {
  return screen.getByRole('button', { name: /^PDF$/ });
}

describe('QuotesDashboardPage — guarda do export PDF', () => {
  beforeEach(() => {
    hookValue = baseHook;
    exportToPdf.mockClear();
  });

  it('isLoading=true: botão PDF fica disabled e cliques não exportam', () => {
    hookValue = { ...baseHook, isLoading: true } as HookReturn;
    renderPage();
    const btn = pdfButton();
    expect(btn).toBeDisabled();
    for (let i = 0; i < 5; i++) fireEvent.click(btn);
    expect(exportToPdf).not.toHaveBeenCalled();
  });

  it('error preenchido: botão PDF fica disabled e cliques não exportam', () => {
    hookValue = { ...baseHook, error: 'Falha ao carregar orçamentos' } as HookReturn;
    renderPage();
    const btn = pdfButton();
    expect(btn).toBeDisabled();
    for (let i = 0; i < 5; i++) fireEvent.click(btn);
    expect(exportToPdf).not.toHaveBeenCalled();
  });

  it('dados carregados: botão PDF habilitado e clique exporta', () => {
    renderPage();
    const btn = pdfButton();
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(exportToPdf).toHaveBeenCalledTimes(1);
  });
});
