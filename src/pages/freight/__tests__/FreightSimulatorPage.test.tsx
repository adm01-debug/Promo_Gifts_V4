/**
 * Testes do Simulador de Volumes de Frete (Bloco F, etapas 54-57).
 *
 * Cobre a página inteira com o cliente Supabase simulado do harness de frete:
 * busca + adição de produtos, edição de quantidade, remoção, CEP (máscara,
 * validação e aviso de cotação) e o handoff "Levar para orçamento" via
 * `quote_builder_autosave` no localStorage.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import FreightSimulatorPage from '@/pages/freight/FreightSimulatorPage';
import { CANETA, CADERNETA } from '@/lib/freight/__tests__/fixtures/products';
import type { Product } from '@/hooks/quotes/useQuoteBuilderState.helpers';
import { fromSimulado } from '@/components/freight-plan/__tests__/freightPlanCard.harness';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tabela: string) => fromSimulado(tabela) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, useNavigate: () => navigateMock };
});

const buscaMock = vi.fn();
vi.mock('@/hooks/quotes/useQuoteBuilderState.helpers', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, loadQuoteSearchProducts: (search: string) => buscaMock(search) };
});

function productFixture(row: { id: string; name: string; sku: string }): Product {
  return { id: row.id, name: row.name, sku: row.sku, price: 10, images: null };
}

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/simulador-frete']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderPage() {
  return render(
    <Providers>
      <FreightSimulatorPage />
    </Providers>,
  );
}

describe('FreightSimulatorPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    buscaMock.mockReset();
    buscaMock.mockResolvedValue([productFixture(CANETA), productFixture(CADERNETA)]);
    localStorage.clear();
  });

  it('abre vazia com o título e o CEP com máscara e validação', async () => {
    renderPage();
    expect(screen.getByTestId('page-title-simulador-frete')).toBeInTheDocument();
    expect(
      screen.getByText('Nenhum produto ainda. Adicione para calcular o plano de volumes.'),
    ).toBeInTheDocument();

    const cep = screen.getByTestId('simulator-cep');
    await userEvent.type(cep, '13015000');
    expect(cep).toHaveValue('13015-000');
    expect(screen.queryByTestId('simulator-cep-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('simulator-cep-hint')).toHaveTextContent(
      'Cotação: disponível em breve.',
    );

    await userEvent.clear(cep);
    await userEvent.type(cep, '123');
    expect(screen.getByTestId('simulator-cep-error')).toHaveTextContent('CEP inválido');
  });

  it('adiciona 2 produtos, altera quantidade e remove 1 (etapa 55)', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('simulator-open-search'));
    const optionCaneta = await screen.findByTestId(`product-search-option-${CANETA.id}`);
    await user.click(optionCaneta);
    expect(screen.getByTestId(`simulator-item-${CANETA.id}`)).toBeInTheDocument();

    await user.click(screen.getByTestId('simulator-open-search'));
    const optionCaderneta = await screen.findByTestId(`product-search-option-${CADERNETA.id}`);
    await user.click(optionCaderneta);
    expect(screen.getByTestId(`simulator-item-${CADERNETA.id}`)).toBeInTheDocument();

    const qty = screen.getByTestId(`simulator-qty-${CANETA.id}`);
    fireEvent.change(qty, { target: { value: '4' } });
    expect(qty).toHaveValue(4);

    await user.click(screen.getByTestId(`simulator-remove-${CADERNETA.id}`));
    expect(screen.queryByTestId(`simulator-item-${CADERNETA.id}`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`simulator-item-${CANETA.id}`)).toBeInTheDocument();
  });

  it('leva para o orçamento gravando rascunho com itens e mixMode (etapa 57)', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('simulator-open-search'));
    const option = await screen.findByTestId(`product-search-option-${CANETA.id}`);
    await user.click(option);

    const carry = screen.getByTestId('simulator-carry-to-quote');
    await waitFor(() => expect(carry).toBeEnabled());
    await user.click(carry);

    expect(navigateMock).toHaveBeenCalledWith('/orcamentos/novo');
    const raw = localStorage.getItem('quote_builder_autosave');
    expect(raw).toBeTruthy();
    const payload = JSON.parse(raw!);
    expect(payload.data.freightMixMode).toBe('misturar');
    expect(payload.data.items).toHaveLength(1);
    expect(payload.data.items[0].product_id).toBe(CANETA.id);
    expect(payload.data.items[0].quantity).toBe(1);
  });
});
