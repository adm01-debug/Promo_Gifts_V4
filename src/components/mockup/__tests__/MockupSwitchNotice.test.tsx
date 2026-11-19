/**
 * Aviso de manutenção da geração de mockup — contrato ponta a ponta.
 *
 * Fato de produção (doufsxqlfjyuvxuezpln, public.system_kill_switches): a
 * linha `edge_generate_mockup` está com `enabled = true` e tem
 * `legacy_message` configurada; a coluna `reason` diz que, em incidente, o
 * dono faz `enabled = false` e «usuários passam a ver legacy_message».
 *
 * Os três casos cobertos aqui são exatamente as três pontas disso:
 *   1. switch ligado              → nenhum aviso, botão habilitado;
 *   2. switch desligado c/ texto  → aviso com o TEXTO DO BANCO + botão inativo;
 *   3. leitura do switch falhou   → tela não quebra e o botão continua
 *      habilitado (telemetria não pode travar venda — fail-open).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getKillSwitchState, type KillSwitchState } from '@/lib/external-db/kill-switch-client';
import { MockupLayoutButtons } from '@/components/mockup/approval/MockupLayoutButtons';
import { MockupSwitchNotice, useMockupKillSwitch } from '@/components/mockup/MockupSwitchNotice';

vi.mock('@/lib/external-db/kill-switch-client', () => ({
  getKillSwitchState: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/mockup/approval/MockupApprovalPreview', () => ({
  MockupApprovalPreview: () => null,
}));

const getKillSwitchStateMock = vi.mocked(getKillSwitchState);

/** Texto real da coluna `legacy_message` da linha `edge_generate_mockup`. */
const LEGACY_MESSAGE =
  'A geração de mockups está temporariamente indisponível para manutenção. Tente novamente em alguns minutos.';

/** Reproduz a fiação da página: aviso + botão governados pelo mesmo hook. */
function Screen() {
  const { blockedMessage } = useMockupKillSwitch();
  return (
    <TooltipProvider>
      <MockupSwitchNotice />
      <MockupLayoutButtons
        generatedMockup={null}
        product={{ name: 'Caneca' }}
        technique={{ name: 'Silk' }}
        client={null}
        seller={null}
        activeArea={{
          logoWidth: 3,
          logoHeight: 3,
          logoPreview: 'data:image/png;base64,logo',
          positionX: 50,
          positionY: 50,
          name: 'Frente',
        }}
        onGenerateMockup={() => Promise.resolve()}
        generationBlockedReason={blockedMessage}
      />
    </TooltipProvider>
  );
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Screen />
    </QueryClientProvider>,
  );
}

const generateButton = () => screen.getByRole('button', { name: /Gerar Mockup/i });

describe('MockupSwitchNotice + botão Gerar Mockup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switch ligado: nenhum aviso e botão habilitado', async () => {
    const state: KillSwitchState = { enabled: true, source: 'network' };
    getKillSwitchStateMock.mockResolvedValue(state);

    renderScreen();

    await waitFor(() =>
      expect(getKillSwitchStateMock).toHaveBeenCalledWith('edge_generate_mockup'),
    );
    await waitFor(() => expect(generateButton()).not.toBeDisabled());
    expect(screen.queryByTestId('kill-switch-notice')).toBeNull();
  });

  it('switch desligado com mensagem: aviso com o texto do banco e botão inativo', async () => {
    const state: KillSwitchState = {
      enabled: false,
      message: LEGACY_MESSAGE,
      source: 'network',
    };
    getKillSwitchStateMock.mockResolvedValue(state);

    renderScreen();

    const notice = await screen.findByTestId('kill-switch-notice');
    expect(notice).toHaveTextContent(LEGACY_MESSAGE);
    await waitFor(() => expect(generateButton()).toBeDisabled());
  });

  it('switch desligado SEM mensagem: nada a mostrar, botão segue habilitado', async () => {
    const state: KillSwitchState = { enabled: false, message: null, source: 'network' };
    getKillSwitchStateMock.mockResolvedValue(state);

    renderScreen();

    await waitFor(() => expect(getKillSwitchStateMock).toHaveBeenCalled());
    await waitFor(() => expect(generateButton()).not.toBeDisabled());
    expect(screen.queryByTestId('kill-switch-notice')).toBeNull();
  });

  it('falha ao ler o switch: tela não quebra e botão continua habilitado', async () => {
    getKillSwitchStateMock.mockRejectedValue(new Error('network down'));

    renderScreen();

    await waitFor(() => expect(getKillSwitchStateMock).toHaveBeenCalled());
    await waitFor(() => expect(generateButton()).not.toBeDisabled());
    expect(screen.queryByTestId('kill-switch-notice')).toBeNull();
  });
});
