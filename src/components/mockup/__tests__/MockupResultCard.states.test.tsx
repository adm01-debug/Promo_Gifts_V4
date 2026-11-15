/**
 * MockupResultCard — "a imagem saiu", "o projeto foi salvo" e "a ficha está
 * pronta" como estados SEPARADOS, e a preservação do resultado em falha.
 *
 * O que está provado aqui:
 *  1. os três indicadores têm estado próprio e não se contaminam;
 *  2. uma falha de gravação não esconde a imagem já gerada;
 *  3. uma re-geração que FALHA mantém o resultado anterior na tela, rotulado,
 *     com repetição e sem deixar baixar/compartilhar como se fosse o novo;
 *  4. quando a geração nova dá certo, o resultado anterior sai de cena na hora.
 *
 * Execução: npx vitest run src/components/mockup/__tests__/MockupResultCard.states.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MockupResultCard } from '@/components/mockup/MockupResultCard';

// canvas-confetti desenha em <canvas>, que o jsdom não implementa.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const IMAGE = 'data:image/png;base64,PRIMEIRA';
const IMAGE_NOVA = 'data:image/png;base64,SEGUNDA';

type CardProps = ComponentProps<typeof MockupResultCard>;

function props(overrides: Partial<CardProps> = {}): CardProps {
  return { generatedMockup: IMAGE, isLoading: false, onDownload: vi.fn(), ...overrides };
}

function renderCard(overrides: Partial<CardProps> = {}) {
  return render(<MockupResultCard {...props(overrides)} />);
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

  it('ficha em preparo não muda o estado da imagem nem o do salvamento', () => {
    renderCard({ projectSave: { status: 'done' }, sheet: { status: 'running' } });

    expect(screen.getByTestId('completion-image')).toHaveAttribute('data-status', 'done');
    expect(screen.getByTestId('completion-project-save')).toHaveAttribute('data-status', 'done');
    expect(screen.getByTestId('completion-sheet')).toHaveAttribute('data-status', 'running');
  });

  it('não oferece repetição para a imagem quando ela já está concluída', () => {
    renderCard({ onRetryGenerate: vi.fn() });

    expect(screen.getByTestId('completion-image')).toHaveAttribute('data-status', 'done');
    expect(screen.queryByTestId('retry-generate')).not.toBeInTheDocument();
  });
});

describe('MockupResultCard — falha de geração não apaga o resultado anterior', () => {
  it('conserva a imagem anterior, rotulada como anterior, com repetição', () => {
    const onRetryGenerate = vi.fn();
    const { rerender } = renderCard();

    // Exatamente o que o dono do estado produz numa re-geração que falha:
    // generatedMockup volta a null (useMockupGenerator.ts:563) e o erro é
    // preenchido no catch (useMockupGenerator.ts:625).
    rerender(
      <MockupResultCard
        {...props({
          generatedMockup: null,
          generationError: 'A geração falhou',
          onRetryGenerate,
        })}
      />,
    );

    // 1. o resultado que o vendedor já tinha continua na tela
    expect(screen.getByAltText('Mockup gerado com IA')).toHaveAttribute('src', IMAGE);
    // 2. e está rotulado como anterior, não como o resultado da tentativa
    expect(screen.getByTestId('previous-result-notice')).toHaveTextContent('Imagem anterior');
    expect(screen.getByText('Resultado anterior')).toBeInTheDocument();
    // 3. o erro da imagem aparece, com repetição, sem ter sido disparada
    const image = screen.getByTestId('completion-image');
    expect(image).toHaveAttribute('data-status', 'error');
    expect(image).toHaveTextContent('A geração falhou');
    expect(screen.getByTestId('retry-generate')).toBeInTheDocument();
    expect(onRetryGenerate).not.toHaveBeenCalled();
  });

  it('o botão de repetir a geração chama só a geração', () => {
    const onRetryGenerate = vi.fn();
    const { rerender } = renderCard();
    rerender(
      <MockupResultCard
        {...props({ generatedMockup: null, generationError: 'falhou', onRetryGenerate })}
      />,
    );

    fireEvent.click(screen.getByTestId('retry-generate'));

    expect(onRetryGenerate).toHaveBeenCalledTimes(1);
  });

  it('com o resultado anterior na tela, não deixa baixar nem compartilhar como se fosse o novo', () => {
    const { rerender } = renderCard();
    expect(screen.getByRole('button', { name: /Baixar/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Compartilhar mockup' })).toBeInTheDocument();

    rerender(
      <MockupResultCard {...props({ generatedMockup: null, generationError: 'falhou' })} />,
    );

    expect(screen.getByRole('button', { name: /Baixar/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Compartilhar mockup' })).not.toBeInTheDocument();
  });

  it('quando a geração nova dá certo, o resultado anterior sai de cena sem resquício', () => {
    const { rerender } = renderCard();
    rerender(
      <MockupResultCard {...props({ generatedMockup: null, generationError: 'falhou' })} />,
    );
    expect(screen.getByTestId('previous-result-notice')).toBeInTheDocument();

    rerender(<MockupResultCard {...props({ generatedMockup: IMAGE_NOVA })} />);

    const imgs = screen.getAllByAltText('Mockup gerado com IA');
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute('src', IMAGE_NOVA);
    expect(screen.queryByTestId('previous-result-notice')).not.toBeInTheDocument();
    expect(screen.queryByText('Resultado anterior')).not.toBeInTheDocument();
    expect(screen.getByTestId('completion-image')).toHaveAttribute('data-status', 'done');
    expect(screen.queryByTestId('retry-generate')).not.toBeInTheDocument();
  });

  it('sem resultado anterior, uma falha de geração não inventa imagem na tela', () => {
    const { container } = render(
      <MockupResultCard {...props({ generatedMockup: null, generationError: 'falhou' })} />,
    );

    expect(container.innerHTML).toBe('');
  });
});
