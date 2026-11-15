/**
 * Testes de comportamento — controles do editor de logo
 *
 * Cobre o que o cartão pede (falham sem a correção):
 *   - LogoQuickActions: as ações de centralizar formam um grupo com alvo
 *     declarado e cada uma move só o eixo do seu alvo.
 *   - LogoQuickActions: o botão de orientação se chama "Girar" (rótulo fixo,
 *     em vez do antigo rótulo que alternava entre "Vertical" e "Horizontal").
 *   - LogoSizeControls: com o vínculo de proporções LIGADO, alterar a largura
 *     mantém a proporção (e vice-versa); DESLIGADO, o outro lado não muda.
 */
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LogoQuickActions } from '../LogoQuickActions';
import { LogoSizeControls } from '../LogoSizeControls';

function renderQuick(overrides: Partial<Parameters<typeof LogoQuickActions>[0]> = {}) {
  const onPositionChange = vi.fn();
  const onRotationChange = vi.fn();
  render(
    <TooltipProvider>
      <LogoQuickActions
        logoPreview="data:image/png;base64,xxx"
        positionX={0}
        positionY={0}
        logoRotation={0}
        onPositionChange={onPositionChange}
        onRotationChange={onRotationChange}
        {...overrides}
      />
    </TooltipProvider>,
  );
  return { onPositionChange, onRotationChange };
}

function renderSize(overrides: Partial<Parameters<typeof LogoSizeControls>[0]> = {}) {
  const onSizeChange = vi.fn();
  const onLogoScaleChange = vi.fn();
  render(
    <LogoSizeControls
      logoPreview="data:image/png;base64,xxx"
      logoWidth={4}
      logoHeight={2}
      logoScale={100}
      logoRotation={0}
      positionX={50}
      positionY={50}
      maxWidth={20}
      maxHeight={20}
      onSizeChange={onSizeChange}
      onLogoScaleChange={onLogoScaleChange}
      {...overrides}
    />,
  );
  return { onSizeChange, onLogoScaleChange };
}

/** Versão com estado: as props voltam para o componente, como na tela real. */
function renderSizeStateful(
  initial: { width: number; height: number },
  overrides: Partial<Parameters<typeof LogoSizeControls>[0]> = {},
) {
  const calls: Array<[number, number]> = [];
  function Harness() {
    const [size, setSize] = useState(initial);
    return (
      <LogoSizeControls
        logoPreview="data:image/png;base64,xxx"
        logoWidth={size.width}
        logoHeight={size.height}
        logoScale={100}
        logoRotation={0}
        positionX={50}
        positionY={50}
        maxWidth={20}
        maxHeight={20}
        onSizeChange={(width, height) => {
          calls.push([width, height]);
          setSize({ width, height });
        }}
        onLogoScaleChange={vi.fn()}
        {...overrides}
      />
    );
  }
  render(<Harness />);
  return { calls, last: () => calls[calls.length - 1] };
}

describe('LogoQuickActions — centralizar com alvo explícito', () => {
  it('as ações de centralizar ficam num grupo nomeado "Centralizar logo"', () => {
    renderQuick();
    const grupo = screen.getByRole('group', { name: 'Centralizar logo' });
    expect(within(grupo).getByRole('button', { name: 'Centro V' })).toBeInTheDocument();
    expect(within(grupo).getByRole('button', { name: 'Centro' })).toBeInTheDocument();
    expect(within(grupo).getByRole('button', { name: 'Centro H' })).toBeInTheDocument();
    // "Girar" é ação de rotação, não de centralização: fica fora do grupo.
    expect(within(grupo).queryByRole('button', { name: 'Girar' })).not.toBeInTheDocument();
  });

  it('"Centro V" move só o eixo horizontal e preserva a posição vertical', () => {
    const { onPositionChange } = renderQuick({ positionY: 30 });
    fireEvent.click(screen.getByRole('button', { name: 'Centro V' }));
    expect(onPositionChange).toHaveBeenCalledWith(50, 30);
  });

  it('"Centro H" move só o eixo vertical e preserva a posição horizontal', () => {
    const { onPositionChange } = renderQuick({ positionX: 20 });
    fireEvent.click(screen.getByRole('button', { name: 'Centro H' }));
    expect(onPositionChange).toHaveBeenCalledWith(20, 50);
  });

  it('"Centro" centraliza nos dois eixos', () => {
    const { onPositionChange } = renderQuick();
    fireEvent.click(screen.getByRole('button', { name: 'Centro' }));
    expect(onPositionChange).toHaveBeenCalledWith(50, 50);
  });

  it('o botão de orientação se chama "Girar" e gira 90°, em qualquer rotação', () => {
    const { onRotationChange } = renderQuick({ logoRotation: 90 });
    fireEvent.click(screen.getByRole('button', { name: 'Girar' }));
    expect(onRotationChange).toHaveBeenCalledWith(180);
  });
});

describe('LogoSizeControls — tamanho proporcional (vínculo de proporções)', () => {
  it('o vínculo de proporções começa ligado', () => {
    renderSize();
    expect(screen.getByRole('button', { name: /vínculo de proporções/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('com o vínculo LIGADO, aumentar a largura mantém a proporção', () => {
    const { onSizeChange } = renderSize(); // 4×2 cm → razão 2
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar largura' }));
    expect(onSizeChange).toHaveBeenCalledWith(4.5, 2.25);
  });

  it('com o vínculo LIGADO, aumentar a altura mantém a proporção', () => {
    const { onSizeChange } = renderSize();
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar altura' }));
    expect(onSizeChange).toHaveBeenCalledWith(5, 2.5);
  });

  it('com o vínculo DESLIGADO, alterar a largura não mexe na altura', () => {
    const { onSizeChange } = renderSize();
    fireEvent.click(screen.getByRole('button', { name: /vínculo de proporções/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar largura' }));
    expect(onSizeChange).toHaveBeenCalledWith(4.5, 2);
  });

  it('o vínculo não deixa o lado proporcional passar do máximo da área', () => {
    // Razão 2:1 e altura limitada a 2,1 cm → a largura para em 4,2 cm, não em 4,5.
    const { onSizeChange } = renderSize({ logoWidth: 4, logoHeight: 2, maxHeight: 2.1 });
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar largura' }));
    expect(onSizeChange).toHaveBeenCalledWith(4.2, 2.1);
  });

  it('máximo da ALTURA trava a largura e preserva a proporção', () => {
    // 4×2 (razão 2) com altura máxima já no limite: a largura não pode crescer.
    const { onSizeChange } = renderSize({ logoWidth: 4, logoHeight: 2, maxHeight: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar largura' }));
    expect(onSizeChange).toHaveBeenCalledWith(4, 2);
  });

  it('máximo da LARGURA trava a altura e preserva a proporção', () => {
    // 4×2 (razão 2) com largura máxima já no limite: a altura não pode crescer.
    const { onSizeChange } = renderSize({ logoWidth: 4, logoHeight: 2, maxWidth: 4 });
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar altura' }));
    expect(onSizeChange).toHaveBeenCalledWith(4, 2);
  });

  it('mínimo da ALTURA trava a largura e preserva a proporção', () => {
    // 2,2×1,1 (razão 2): a altura não desce de 1 cm, então a largura para em 2.
    const { onSizeChange } = renderSize({ logoWidth: 2.2, logoHeight: 1.1 });
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir largura' }));
    expect(onSizeChange).toHaveBeenCalledWith(2, 1);
  });

  it('mínimo da LARGURA trava a altura e preserva a proporção', () => {
    // 1,2×2,4 (razão 0,5): a largura não desce de 1 cm, então a altura para em 2.
    const { onSizeChange } = renderSize({ logoWidth: 1.2, logoHeight: 2.4 });
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir altura' }));
    expect(onSizeChange).toHaveBeenCalledWith(1, 2);
  });

  it('com o vínculo LIGADO, "Máxima" usa o maior fator comum e preserva a proporção', () => {
    // 4×2 (razão 2) numa área 20×20: encher a altura distorceria para 1:1.
    const { onSizeChange } = renderSize();
    fireEvent.click(screen.getByRole('button', { name: 'Máxima' }));
    expect(onSizeChange).toHaveBeenCalledWith(20, 10);
  });

  it('com o vínculo LIGADO, "Máxima" respeita o limite da LARGURA', () => {
    // 2×4 (razão 0,5) numa área 20×20: quem morde é a largura.
    const { onSizeChange } = renderSize({ logoWidth: 2, logoHeight: 4 });
    fireEvent.click(screen.getByRole('button', { name: 'Máxima' }));
    expect(onSizeChange).toHaveBeenCalledWith(10, 20);
  });

  it('com o vínculo DESLIGADO, "Máxima" preenche os dois eixos', () => {
    const { onSizeChange } = renderSize();
    fireEvent.click(screen.getByRole('button', { name: /vínculo de proporções/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Máxima' }));
    expect(onSizeChange).toHaveBeenCalledWith(20, 20);
  });

  it('ida e volta na largura volta ao tamanho original sem perder a proporção', () => {
    // 4×2 → reduzir até o limite → voltar para 4 deve dar 4×2, nunca 4×4.
    const { last } = renderSizeStateful({ width: 4, height: 2 });
    const diminuir = screen.getByRole('button', { name: 'Diminuir largura' });
    for (let i = 0; i < 8; i += 1) fireEvent.click(diminuir);
    expect(last()).toEqual([2, 1]);

    const aumentar = screen.getByRole('button', { name: 'Aumentar largura' });
    for (let i = 0; i < 4; i += 1) fireEvent.click(aumentar);
    expect(last()).toEqual([4, 2]);
  });
});
