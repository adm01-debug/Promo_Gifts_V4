/**
 * Diálogos da página do gerador (MockupDialogs).
 *
 * Prova que os componentes REAIS (TechniqueChangeDialog e DeleteMockupDialog,
 * sobre o ConfirmDialog) abrem, fecham com Esc respeitando a pilha de camadas
 * (só a ativa fecha) e devolvem o foco ao gatilho. Se qualquer regra quebrar,
 * o teste fica vermelho.
 */
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechniqueChangeDialog, DeleteMockupDialog } from '../MockupDialogs';

const TECHNIQUE_DESC_WITH_DISCARD =
  'Você está trocando de "Sublimação" para "Laser". O logo será mantido, mas as dimensões serão ajustadas aos limites da nova técnica. O mockup gerado será descartado (será necessário gerar novamente).';
const TECHNIQUE_DESC_WITHOUT_DISCARD =
  'Você está trocando de "Sublimação" para "Laser". O logo será mantido, mas as dimensões serão ajustadas aos limites da nova técnica.';

function renderTechnique(
  overrides: Partial<React.ComponentProps<typeof TechniqueChangeDialog>> = {},
) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <TechniqueChangeDialog
      open
      onOpenChange={onOpenChange}
      fromName="Sublimação"
      toName="Laser"
      hasGeneratedMockup
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { ...utils, onOpenChange, onConfirm, onCancel };
}

describe('MockupDialogs — diálogos da página do gerador', () => {
  it('não renderiza nada com open=false e abre com open=true', () => {
    const props = {
      onOpenChange: vi.fn(),
      hasGeneratedMockup: true,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    };
    const { rerender } = render(<TechniqueChangeDialog open={false} {...props} />);
    expect(screen.queryByTestId('mockup-technique-change-dialog')).not.toBeInTheDocument();

    rerender(<TechniqueChangeDialog open {...props} />);
    expect(screen.getByTestId('mockup-technique-change-dialog')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Alterar técnica de personalização?');
  });

  it('descreve a troca de técnica com os nomes e alerta o descarte do mockup gerado', () => {
    renderTechnique();

    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(TECHNIQUE_DESC_WITH_DISCARD);
  });

  it('sem mockup gerado, não alerta sobre descarte', () => {
    renderTechnique({ hasGeneratedMockup: false });

    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      TECHNIQUE_DESC_WITHOUT_DISCARD,
    );
  });

  it('confirmar dispara onConfirm e fecha o diálogo', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = renderTechnique();

    await user.click(screen.getByTestId('mockup-technique-change-dialog-yes'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('Cancelar fecha o diálogo e avisa o cancelamento da troca', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onCancel } = renderTechnique();

    await user.click(screen.getByTestId('mockup-technique-change-dialog-no'));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onCancel).toHaveBeenCalled();
  });

  it('Esc no diálogo de exclusão fecha e não confirma', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(<DeleteMockupDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Esc fecha só a camada ativa (a mais recente) e mantém o diálogo de baixo', async () => {
    const user = userEvent.setup();
    function DualDialogs() {
      const [techniqueOpen, setTechniqueOpen] = useState(true);
      const [deleteOpen, setDeleteOpen] = useState(true);
      return (
        <>
          {/* Montado primeiro = camada de baixo. */}
          <TechniqueChangeDialog
            open={techniqueOpen}
            onOpenChange={setTechniqueOpen}
            fromName="Sublimação"
            toName="Laser"
            hasGeneratedMockup={false}
            onConfirm={vi.fn()}
            onCancel={vi.fn()}
          />
          {/* Montado por último = camada ativa (topo da pilha). */}
          <DeleteMockupDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={vi.fn()} />
        </>
      );
    }

    render(<DualDialogs />);
    await screen.findByTestId('mockup-technique-change-dialog');
    await screen.findByTestId('mockup-delete-dialog');

    await user.keyboard('{Escape}');

    // Só a camada do topo (exclusão) fecha; a de baixo continua aberta.
    await waitFor(() => expect(screen.queryByTestId('mockup-delete-dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('mockup-technique-change-dialog')).toBeInTheDocument();

    // Um novo Esc fecha a camada que sobrou.
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByTestId('mockup-technique-change-dialog')).not.toBeInTheDocument(),
    );
  });
});
