import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { searchCrmMock, firstPages } = vi.hoisted(() => ({
  searchCrmMock: vi.fn(),
  firstPages: [
    {
      records: [
        {
          id: 'a1',
          name: 'Alfa Ltda',
          razao_social: 'Alfa Ltda',
          nome_fantasia: null,
          ramo: null,
          logo_url: null,
          cnpj: null,
        },
      ],
    },
  ],
}));

vi.mock('@/lib/crm-db', () => ({ searchCrm: searchCrmMock }));
vi.mock('@/hooks/crm', () => ({
  useCrmInfiniteCompanySelector: () => ({
    data: { pages: firstPages },
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: true,
    isFetchingNextPage: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/common', async () => {
  const { useDebounce } = await vi.importActual<{
    useDebounce: <T>(v: T, d?: number) => T;
  }>('@/hooks/common/useDebounce');
  return {
    useDebounce,
    // Fuzzy só nas páginas carregadas: sem a correção, é tudo o que o seletor via.
    useClientFuzzySearch: (items: Array<{ name: string }>, q: string) => ({
      results: items.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase())),
    }),
  };
});
vi.mock('@/hooks/ui/useReducedMotion', () => ({ useReducedMotion: () => true }));

import { MockupClientSelector } from '../MockupClientSelector';

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const farCompany = {
  id: 'z99',
  razao_social: 'Zeta Distante SA',
  nome_fantasia: null,
  ramo_atividade: null,
  cnpj: null,
  logo_url: null,
  is_customer: true,
  deleted_at: null,
};

const findFar = (_t: string, column: string) =>
  column === 'razao_social' ? [farCompany] : [];

function type(term: string) {
  const input = screen.getByTestId('mockup-client-search-input');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: term } });
}

describe('MockupClientSelector — busca remota', () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    searchCrmMock.mockReset();
  });

  it('busca no servidor com debounce e acha cliente fora das páginas carregadas', async () => {
    searchCrmMock.mockImplementation(findFar);
    render(<MockupClientSelector selectedClient={null} onClientSelect={vi.fn()} />, { wrapper });

    type('Zeta');
    expect(searchCrmMock).not.toHaveBeenCalled(); // debounce ainda não venceu

    expect(await screen.findByTestId('mockup-client-option-z99')).toBeTruthy();
    expect(searchCrmMock).toHaveBeenCalledWith(
      'companies',
      'razao_social',
      'Zeta',
      expect.any(Object),
    );
    expect(screen.queryByText('Nenhuma empresa encontrada')).toBeNull();
  });

  it('falha do CRM mostra indisponível com Tentar novamente, não "nenhuma encontrada"', async () => {
    searchCrmMock.mockRejectedValue(new Error('timeout'));
    render(<MockupClientSelector selectedClient={null} onClientSelect={vi.fn()} />, { wrapper });

    type('Zeta');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Nenhuma empresa encontrada')).toBeNull();

    searchCrmMock.mockImplementation(findFar);
    fireEvent.click(screen.getByText('Tentar novamente'));
    expect(await screen.findByTestId('mockup-client-option-z99')).toBeTruthy();
  });

  it('busca remota sem resultado mostra "Nenhuma empresa encontrada"', async () => {
    searchCrmMock.mockResolvedValue([]);
    render(<MockupClientSelector selectedClient={null} onClientSelect={vi.fn()} />, { wrapper });

    type('Inexistente');
    expect(await screen.findByText('Nenhuma empresa encontrada')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
