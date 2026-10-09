import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MockupResultCard } from '@/components/mockup/MockupResultCard';

// canvas-confetti desenha em <canvas>, que o jsdom não implementa.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const IMAGE = 'data:image/png;base64,PRIMEIRA';

function renderCard(props: Partial<ComponentProps<typeof MockupResultCard>> = {}) {
  const merged: ComponentProps<typeof MockupResultCard> = {
    generatedMockup: IMAGE,
    isLoading: false,
    onDownload: vi.fn(),
    ...props,
  };
  return render(<MockupResultCard {...merged} />);
}

describe('MockupResultCard — imagem, projeto salvo e ficha como estados separados', () => {
  it('mostra três indicadores independentes, cada um com o próprio estado', () => {
    renderCard({ projectSave: { status: 'done' }, sheet: { status: 'idle' } });

    expect(screen.getByTestId('completion-image')).toHaveAttribute('data-status', 'done');
    expect(screen.getByTestId('completion-project-save')).toHaveAttribute('data-status', 'done');
    expect(screen.getByTestId('completion-sheet')).toHaveAttribute('data-status', 'idle');
  });

  it('falha de salvar não esconde a imagem gerada nem contamina os outros indicadores', () => {
    renderCard({ projectSave: { status: 'error', error: 'Sem conexão' } });

    // a imagem gerada continua na tela
    expect(screen.getByAltText('Mockup gerado com IA')).toHaveAttribute('src', IMAGE);
    expect(screen.getByTestId('completion-image')).toHaveAttribute('data-status', 'done');

    const save = screen.getByTestId('completion-project-save');
    expect(save).toHaveAttribute('data-status', 'error');
    expect(save).toHaveTextContent('Sem conexão');
    // a ficha não herda o erro do salvamento
    expect(screen.getByTestId('completion-sheet')).toHaveAttribute('data-status', 'idle');
  });

  it('oferece repetir só o salvar, e repetir o salvar não gera outra imagem', () => {
    const onRetrySave = vi.fn();
    const onRetryGenerate = vi.fn();
    renderCard({
      projectSave: { status: 'error', error: 'Sem conexão' },
      onRetrySave,
      onRetryGenerate,
    });

    fireEvent.click(screen.getByTestId('retry-save'));

    expect(onRetrySave).toHaveBeenCalledTimes(1);
    expect(onRetryGenerate).not.toHaveBeenCalled();
    expect(screen.getAllByAltText('Mockup gerado com IA')).toHaveLength(1);
  });

  it('repetir só a ficha também não gera imagem', () => {
    const onRetrySheet = vi.fn();
    const onRetryGenerate = vi.fn();
    renderCard({
      sheet: { status: 'error', error: 'Falha na ficha' },
      onRetrySheet,
      onRetryGenerate,
    });

    fireEvent.click(screen.getByTestId('retry-sheet'));

    expect(onRetrySheet).toHaveBeenCalledTimes(1);
    expect(onRetryGenerate).not.toHaveBeenCalled();
  });

  it('não oferece repetição para uma condição já concluída', () => {
    renderCard({ projectSave: { status: 'done' }, sheet: { status: 'done' } });

    expect(screen.queryByTestId('retry-save')).not.toBeInTheDocument();
    expect(screen.queryByTestId('retry-sheet')).not.toBeInTheDocument();
  });

  it('falha de geração conserva a imagem anterior, marcada como erro com repetição', () => {
    const onRetryGenerate = vi.fn();
    const { rerender } = renderCard();

    rerender(
      <MockupResultCard
        generatedMockup={null}
        isLoading={false}
        onDownload={vi.fn()}
        generationError="A geração falhou"
        onRetryGenerate={onRetryGenerate}
      />,
    );

    expect(screen.getByAltText('Mockup gerado com IA')).toHaveAttribute('src', IMAGE);
    expect(screen.getByTestId('completion-image')).toHaveAttribute('data-status', 'error');
    expect(screen.getByTestId('completion-image')).toHaveTextContent('A geração falhou');
    expect(screen.getByTestId('retry-generate')).toBeInTheDocument();
    expect(onRetryGenerate).not.toHaveBeenCalled();
  });
});
