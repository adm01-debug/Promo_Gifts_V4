/**
 * Guarda da PR #3615: as ações destrutivas do Connections Hub (reenviar webhooks
 * falhados + apagar logs antigos) NÃO podem disparar sem confirmação explícita.
 * "Rodar auditoria" segue sendo só-leitura.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntegrationsHealthCard } from '../IntegrationsHealthCard';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/edge/safeInvokeCall', () => ({ invokeEdge: vi.fn() }));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

/** Contagens por tabela, p/ provar que a mensagem vem da leitura real. */
const COUNT_BY_TABLE: Record<string, number> = {
  webhook_deliveries: 3,
  inbound_webhook_events: 5,
};

vi.mock('@/integrations/supabase/client', () => {
  const makeBuilder = (table: string) => {
    const result = { count: COUNT_BY_TABLE[table] ?? 0, data: [], error: null };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const method of ['select', 'eq', 'gte', 'lt', 'is', 'not', 'order', 'limit']) {
      builder[method] = vi.fn(chain);
    }
    builder.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    // Thenable: `await supabase.from(...).select(...)` resolve no resultado.
    builder.then = (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled);
    return builder;
  };
  return { supabase: { from: vi.fn((table: string) => makeBuilder(table)) } };
});

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntegrationsHealthCard />
    </QueryClientProvider>,
  );
}

const DESTRUCTIVE_BODY = { body: { confirm: true, action: 'retry_and_cleanup' } };

describe('IntegrationsHealthCard — confirmação das ações destrutivas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      rolesLoaded: true,
      isAdmin: true,
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(invokeEdge).mockResolvedValue({ data: null, error: null } as never);
  });

  it('não dispara a ação destrutiva ao clicar no botão: só abre a confirmação', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /Retry \+ limpeza real/i }));

    // A confirmação aparece com o impacto calculado pela leitura só-leitura.
    const dialog = await screen.findByTestId('connections-hub-real-actions-confirm');
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByTestId('connections-hub-real-actions-confirm-description'),
    ).toHaveTextContent(/reenviar até 3 webhook\(s\) falhado\(s\).*apagar 8 log\(s\)/i);

    // Nenhuma chamada destrutiva à edge function antes de confirmar.
    expect(invokeEdge).not.toHaveBeenCalledWith('connections-hub-audit', DESTRUCTIVE_BODY);
    expect(invokeEdge).not.toHaveBeenCalled();
  });

  it('dispara a ação destrutiva somente depois de confirmar', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /Retry \+ limpeza real/i }));
    await screen.findByTestId('connections-hub-real-actions-confirm');
    expect(invokeEdge).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('connections-hub-real-actions-confirm-yes'));

    await waitFor(() => {
      expect(invokeEdge).toHaveBeenCalledWith('connections-hub-audit', DESTRUCTIVE_BODY);
    });
    expect(invokeEdge).toHaveBeenCalledTimes(1);
  });

  it('cancelar a confirmação não dispara a ação destrutiva', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /Retry \+ limpeza real/i }));
    await screen.findByTestId('connections-hub-real-actions-confirm');

    await user.click(screen.getByTestId('connections-hub-real-actions-confirm-no'));

    await waitFor(() => {
      expect(screen.queryByTestId('connections-hub-real-actions-confirm')).not.toBeInTheDocument();
    });
    expect(invokeEdge).not.toHaveBeenCalled();
  });

  it('"Rodar auditoria" é só leitura: chama a edge function sem confirm/action', async () => {
    const user = userEvent.setup();
    vi.mocked(invokeEdge).mockResolvedValue({
      data: { score: 10, passed: 10, total: 10 },
      error: null,
    } as never);
    renderCard();

    await user.click(screen.getByRole('button', { name: /Rodar auditoria/i }));

    await waitFor(() => {
      expect(invokeEdge).toHaveBeenCalledWith('connections-hub-audit');
    });
    expect(invokeEdge).not.toHaveBeenCalledWith('connections-hub-audit', DESTRUCTIVE_BODY);
  });
});
