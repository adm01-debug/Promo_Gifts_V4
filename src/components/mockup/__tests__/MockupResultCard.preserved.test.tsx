/**
 * MockupResultCard — a quem pertence o resultado preservado e quem pode descartá-lo.
 *
 * O que está provado aqui:
 *  1. o resultado preservado pertence a UM projeto: ao criar outro mockup (ou
 *     trocar de cliente) ele é descartado, então a imagem do cliente A nunca
 *     reaparece sob o nome do produto do cliente B;
 *  2. numa nova tentativa do MESMO projeto o resultado continua preservado —
 *     é justamente o caso que a preservação existe para servir;
 *  3. dispensar o ALERTA de erro não apaga o resultado preservado nem o rótulo
 *     de "imagem anterior".
 *
 * Execução: npx vitest run src/components/mockup/__tests__/MockupResultCard.preserved.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MockupResultCard } from '@/components/mockup/MockupResultCard';

// canvas-confetti desenha em <canvas>, que o jsdom não implementa.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const CANECA_CLIENTE_A = 'data:image/png;base64,CANECA-A';

type CardProps = ComponentProps<typeof MockupResultCard>;

function props(overrides: Partial<CardProps> = {}): CardProps {
  return { generatedMockup: CANECA_CLIENTE_A, isLoading: false, onDownload: vi.fn(), ...overrides };
}

describe('MockupResultCard — o resultado preservado pertence a um projeto', () => {
  it('projeto novo: a imagem do cliente anterior não reaparece sob o nome do novo produto', () => {
    const { rerender } = render(
      <MockupResultCard {...props({ productName: 'Caneca', projectResetCount: 0 })} />,
    );
    expect(screen.getByAltText('Mockup gerado com IA')).toHaveAttribute('src', CANECA_CLIENTE_A);

    // "Criar novo mockup" (resetForm) zera o resultado e abre OUTRO projeto;
    // o vendedor configura a mochila do cliente B e a geração dela FALHA.
    rerender(
      <MockupResultCard
        {...props({
          generatedMockup: null,
          productName: 'Mochila',
          projectResetCount: 1,
          generationError: 'A geração falhou',
        })}
      />,
    );

    // A caneca do cliente A não pode aparecer rotulada como a mochila do cliente B.
    expect(screen.queryByAltText('Mockup gerado com IA')).not.toBeInTheDocument();
    expect(screen.queryByTestId('previous-result-notice')).not.toBeInTheDocument();
  });

  it('nova tentativa do MESMO projeto: o resultado preservado continua na tela', () => {
    const { rerender } = render(
      <MockupResultCard {...props({ productName: 'Caneca', projectResetCount: 3 })} />,
    );

    rerender(
      <MockupResultCard
        {...props({
          generatedMockup: null,
          productName: 'Caneca',
          projectResetCount: 3,
          generationError: 'A geração falhou',
        })}
      />,
    );

    expect(screen.getByAltText('Mockup gerado com IA')).toHaveAttribute('src', CANECA_CLIENTE_A);
    expect(screen.getByTestId('previous-result-notice')).toBeInTheDocument();
  });
});

describe('MockupResultCard — dispensar o alerta não descarta o resultado', () => {
  it('com o alerta de erro dispensado, a imagem anterior e o rótulo continuam', () => {
    const { rerender } = render(<MockupResultCard {...props({ productName: 'Caneca' })} />);

    rerender(
      <MockupResultCard
        {...props({ generatedMockup: null, productName: 'Caneca', generationError: 'falhou' })}
      />,
    );
    expect(screen.getByTestId('previous-result-notice')).toBeInTheDocument();

    // "Dispensar" no alerta da página zera generationError (MockupGenerator.tsx:216).
    rerender(
      <MockupResultCard
        {...props({ generatedMockup: null, productName: 'Caneca', generationError: null })}
      />,
    );

    expect(screen.getByAltText('Mockup gerado com IA')).toHaveAttribute('src', CANECA_CLIENTE_A);
    expect(screen.getByTestId('previous-result-notice')).toHaveTextContent('Imagem anterior');
    expect(screen.getByText('Resultado anterior')).toBeInTheDocument();
    // Resultado anterior na tela: continua sem baixar/compartilhar como se fosse o novo.
    expect(screen.getByRole('button', { name: /Baixar/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Compartilhar mockup' })).not.toBeInTheDocument();
  });
});
