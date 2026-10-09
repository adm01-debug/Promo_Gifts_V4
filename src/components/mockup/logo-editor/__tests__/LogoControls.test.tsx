/**
 * Testes de comportamento — controles do editor de logo
 *
 * Cobre o que o cartão pede (falham sem a correção):
 *   - LogoQuickActions: cada ação de centralizar declara o alvo
 *     (horizontal, vertical ou ambos) e move só o eixo do alvo.
 *   - LogoSizeControls: com o vínculo de proporções LIGADO, alterar a largura
 *     mantém a proporção (e vice-versa); DESLIGADO, o outro lado não muda.
 *   - LogoSizeControls: os ajustes avançados começam recolhidos.
 */
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

describe('LogoQuickActions — centralizar com alvo explícito', () => {
  it('cada ação de centralizar rotula o alvo (horizontal, vertical ou ambos)', () => {
    renderQuick();
    const grupo = screen.getByRole('group', { name: 'Centralizar logo' });
    expect(within(grupo).getByRole('button', { name: 'Horizontal' })).toBeInTheDocument();
    expect(within(grupo).getByRole('button', { name: 'Ambos' })).toBeInTheDocument();
    expect(within(grupo).getByRole('button', { name: 'Vertical' })).toBeInTheDocument();
  });

  it('"Horizontal" move só o eixo horizontal e preserva a posição vertical', () => {
    const { onPositionChange } = renderQuick({ positionY: 30 });
    fireEvent.click(screen.getByRole('button', { name: 'Horizontal' }));
    expect(onPositionChange).toHaveBeenCalledWith(50, 30);
  });

  it('"Vertical" move só o eixo vertical e preserva a posição horizontal', () => {
    const { onPositionChange } = renderQuick({ positionX: 20 });
    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(onPositionChange).toHaveBeenCalledWith(20, 50);
  });

  it('"Ambos" centraliza nos dois eixos', () => {
    const { onPositionChange } = renderQuick();
    fireEvent.click(screen.getByRole('button', { name: 'Ambos' }));
    expect(onPositionChange).toHaveBeenCalledWith(50, 50);
  });
});

describe('LogoSizeControls — tamanho proporcional (vínculo de proporções)', () => {
  it('os ajustes avançados começam recolhidos', () => {
    renderSize();
    const trigger = screen.getByRole('button', { name: 'Ajustes avançados' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Aumentar largura' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aumentar altura' })).not.toBeInTheDocument();
  });

  it('abre os ajustes avançados ao acionar o gatilho', () => {
    renderSize();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes avançados' }));
    expect(screen.getByRole('button', { name: 'Aumentar largura' })).toBeInTheDocument();
  });

  it('com o vínculo LIGADO, aumentar a largura mantém a proporção', () => {
    const { onSizeChange } = renderSize(); // 4×2 cm → razão 2
    const vinculo = screen.getByRole('button', { name: /vínculo de proporções/i });
    expect(vinculo).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes avançados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar largura' }));
    expect(onSizeChange).toHaveBeenCalledWith(4.5, 2.25);
  });

  it('com o vínculo LIGADO, aumentar a altura mantém a proporção', () => {
    const { onSizeChange } = renderSize();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes avançados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar altura' }));
    expect(onSizeChange).toHaveBeenCalledWith(5, 2.5);
  });

  it('com o vínculo DESLIGADO, alterar a largura não mexe na altura', () => {
    const { onSizeChange } = renderSize();
    fireEvent.click(screen.getByRole('button', { name: /vínculo de proporções/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes avançados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar largura' }));
    expect(onSizeChange).toHaveBeenCalledWith(4.5, 2);
  });
});
