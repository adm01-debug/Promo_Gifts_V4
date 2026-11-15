/**
 * MockupConfigPanel.maxColors.test.tsx
 *
 * Contrato: quem monta o mockup tem que ser avisado quando a logo traz mais
 * cores do que a técnica de gravação selecionada aceita — ANTES de mandar para
 * produção.
 *
 * Falha sem a correção: o `LogoColorAnalyzer` já sabia emitir o aviso
 * (prop `maxColors`), mas o `MockupConfigPanel` não repassava o limite da
 * técnica selecionada, então o aviso nunca aparecia na tela.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Os seletores de cliente/produto, o gerenciador de áreas e o upload de arte
// batem em CRM/catálogo/storage. Aqui só interessa a seção de cores da logo,
// então eles entram como stubs — o LogoColorAnalyzer permanece o real.
vi.mock('../MockupClientSelector', () => ({
  MockupClientSelector: () => <div data-testid="stub-client-selector" />,
}));
vi.mock('../MockupProductSelector', () => ({
  MockupProductSelector: () => <div data-testid="stub-product-selector" />,
}));
vi.mock('../MultiAreaManager', () => ({
  MultiAreaManager: () => <div data-testid="stub-multi-area" />,
}));
vi.mock('../ArtFileUpload', () => ({
  ArtFileUpload: () => <div data-testid="stub-art-upload" />,
}));
vi.mock('../TechniqueTooltip', () => ({
  TechniqueTooltip: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

import { TooltipProvider } from '@/components/ui/tooltip';
import { MockupConfigPanel } from '../MockupConfigPanel';

type Technique = { id: string; name: string; code: string | null; maxColors?: number | null };

function detectedColor(name: string, hex: string, pantoneCode: string) {
  return {
    name,
    hex,
    pantoneMatch: { pantoneCode, pantoneHex: hex, deltaE: 1 },
    selectedPantone: pantoneCode,
  };
}

const THREE_COLORS = [
  detectedColor('Azul', '#0000ff', '2935 C'),
  detectedColor('Vermelho', '#ff0000', '185 C'),
  detectedColor('Amarelo', '#ffff00', '109 C'),
];

function renderPanel(technique: Technique | null, colors = THREE_COLORS) {
  return render(
    <TooltipProvider>
      <MockupConfigPanel
        techniques={technique ? [technique] : []}
        filteredTechniques={technique ? [technique] : []}
        productSelection={null}
        selectedTechnique={technique}
        selectedClient={null}
        isLoadingData={false}
        personalizationAreas={[]}
        onProductSelect={() => {}}
        onTechniqueSelect={() => {}}
        onClientSelect={() => {}}
        onReset={() => {}}
        activeAreaId={null}
        onAreasChange={() => {}}
        onActiveAreaChange={() => {}}
        onLogoUpload={() => {}}
        productLocations={null}
        logoColorAnalysis={{
          colors,
          isAnalyzing: false,
          error: null,
          updatePantone: () => {},
        }}
        artAttachments={[]}
        onArtAttachmentsChange={() => {}}
      />
    </TooltipProvider>,
  );
}

describe('MockupConfigPanel — aviso de cores da logo acima do limite da técnica', () => {
  it('logo com 3 cores e técnica de 2 cores: avisa com o limite da técnica', () => {
    renderPanel({ id: 't1', name: 'Serigrafia', code: 'silk', maxColors: 2 });

    const alerta = screen.getByText(/número máximo de cores/i);
    expect(alerta).toBeInTheDocument();
    expect(alerta.textContent).toContain('2');
  });

  it('logo com 3 cores e técnica de 4 cores: nenhum aviso', () => {
    renderPanel({ id: 't2', name: 'Digital', code: 'uv', maxColors: 4 });

    expect(screen.queryByText(/número máximo de cores/i)).not.toBeInTheDocument();
  });

  it('técnica sem limite cadastrado (null): nenhum aviso', () => {
    renderPanel({ id: 't3', name: 'Bordado', code: 'bordado', maxColors: null });

    expect(screen.queryByText(/número máximo de cores/i)).not.toBeInTheDocument();
  });

  it('sem técnica selecionada: nenhum aviso', () => {
    renderPanel(null);

    expect(screen.queryByText(/número máximo de cores/i)).not.toBeInTheDocument();
  });
});
