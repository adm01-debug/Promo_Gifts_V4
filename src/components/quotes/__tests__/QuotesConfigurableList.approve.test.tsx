/**
 * Aprovar um orçamento direto da lista, sem abrir a tela do orçamento.
 *
 * Resgatado de `importado`/`codex/fix-gate1-kit-pdf-types-261109-2252`, o último
 * item vivo do dossiê daquela branch. Estava bloqueado pela #3548, que alterava
 * este mesmo arquivo.
 *
 * O que estava pela metade na `main`: `QuotesListPage.tsx` já passava
 * `onBulkStatusChange`, que chama `updateQuoteStatus(id, 'approved')` com toast,
 * mas o componente recebia a prop como `_onBulkStatusChange` e a DESCARTAVA.
 * A ação em lote existia no pai e nunca chegava à UI.
 *
 * Por isso o item usa `onBulkStatusChange([id], 'approved')` em vez de uma prop
 * nova: a permissão efetiva continua sendo a do banco, a mesma do caminho em
 * lote. A UI não cria regra de quem pode aprovar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QuotesConfigurableList } from '@/components/quotes/QuotesConfigurableList';
import type { Quote } from '@/hooks/quotes';

const quote = (status: Quote['status']): Quote =>
  ({
    id: 'q-1',
    quote_number: 'ORC-001',
    client_name: 'Cliente Um',
    client_company: 'Empresa A',
    status,
    total: 100,
    created_at: '2026-01-01T00:00:00Z',
  }) as Quote;

function renderList(
  props: Partial<React.ComponentProps<typeof QuotesConfigurableList>> = {},
  status: Quote['status'] = 'sent',
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TooltipProvider>
          <QuotesConfigurableList
            quotes={[quote(status)]}
            onDelete={vi.fn()}
            onBulkDelete={vi.fn()}
            onDuplicate={vi.fn()}
            {...props}
          />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const openRowMenu = async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(screen.getByTestId('quote-row-more-q-1'));
  await screen.findByTestId('quote-row-menu-q-1');
  return user;
};

describe('QuotesConfigurableList — aprovar da lista', () => {
  beforeEach(() => {
    // O menu do Radix usa estas APIs de ponteiro, ausentes no jsdom.
    Element.prototype.hasPointerCapture = vi.fn(
      () => false,
    ) as unknown as Element['hasPointerCapture'];
    Element.prototype.releasePointerCapture =
      vi.fn() as unknown as Element['releasePointerCapture'];
    Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView'];
  });

  it('aprova o orçamento pelo mesmo caminho que o pai já usa para o lote', async () => {
    const onBulkStatusChange = vi.fn();
    renderList({ onBulkStatusChange }, 'sent');

    const user = await openRowMenu();
    await user.click(screen.getByTestId('quote-row-menu-approve-q-1'));

    expect(onBulkStatusChange).toHaveBeenCalledWith(['q-1'], 'approved');
  }, 15000);

  it('não oferece aprovar quando a transição é inválida para o status atual', async () => {
    // `approved` só pode ir para `converted` (quote-status-config.ts).
    renderList({ onBulkStatusChange: vi.fn() }, 'approved');

    await openRowMenu();

    expect(screen.queryByTestId('quote-row-menu-approve-q-1')).not.toBeInTheDocument();
  }, 15000);

  it('não oferece aprovar quando o pai não passa o handler', async () => {
    renderList({}, 'sent');

    await openRowMenu();

    expect(screen.queryByTestId('quote-row-menu-approve-q-1')).not.toBeInTheDocument();
    // As ações que já existiam seguem lá.
    expect(screen.getByTestId('quote-row-menu-view-q-1')).toBeInTheDocument();
    expect(screen.getByTestId('quote-row-menu-delete-q-1')).toBeInTheDocument();
  }, 15000);
});
