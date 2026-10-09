import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MockupToolbar } from '../MockupToolbar';

function renderToolbar(over: Partial<React.ComponentProps<typeof MockupToolbar>> = {}) {
  return render(
    <TooltipProvider>
      <MockupToolbar
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        isDraftSaving={false}
        lastSaved={null}
        draftError={null}
        {...over}
      />
    </TooltipProvider>,
  );
}

describe('MockupToolbar — status do rascunho', () => {
  it('mostra o erro atual (e não Salvo) quando há lastSaved antigo E draftError', () => {
    renderToolbar({ lastSaved: new Date(), draftError: 'falha ao gravar' });
    expect(screen.getByText('Erro ao salvar')).toBeInTheDocument();
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument();
  });

  it('erro tem prioridade sobre Salvando...', () => {
    renderToolbar({ isDraftSaving: true, draftError: 'falha ao gravar' });
    expect(screen.getByText('Erro ao salvar')).toBeInTheDocument();
    expect(screen.queryByText('Salvando...')).not.toBeInTheDocument();
  });

  it('sem erro, salvando tem prioridade sobre Salvo', () => {
    renderToolbar({ isDraftSaving: true, lastSaved: new Date() });
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument();
  });

  it('sem erro e sem salvamento em curso mostra Salvo', () => {
    renderToolbar({ lastSaved: new Date() });
    expect(screen.getByText('Salvo')).toBeInTheDocument();
    expect(screen.queryByText('Erro ao salvar')).not.toBeInTheDocument();
  });

  it('sem nada não mostra status', () => {
    renderToolbar();
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument();
    expect(screen.queryByText('Erro ao salvar')).not.toBeInTheDocument();
    expect(screen.queryByText('Salvando...')).not.toBeInTheDocument();
  });
});
