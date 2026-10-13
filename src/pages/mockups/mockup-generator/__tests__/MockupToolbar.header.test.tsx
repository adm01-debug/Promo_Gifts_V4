/**
 * MockupToolbar.header.test.tsx
 *
 * Cabeçalho de trabalho do gerador de mockups (Codex p.6):
 *   - mostra o cliente selecionado e o estado de salvamento;
 *   - mostra o nome do projeto quando informado;
 *   - "Trocar cliente" reconcilia a marca já aplicada (PERGUNTA antes de trocar,
 *     nunca troca em silêncio);
 *   - expõe o acesso ao histórico ("Meus mockups");
 *   - voltar entre etapas do assistente preserva as escolhas já feitas.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MockupToolbar } from '../MockupToolbar';
import { MockupWizard } from '@/components/mockup/MockupWizard';

type ToolbarProps = React.ComponentProps<typeof MockupToolbar>;

function renderToolbar(overrides: Partial<ToolbarProps> = {}) {
  const props: ToolbarProps = {
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    isDraftSaving: false,
    lastSaved: null,
    draftError: null,
    ...overrides,
  };
  const utils = render(
    <MemoryRouter>
      <TooltipProvider>
        <MockupToolbar {...props} />
      </TooltipProvider>
    </MemoryRouter>,
  );
  return { props, ...utils };
}

describe('MockupToolbar — cabeçalho de trabalho', () => {
  it('mostra o cliente selecionado e o estado de salvamento', () => {
    renderToolbar({
      client: { name: 'Padaria Aurora', logoUrl: null },
      lastSaved: new Date('2026-10-09T12:00:00'),
    });

    expect(screen.getByTestId('mockup-toolbar-client')).toHaveTextContent('Padaria Aurora');
    expect(screen.getByText('Salvo')).toBeInTheDocument();
  });

  it('mostra o nome do projeto somente quando informado', () => {
    const { unmount } = renderToolbar({ projectName: 'Campanha Verão 2027' });
    expect(screen.getByTestId('mockup-toolbar-project')).toHaveTextContent('Campanha Verão 2027');
    unmount();

    renderToolbar();
    expect(screen.queryByTestId('mockup-toolbar-project')).not.toBeInTheDocument();
  });

  it('expõe o link "Meus mockups" apontando para o histórico', () => {
    renderToolbar();
    const link = screen.getByRole('link', { name: /meus mockups/i });
    expect(link).toHaveAttribute('href', '/mockups/historico');
  });

  it('trocar cliente com marca aplicada PERGUNTA o que fazer — nunca troca em silêncio', async () => {
    const user = userEvent.setup();
    const onChangeClient = vi.fn();
    renderToolbar({ hasAppliedBrand: true, onChangeClient });

    await user.click(screen.getByRole('button', { name: /trocar cliente/i }));

    const dialog = await screen.findByTestId('change-client-dialog');
    expect(dialog).toHaveTextContent(/marca aplicada/i);
    // Enquanto o usuário não decide, o cliente NÃO foi trocado.
    expect(onChangeClient).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('change-client-dialog-yes'));
    expect(onChangeClient).toHaveBeenCalledTimes(1);
    expect(onChangeClient).toHaveBeenCalledWith('manter-marca');
  });

  it('permite remover a marca aplicada ao trocar de cliente', async () => {
    const user = userEvent.setup();
    const onChangeClient = vi.fn();
    renderToolbar({ hasAppliedBrand: true, onChangeClient });

    await user.click(screen.getByRole('button', { name: /trocar cliente/i }));
    await screen.findByTestId('change-client-dialog');
    await user.click(screen.getByTestId('change-client-dialog-no'));

    expect(onChangeClient).toHaveBeenCalledWith('limpar-marca');
  });

  it('sem marca aplicada, trocar cliente não pergunta nada', async () => {
    const user = userEvent.setup();
    const onChangeClient = vi.fn();
    renderToolbar({ hasAppliedBrand: false, onChangeClient });

    await user.click(screen.getByRole('button', { name: /trocar cliente/i }));

    expect(onChangeClient).toHaveBeenCalledWith('manter-marca');
    expect(screen.queryByTestId('change-client-dialog')).not.toBeInTheDocument();
  });

  it('fechar a reconciliação (Esc) não decide nada: nem troca nem limpa a marca', async () => {
    const user = userEvent.setup();
    const onChangeClient = vi.fn();
    renderToolbar({ hasAppliedBrand: true, onChangeClient });

    await user.click(screen.getByRole('button', { name: /trocar cliente/i }));
    await screen.findByTestId('change-client-dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByTestId('change-client-dialog')).toBeNull());
    // Esc fecha a camada ativa sem aplicar disposição nenhuma (Plano, a11y).
    expect(onChangeClient).not.toHaveBeenCalled();
  });
});

describe('MockupWizard — voltar entre etapas preserva escolhas', () => {
  function renderWizard(overrides: Partial<React.ComponentProps<typeof MockupWizard>> = {}) {
    const onStepClick = vi.fn();
    const utils = render(
      <MockupWizard
        currentStep={3}
        hasClient
        hasProduct
        hasTechnique
        hasLogo={false}
        hasPositioned={false}
        hasGenerated={false}
        onStepClick={onStepClick}
        {...overrides}
      />,
    );
    return { onStepClick, ...utils };
  }

  it('volta para a etapa anterior sem apagar as escolhas já feitas', async () => {
    const user = userEvent.setup();
    const { onStepClick } = renderWizard();

    // Escolhas atuais: Empresa e Produto concluídos.
    expect(screen.getByLabelText('Etapa 1: Empresa (concluída)')).toBeInTheDocument();
    expect(screen.getByLabelText('Etapa 2: Produto (concluída)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voltar para a etapa anterior/i }));

    expect(onStepClick).toHaveBeenCalledWith(2);
    // Voltar NÃO apaga o trabalho: os passos concluídos seguem concluídos.
    expect(screen.getByLabelText('Etapa 1: Empresa (concluída)')).toBeInTheDocument();
    expect(screen.getByLabelText('Etapa 2: Produto (concluída)')).toBeInTheDocument();
  });

  it('na primeira etapa o Voltar fica desabilitado', () => {
    renderWizard({
      currentStep: 1,
      hasClient: false,
      hasProduct: false,
      hasTechnique: false,
    });
    expect(screen.getByRole('button', { name: /voltar para a etapa anterior/i })).toBeDisabled();
  });
});
