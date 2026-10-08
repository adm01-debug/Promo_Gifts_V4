import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { builder, deleteMock, auth } = vi.hoisted(() => {
  const builder: Record<string, any> = {};
  const auth: { user: { id: string } | null } = { user: { id: 'user-1' } };
  return { builder, deleteMock: vi.fn(), auth };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => builder) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  deleteMockupFromDb: (...a: unknown[]) => deleteMock(...a),
}));
vi.mock('@/hooks/common', () => ({ useDebounce: (v: string) => v }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/dev/DiagnosticProfiler', () => ({
  DiagnosticProfiler: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/loading/ModernSkeletons', () => ({ MockupHistorySkeleton: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import MockupHistoryPage from '../MockupHistoryPage';

const row = {
  id: 'm-1',
  product_name: 'Caneta',
  product_sku: 'CN1',
  technique_name: 'Laser',
  area_name: 'Frente',
  area_config: {},
  mockup_url: null,
  created_at: '2026-01-01T00:00:00Z',
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = () => (
    <QueryClientProvider client={qc}>
      <MockupHistoryPage />
    </QueryClientProvider>
  );
  const utils = render(tree());
  return { ...utils, rerenderPage: () => utils.rerender(tree()) };
}

describe('MockupHistoryPage', () => {
  beforeEach(() => {
    deleteMock.mockReset().mockResolvedValue(undefined);
    auth.user = { id: 'user-1' };
    vi.mocked(toast.error).mockClear();
    for (const k of ['select', 'eq', 'order', 'range', 'or']) {
      builder[k] = vi.fn(() => builder);
    }
    builder.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: [row], error: null, count: 1 });
  });

  it('filtra a consulta pelo user_id do usuário logado', async () => {
    renderPage();
    await screen.findByText('Caneta');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('excluir abre confirmação e só chama deleteMockupFromDb após confirmar', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId('mockup-history-delete-btn'));
    expect(await screen.findByText('Excluir mockup?')).toBeInTheDocument();
    expect(deleteMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('m-1', 'user-1'));
  });

  it('cancelar não exclui', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId('mockup-history-delete-btn'));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('sessão expirada com o diálogo aberto: avisa, fecha e não exclui', async () => {
    const user = userEvent.setup();
    const { rerenderPage } = renderPage();
    await user.click(await screen.findByTestId('mockup-history-delete-btn'));
    expect(await screen.findByText('Excluir mockup?')).toBeInTheDocument();
    auth.user = null;
    rerenderPage();
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Sessão expirada/)),
    );
    await waitFor(() => expect(screen.queryByText('Excluir mockup?')).not.toBeInTheDocument());
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('busca com vírgula, parênteses e % não vaza para o filtro .or()', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Caneta');
    await user.type(screen.getByPlaceholderText(/Buscar/), 'a,b(c)%d');
    await waitFor(() => expect(builder.or).toHaveBeenCalled());
    const arg = builder.or.mock.calls.at(-1)![0] as string;
    expect(arg).toBe(
      'product_name.ilike.%abcd%,product_sku.ilike.%abcd%,technique_name.ilike.%abcd%',
    );
  });
});
