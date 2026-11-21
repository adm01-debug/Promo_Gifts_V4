/**
 * QuoteViewPage — bloco de volumes do frete salvado pelo vendedor.
 *
 * A página em leitura não tem switch: o que foi salvo na edição (`freight_plan`)
 * é o que aparece (etapa 66). Planos `dados_insuficientes`/inválidos/nulos não
 * renderizam o painel; planos `ok` renderizam `FreightPlanPanel` com o resumo
 * "Volumes para transporte" e a rotulagem por `quote.items`.
 */
import { render, screen, waitFor } from '@testing-library/react';
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

// Componentes pesados/irrelevantes para o fluxo de frete em leitura.
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/quotes/QuoteStatusTimeline', () => ({ QuoteStatusTimeline: () => null }));
vi.mock('@/components/quotes/QuoteMobileActionBar', () => ({ QuoteMobileActionBar: () => null }));
vi.mock('@/components/quotes/QuoteVersionHistory', () => ({ QuoteVersionHistory: () => null }));
vi.mock('@/components/quotes/QuoteHistoryPanel', () => ({ QuoteHistoryPanel: () => null }));
vi.mock('@/components/quotes/PdfGenerationDialog', () => ({ PdfGenerationDialog: () => null }));
vi.mock('@/components/quotes/QuoteClientInfo', () => ({ QuoteClientInfo: () => null }));
vi.mock('@/components/quotes/QuoteItemsTable', () => ({ QuoteItemsTable: () => null }));
vi.mock('@/components/quotes/QuoteTotalsSummary', () => ({ QuoteTotalsSummary: () => null }));

import type { Json } from '@/integrations/supabase/types';
import { planFreight, toStoredFreightPlan } from '@/lib/freight';
import { CAIXAS_PADRAO, SETTINGS_PADRAO } from '@/lib/freight/__tests__/fixtures/boxes';
import { LINHA_CADERNETA, LINHA_SQUEEZE } from '@/lib/freight/__tests__/fixtures/items';
import QuoteViewPage from '../QuoteViewPage';

const FROZEN_ISO = '2026-03-15T12:34:56.000Z';

// Plano real do motor (caderneta ×2 + squeeze ×1 em uma caixa P) — o mesmo que
// o vendedor gravaria via `toStoredFreightPlan`. O fixture é usado por valor,
// nunca mockado, para o teste validar o parse de verdade.
const PLAN = planFreight(
  [
    { row: LINHA_CADERNETA, quantity: 2 },
    { row: LINHA_SQUEEZE, quantity: 1 },
  ],
  CAIXAS_PADRAO,
  {
    mixMode: 'misturar',
    computedAt: FROZEN_ISO,
    itemsHash: 'fixture-itemsHash',
  },
  SETTINGS_PADRAO,
);
const STORED_PLAN = toStoredFreightPlan(PLAN) as unknown as Json;

function makeQuote(
  freightPlan: Json | null,
  items: Array<{ product_id: string; product_name: string; product_sku?: string }>,
) {
  return {
    id: QUOTE_ID,
    quote_number: 'ORC-0001',
    status: 'draft',
    created_at: '2026-01-10T12:00:00Z',
    updated_at: '2026-01-10T12:00:00Z',
    client_name: 'Cliente Teste',
    items,
    freight_plan: freightPlan,
  };
}

describe('QuoteViewPage — plano de volumes em leitura (etapa 66)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('freight_plan ok → painel "Volumes para transporte" aparece', async () => {
    fetchQuote.mockResolvedValue(
      makeQuote(STORED_PLAN, [
        { product_id: 'caderneta', product_name: 'Caderneta A5' },
        { product_id: 'squeeze', product_name: 'Squeeze 500 ml' },
      ]),
    );

    render(<QuoteViewPage />);

    expect(await screen.findByText('Volumes para transporte')).toBeInTheDocument();
  });

  it('freight_plan inválido/null → painel NÃO aparece', async () => {
    fetchQuote.mockResolvedValue(makeQuote(null, []));

    render(<QuoteViewPage />);

    await waitFor(() => expect(fetchQuote).toHaveBeenCalled());
    expect(screen.queryByText('Volumes para transporte')).not.toBeInTheDocument();
  });

  it('freight_plan ok sem quote.items → painel renderiza sem rótulos', async () => {
    fetchQuote.mockResolvedValue(makeQuote(STORED_PLAN, []));

    render(<QuoteViewPage />);

    expect(await screen.findByText('Volumes para transporte')).toBeInTheDocument();
  });
});
