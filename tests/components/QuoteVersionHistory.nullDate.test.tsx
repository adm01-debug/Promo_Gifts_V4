/**
 * QuoteVersionHistory — versão com timestamp NULL não derruba a tela.
 *
 * Defeito original: o hook coagia `created_at` nullable para string vazia, e
 * `format(new Date(''), ...)` (date-fns 4.4.0) lança `RangeError: Invalid time value`
 * dentro do map de versões, derrubando o render do histórico e, por composição, o
 * painel em src/pages/quotes/QuoteViewPage.tsx.
 *
 * Este teste renderiza o componente com `created_at: null` e exige que a lista
 * apareça com "—" no lugar da data, em vez de estourar.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { QuoteVersion } from '@/hooks/quotes/useQuoteVersions';

const versions: QuoteVersion[] = [
  {
    id: 'v1',
    quote_number: 'ORC-0001',
    version: 1,
    status: 'draft',
    total: 1500,
    subtotal: 1500,
    discount_amount: 0,
    discount_percent: 0,
    created_at: null,
    updated_at: null,
    is_latest_version: false,
    parent_quote_id: null,
    items_count: 2,
  },
  {
    id: 'v3',
    quote_number: 'ORC-0001',
    version: 3,
    status: 'draft',
    total: 100,
    subtotal: 100,
    discount_amount: 0,
    discount_percent: 0,
    created_at: '',
    updated_at: '',
    is_latest_version: false,
    parent_quote_id: 'v1',
    items_count: 1,
  },
  {
    id: 'v2',
    quote_number: 'ORC-0001',
    version: 2,
    status: 'sent',
    total: 1800,
    subtotal: 1800,
    discount_amount: 0,
    discount_percent: 0,
    created_at: '2026-11-10T12:30:00Z',
    updated_at: '2026-11-10T12:30:00Z',
    is_latest_version: true,
    parent_quote_id: 'v1',
    items_count: 3,
  },
];

vi.mock('@/hooks/quotes', () => ({
  useQuoteVersions: () => ({
    versions,
    isLoading: false,
    fetchVersions: vi.fn(),
    createNewVersion: vi.fn(),
    hasMultipleVersions: true,
  }),
}));

import { QuoteVersionHistory } from '@/components/quotes/QuoteVersionHistory';

describe('QuoteVersionHistory com timestamp nulo', () => {
  it('renderiza a lista sem estourar e mostra "—" na versão sem data', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <QuoteVersionHistory quoteId="v2" currentQuoteId="v2" />
        </TooltipProvider>
      </MemoryRouter>,
    );

    // As duas versões continuam na tela: nenhuma exceção interrompeu o map.
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();

    // A versão sem data mostra o placeholder; a que tem data mostra a data formatada.
    // Duas sem data (null e string vazia, que era o valor coagido antigo) => dois placeholders.
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText(/10\/11\/26/)).toBeInTheDocument();
  });
});
