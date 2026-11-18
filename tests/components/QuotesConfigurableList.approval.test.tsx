import { type HTMLAttributes, type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Quote } from '@/hooks/quotes';
import { QuotesConfigurableList } from '@/components/quotes/QuotesConfigurableList';

const auth = vi.hoisted(() => ({
  user: { id: 'seller-1' } as { id: string } | null,
  isSeller: true,
  canManage: false,
  rolesLoaded: true,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/quotes/useQuoteClientLogos', () => ({
  useQuoteClientLogos: () => ({ data: {}, isLoading: false }),
}));
vi.mock('@/hooks/quotes/useQuoteItemCounts', () => ({
  useQuoteItemCounts: () => ({ data: {}, isLoading: false }),
}));
vi.mock('@/hooks/common/usePrefetchOnHover', () => ({ usePrefetchOnHover: () => ({}) }));
vi.mock('@/components/quotes/QuoteListCellRenderer', () => ({ renderQuoteCell: () => null }));
// Exercise the callbacks and authorization boundary without depending on portal animation timing.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: PropsWithChildren) => <>{children}</>,
  DropdownMenuContent: ({ children }: PropsWithChildren) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  DropdownMenuItem: ({ children, ...props }: HTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

const quote: Quote = {
  id: 'q1',
  seller_id: 'seller-1',
  quote_number: 'ORC-1',
  status: 'sent',
  subtotal: 100,
  discount_percent: 0,
  discount_amount: 0,
  total: 100,
};
function view(status: Quote['status'] = 'sent', callback?: (ids: string[], status: string) => void) {
  const remove = vi.fn();
  const duplicate = vi.fn();
  render(
    <MemoryRouter>
      <QuotesConfigurableList
        quotes={[{ ...quote, status }]}
        onDelete={remove}
        onBulkDelete={vi.fn()}
        onDuplicate={duplicate}
        // O main renomeou e reassinou a prop: a lista nao cria regra propria de
        // aprovacao, ela reusa o handler de acao em lote
        // (QuotesConfigurableList.tsx:93,540 -> QuoteRowApproveItem).
        onBulkStatusChange={callback}
      />
    </MemoryRouter>,
  );
  return { remove, duplicate };
}
beforeEach(() => {
  sessionStorage.clear();
  Object.assign(auth, {
    user: { id: 'seller-1' },
    isSeller: true,
    canManage: false,
    rolesLoaded: true,
  });
});
afterEach(cleanup);

describe('optional manual quote approval', () => {
  it('keeps all original actions and exposes no extra action when the callback is absent', () => {
    const { remove, duplicate } = view();
    expect(screen.queryByTestId('quote-row-menu-approve-q1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('quote-row-menu-duplicate-q1'));
    fireEvent.click(screen.getByTestId('quote-row-menu-delete-q1'));
    expect(duplicate).toHaveBeenCalledExactlyOnceWith('q1');
    expect(remove).toHaveBeenCalledExactlyOnceWith('q1');
    expect(screen.getByTestId('quote-row-menu-view-q1')).toBeInTheDocument();
    expect(screen.getByTestId('quote-row-menu-edit-q1')).toBeInTheDocument();
  });
  it.each(['sent', 'viewed'] as const)(
    'calls the authorized seller action once for %s',
    (status) => {
      const callback = vi.fn();
      view(status, callback);
      fireEvent.click(screen.getByTestId('quote-row-menu-approve-q1'));
      expect(callback).toHaveBeenCalledExactlyOnceWith(['q1'], 'approved');
    },
  );
  it('allows an existing manager to approve another seller’s quote', () => {
    auth.user = { id: 'manager' };
    auth.isSeller = false;
    auth.canManage = true;
    const callback = vi.fn();
    view('sent', callback);
    fireEvent.click(screen.getByTestId('quote-row-menu-approve-q1'));
    expect(callback).toHaveBeenCalledOnce();
  });
  // NAO PORTADO — precisa de decisao do dono, nao de codigo.
  //
  // O autor cobrava que o item "Aprovar" NAO aparecesse para comprador, outro
  // vendedor, papeis ainda carregando e anonimo. O main nao faz essa checagem na
  // UI de proposito: QuoteRowApproveItem.tsx:23-25 so exige o handler do pai e
  // transicao valida, e o comentario do proprio componente declara a escolha —
  // "a permissao efetiva continua sendo a do banco: a lista nao cria regra nova
  // sobre quem pode aprovar".
  //
  // Ou seja: o botao aparece para todos e quem recusa e a RLS, no clique. Isso e
  // decisao de produto (mostrar e falhar vs. esconder), nao defeito de correcao,
  // e muda o que o vendedor ve — nao e minha para tomar.
  //
  // Registro importante: estes 4 casos estavam VERDES no arquivo resgatado pelo
  // motivo errado. Sem o handler `onBulkStatusChange`, o item nunca renderiza,
  // entao eles passavam sem exercer permissao alguma. Deixa-los aqui seria
  // cobertura falsa.
  it.each([
    'draft',
    'pending',
    'pending_approval',
    'approved',
    'converted',
    'rejected',
    'expired',
    'cancelled',
  ] as const)('preserves the SSOT transition restriction for %s', (status) => {
    const callback = vi.fn();
    view(status, callback);
    expect(screen.queryByTestId('quote-row-menu-approve-q1')).not.toBeInTheDocument();
    expect(callback).not.toHaveBeenCalled();
  });
});
