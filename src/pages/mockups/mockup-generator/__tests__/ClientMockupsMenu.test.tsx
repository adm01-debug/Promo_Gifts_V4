/**
 * ClientMockupsMenu — "Meus mockups" do cabeçalho do gerador, ligado ao
 * `useClientMockups`. Cobre os estados reais do painel: sem cliente, carregando,
 * erro (com repetição), vazio e lista; e o rodapé para o histórico completo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ClientMockupsMenu } from '../ClientMockupsMenu';
import type { ClientMockup } from '@/hooks/mockup/useClientMockups';

type QueryShape = {
  data: ClientMockup[] | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
};

const settled = (over: Partial<QueryShape> = {}): QueryShape => ({
  data: [],
  isPending: false,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
  ...over,
});

const useClientMockupsMock = vi.fn<(...args: unknown[]) => QueryShape>(() => settled());
vi.mock('@/hooks/mockup/useClientMockups', () => ({
  useClientMockups: (...args: unknown[]) => useClientMockupsMock(...args),
}));

const MOCKUPS: ClientMockup[] = [
  {
    id: 'm1',
    productName: 'Caneca Cerâmica',
    techniqueName: 'Sublimação',
    createdAt: '2026-10-09T12:00:00.000Z',
    path: 'user/m1.png',
    thumbnailUrl: 'https://cdn.test/m1.png?token=abc',
  },
  {
    id: 'm2',
    productName: null,
    techniqueName: null,
    createdAt: 'data-invalida',
    path: null,
    thumbnailUrl: null,
  },
];

async function openMenu(props: Partial<React.ComponentProps<typeof ClientMockupsMenu>> = {}) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ClientMockupsMenu
        clientId="crm-1"
        clientName="Padaria Aurora"
        historyHref="/mockups/historico"
        {...props}
      />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: /meus mockups/i }));
  await screen.findByTestId('client-mockups-panel');
  return user;
}

beforeEach(() => {
  useClientMockupsMock.mockReset();
  useClientMockupsMock.mockImplementation(() => settled());
});

describe('ClientMockupsMenu — estados do painel', () => {
  it('sem cliente selecionado orienta a escolher um cliente e ainda oferece o histórico', async () => {
    await openMenu({ clientId: null, clientName: null });
    expect(screen.getByTestId('client-mockups-no-client')).toHaveTextContent(
      /selecione um cliente/i,
    );
    expect(screen.getByRole('link', { name: /ver histórico completo/i })).toHaveAttribute(
      'href',
      '/mockups/historico',
    );
  });

  it('consulta pelo client_id do CRM com o limite do painel', async () => {
    await openMenu();
    expect(useClientMockupsMock).toHaveBeenCalledWith(
      'crm-1',
      expect.objectContaining({ limit: 8 }),
    );
  });

  it('carregando expõe um status acessível em vez de lista vazia', async () => {
    useClientMockupsMock.mockImplementation(() => settled({ data: undefined, isPending: true }));
    await openMenu();
    expect(screen.getByRole('status', { name: /carregando mockups/i })).toBeInTheDocument();
    expect(screen.queryByTestId('client-mockups-empty')).not.toBeInTheDocument();
  });

  it('erro mostra alerta e "Tentar novamente" refaz a consulta', async () => {
    const refetch = vi.fn();
    useClientMockupsMock.mockImplementation(() =>
      settled({ data: undefined, isError: true, refetch }),
    );
    const user = await openMenu();
    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('lista vazia nomeia o cliente', async () => {
    await openMenu();
    expect(screen.getByTestId('client-mockups-empty')).toHaveTextContent(
      'Nenhum mockup salvo para Padaria Aurora ainda.',
    );
  });

  it('lista os mockups do cliente: item com miniatura abre a imagem; sem foto fica só texto', async () => {
    useClientMockupsMock.mockImplementation(() => settled({ data: MOCKUPS }));
    await openMenu();
    const list = screen.getByRole('list', { name: /mockups de padaria aurora/i });
    expect(list).toHaveTextContent('Caneca Cerâmica');
    expect(list).toHaveTextContent('Sublimação');
    expect(screen.getByRole('link', { name: /abrir mockup caneca cerâmica/i })).toHaveAttribute(
      'href',
      'https://cdn.test/m1.png?token=abc',
    );
    // Sem foto utilizável: não vira link quebrado; data inválida não derruba o item.
    expect(list).toHaveTextContent('Produto não informado');
    expect(screen.queryByRole('link', { name: /abrir mockup produto não informado/i })).toBeNull();
  });
});
