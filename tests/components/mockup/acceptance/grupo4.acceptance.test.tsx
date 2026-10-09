/**
 * Matriz de aceite do Mockup — GRUPO 4 (A09–A10): rotação e edição pós-geração.
 *
 * Um teste por cenário, nomeado com o ID. Fixtures fixas em `./grupo4.fixtures.ts`
 * (nunca marca/cliente real). Nenhum teste desativado.
 *
 * Só entra aqui comportamento que JÁ passa no código atual; o que depende de
 * correção ainda não integrada está listado no relato do cartão como PENDENTE
 * (não vira teste agora).
 *
 * A09 — 0°, 15° e 90° e tamanhos sem corte silencioso: exercita os controles de
 *       rotação (`LogoQuickActions`) e os de tamanho (`LogoSizeControls`), que
 *       travam o logo no limite da área (badge + botão desabilitado) em vez de
 *       cortá-lo em silêncio.
 * A10 — editar após gerar marca o resultado antigo e a ficha não mistura dados:
 *       exercita `useTechniqueHandlers` (trocar a técnica depois de gerar abre
 *       confirmação que marca o resultado anterior como descartável e só então
 *       o descarta) e a ficha de aprovação (`MockupLayoutButtons`) reconstruída
 *       a partir da configuração ATUAL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, renderHook, screen, act, fireEvent } from '@testing-library/react';

// Observação (não é o comportamento testado): sonner com `warning`/`info`, ausentes
// pontualmente no helper global.
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { LogoQuickActions } from '@/components/mockup/logo-editor/LogoQuickActions';
import { LogoSizeControls } from '@/components/mockup/logo-editor/LogoSizeControls';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TechniqueChangeDialog } from '@/pages/mockups/mockup-generator/MockupDialogs';
import { useTechniqueHandlers } from '@/pages/mockups/mockup-generator/MockupTechniqueHandlers';
import { MockupLayoutButtons } from '@/components/mockup/approval/MockupLayoutButtons';
import {
  LOGO_FIXTURE,
  MOCKUP_FIXTURE_URL,
  CLIENTE_A,
  CLIENTE_B,
  PRODUTO_A,
  PRODUTO_B,
  VENDEDOR_FIXTURE,
  AREA_A,
  AREA_B,
  TECNICA_SERIGRAFIA,
  TECNICA_LASER,
} from './grupo4.fixtures';

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── A09 — rotação 0/15/90 e tamanhos sem corte silencioso ───────────

describe('A09 — 0°, 15° e 90° e tamanhos sem corte silencioso', () => {
  it('gira em 90°, ±15° e volta ao 0° e trava o tamanho no limite da área (sem cortar o logo em silêncio)', () => {
    const onRotationChange = vi.fn();
    const quickActionsProps = {
      logoPreview: LOGO_FIXTURE,
      positionX: 50,
      positionY: 42,
      onPositionChange: vi.fn(),
      onRotationChange,
    };

    const renderQuickActions = (logoRotation: number) =>
      render(
        <TooltipProvider>
          <LogoQuickActions {...quickActionsProps} logoRotation={logoRotation} />
        </TooltipProvider>,
      );

    // 0° → alternar orientação = +90°.
    const { rerender } = renderQuickActions(0);
    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(onRotationChange).toHaveBeenLastCalledWith(90);

    // 0° → +15° e -15° (que dá a volta para 345°, nunca negativo).
    fireEvent.click(screen.getByRole('button', { name: '+15°' }));
    expect(onRotationChange).toHaveBeenLastCalledWith(15);
    fireEvent.click(screen.getByRole('button', { name: '-15°' }));
    expect(onRotationChange).toHaveBeenLastCalledWith(345);
    // Em 0° o reset fica desabilitado (não há o que resetar).
    expect(screen.getByRole('button', { name: '0°' })).toBeDisabled();

    // 15° → +15° = 30°; e o botão do valor atual reseta para 0°.
    rerender(
      <TooltipProvider>
        <LogoQuickActions {...quickActionsProps} logoRotation={15} />
      </TooltipProvider>,
    );
    expect(screen.getByRole('button', { name: '15°' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '+15°' }));
    expect(onRotationChange).toHaveBeenLastCalledWith(30);
    fireEvent.click(screen.getByRole('button', { name: '15°' }));
    expect(onRotationChange).toHaveBeenLastCalledWith(0);

    // 90° → +15° = 105°; e alternar orientação = 180°.
    rerender(
      <TooltipProvider>
        <LogoQuickActions {...quickActionsProps} logoRotation={90} />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '+15°' }));
    expect(onRotationChange).toHaveBeenLastCalledWith(105);
    fireEvent.click(screen.getByRole('button', { name: 'Horizontal' }));
    expect(onRotationChange).toHaveBeenLastCalledWith(180);

    // Sizes: no limite da área os botões de aumentar ficam travados e o limite é
    // exibido — nada de crescer além da área e cortar o logo em silêncio.
    const onSizeChange = vi.fn();
    render(
      <LogoSizeControls
        logoPreview={LOGO_FIXTURE}
        logoWidth={7}
        logoHeight={3}
        logoScale={100}
        logoRotation={0}
        positionX={50}
        positionY={42}
        maxWidth={7}
        maxHeight={3}
        onSizeChange={onSizeChange}
      />,
    );
    expect(screen.getByText('Máx 7×3cm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aumentar largura' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aumentar altura' })).toBeDisabled();
    expect(onSizeChange).not.toHaveBeenCalled();

    // Abaixo do limite, o passo é aplicado sem estourar o máximo (clamp visível).
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir altura' }));
    expect(onSizeChange).toHaveBeenCalledWith(7, 2.5);
  });
});

// ─── A10 — editar após gerar marca o resultado antigo; ficha sem mistura ──

describe('A10 — editar após gerar marca o resultado antigo e a ficha não mistura dados', () => {
  it('a troca de técnica após gerar exige confirmação que marca o resultado antigo e, ao confirmar, o descarta', () => {
    // A confirmação marca explicitamente que o mockup gerado será descartado.
    render(
      <TechniqueChangeDialog
        open
        onOpenChange={vi.fn()}
        fromName={TECNICA_SERIGRAFIA.name}
        toName={TECNICA_LASER.name}
        hasGeneratedMockup
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const marcado = screen.getByTestId('mockup-technique-change-dialog-description');
    expect(marcado.textContent).toContain('O mockup gerado será descartado');

    // O fluxo real: com resultado já gerado, trocar a técnica NÃO aplica a troca em
    // silêncio — abre a confirmação; só o confirmar marca/descarta o resultado antigo.
    const setSelectedTechnique = vi.fn();
    const setGeneratedMockup = vi.fn();
    const setTechniqueColorConfig = vi.fn();
    const { result } = renderHook(() =>
      useTechniqueHandlers({
        hasLogo: true,
        selectedTechnique: TECNICA_SERIGRAFIA,
        setSelectedTechnique,
        setGeneratedMockup,
        setTechniqueColorConfig,
      }),
    );

    act(() => result.current.handleTechniqueChange(TECNICA_LASER));
    expect(result.current.techniqueChangeDialogOpen).toBe(true);
    expect(result.current.pendingTechnique?.id).toBe(TECNICA_LASER.id);
    // Nada aplicado ainda: o resultado antigo não é substituído em silêncio.
    expect(setSelectedTechnique).not.toHaveBeenCalled();
    expect(setGeneratedMockup).not.toHaveBeenCalled();

    act(() => result.current.confirmTechniqueChange());
    expect(setSelectedTechnique).toHaveBeenCalledWith(TECNICA_LASER);
    // Confirmado: o resultado antigo é marcado/descartado (null) e a confirmação fecha.
    expect(setGeneratedMockup).toHaveBeenCalledWith(null);
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
  });

  it('a ficha de aprovação é reconstruída da configuração atual (não mistura a configuração antiga)', async () => {
    // A ficha desenha a logo via fetch/canvas — aqui só o texto interessa.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fixture: offline')));

    const renderFicha = (config: {
      product: typeof PRODUTO_A;
      client: typeof CLIENTE_A;
      activeArea: typeof AREA_A;
    }) =>
      render(
        <TooltipProvider>
          <MockupLayoutButtons
            generatedMockup={MOCKUP_FIXTURE_URL}
            product={config.product}
            technique={{
              name: TECNICA_SERIGRAFIA.name,
              code: TECNICA_SERIGRAFIA.code,
              maxWidth: TECNICA_SERIGRAFIA.maxWidth,
              maxHeight: TECNICA_SERIGRAFIA.maxHeight,
              locationName: TECNICA_SERIGRAFIA.locationName,
            }}
            client={config.client}
            seller={VENDEDOR_FIXTURE}
            activeArea={config.activeArea}
            productHeightCm={10}
            productWidthCm={20}
          />
        </TooltipProvider>,
      );

    // 1) Configuração original: a ficha mostra o cliente/produto/medida ATUAIS.
    const primeira = renderFicha({ product: PRODUTO_A, client: CLIENTE_A, activeArea: AREA_A });
    fireEvent.click(screen.getByRole('button', { name: /Gerar Layout - IA/ }));
    expect((await screen.findAllByText(CLIENTE_A.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(PRODUTO_A.name).length).toBeGreaterThan(0);
    expect(screen.getByText(`${AREA_A.logoWidth} × ${AREA_A.logoHeight} cm`)).toBeInTheDocument();
    primeira.unmount();

    // 2) Depois de EDITAR: a ficha é refeita com a configuração NOVA — sem misturar
    //    os dados antigos (nem o cliente, nem o produto, nem a medida).
    renderFicha({ product: PRODUTO_B, client: CLIENTE_B, activeArea: AREA_B });
    fireEvent.click(screen.getByRole('button', { name: /Gerar Layout - IA/ }));
    expect((await screen.findAllByText(CLIENTE_B.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(PRODUTO_B.name).length).toBeGreaterThan(0);
    expect(screen.getByText(`${AREA_B.logoWidth} × ${AREA_B.logoHeight} cm`)).toBeInTheDocument();
    expect(screen.queryByText(CLIENTE_A.name)).toBeNull();
    expect(screen.queryByText(PRODUTO_A.name)).toBeNull();
  });
});
