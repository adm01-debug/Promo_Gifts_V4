/**
 * MockupConfigPanel — erro de carga das TÉCNICAS de personalização (A-estados).
 *
 * O que este arquivo prova: a falha de carga das técnicas aparece no bloco da técnica
 * (mensagem + "Tentar novamente"), não vaza para o bloco do produto, não esconde o resto do
 * painel, e o botão chama o retry da MESMA carga que falhou. Antes, a técnica caía no vazio
 * "Selecione um produto primeiro" e o vendedor não sabia se o produto não aceita personalização
 * ou se o sistema quebrou.
 *
 * O erro do catálogo de produtos tem teste próprio (MockupProductSelector.errors), porque quem
 * carrega o catálogo é o seletor; as técnicas chegam por prop, de quem as carrega.
 *
 * Filhos são substituídos por stubs: o alvo aqui é o painel.
 */
import type { ComponentProps } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('@/components/mockup/MockupClientSelector', () => ({
  MockupClientSelector: () => <div data-testid="child-client-selector" />,
}));
vi.mock('@/components/mockup/MockupProductSelector', () => ({
  MockupProductSelector: () => <div data-testid="child-product-selector" />,
}));
vi.mock('@/components/mockup/MultiAreaManager', () => ({
  MultiAreaManager: () => <div data-testid="child-areas" />,
}));

import { MockupConfigPanel } from '@/components/mockup/MockupConfigPanel';

type PanelProps = ComponentProps<typeof MockupConfigPanel>;

const TECHNIQUES_ERROR = 'Não foi possível conectar ao banco de dados (tabela de gravação).';

/**
 * A seção do painel é o wrapper com id (`step-product`/`step-technique`) e pode ser montada mais
 * de uma vez no DOM (versão desktop/mobile do mesmo bloco). Por isso a asserção percorre TODAS
 * as instâncias da seção em vez de contar nós: cada instância visível precisa avisar.
 */
function sections(id: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`[id="${id}"]`));
}

function alertsIn(section: HTMLElement): HTMLElement[] {
  return within(section).queryAllByRole('alert');
}

function retryButtonsIn(section: HTMLElement): HTMLElement[] {
  return within(section).queryAllByRole('button', { name: /tentar novamente/i });
}

function firstSection(id: string): HTMLElement {
  const [section] = sections(id);
  if (!section) throw new Error(`seção ${id} não encontrada`);
  return section;
}

function baseProps(): PanelProps {
  return {
    techniques: [],
    productSelection: null,
    selectedTechnique: null,
    selectedClient: null,
    isLoadingData: false,
    personalizationAreas: [],
    onProductSelect: vi.fn(),
    onTechniqueSelect: vi.fn(),
    onClientSelect: vi.fn(),
    onReset: vi.fn(),
    filteredTechniques: [],
    activeAreaId: null,
    onAreasChange: vi.fn(),
    onActiveAreaChange: vi.fn(),
    onLogoUpload: vi.fn(),
    productLocations: null,
    artAttachments: [],
    onArtAttachmentsChange: vi.fn(),
  };
}

/** O painel usa Tooltip (botão "Limpar formulário"); na app ele vive sob o provider do App. */
function renderPanel(overrides: Partial<PanelProps> = {}) {
  return render(
    <TooltipProvider>
      <MockupConfigPanel {...baseProps()} {...overrides} />
    </TooltipProvider>,
  );
}

describe('MockupConfigPanel — erro de carga das técnicas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem erro de carga, nenhum aviso de técnica aparece (guarda de regressão)', () => {
    renderPanel();

    expect(screen.queryByTestId('mockup-techniques-error')).toBeNull();
    expect(screen.queryByText(/não foi possível carregar técnicas/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).toBeNull();
  });

  it('com erro: mensagem + Tentar novamente no bloco da técnica (e não no do produto)', () => {
    renderPanel({ techniquesError: TECHNIQUES_ERROR, onRetryTechniques: vi.fn() });

    const techniqueSections = sections('step-technique');
    expect(techniqueSections).not.toHaveLength(0);

    // Agregado (e não um expect por instância): toda instância montada precisa avisar, com o
    // título do bloco e a mensagem de quem carregou.
    const alerts = techniqueSections.flatMap(alertsIn);
    expect(alerts).not.toHaveLength(0);
    const textos = alerts.map((alert) => alert.textContent ?? '');
    expect(textos.filter((t) => t.includes('Não foi possível carregar técnicas'))).toHaveLength(
      alerts.length,
    );
    expect(textos.filter((t) => t.includes(TECHNIQUES_ERROR))).toHaveLength(alerts.length);

    const retries = techniqueSections.flatMap(retryButtonsIn);
    expect(retries).not.toHaveLength(0);
    expect(retries.filter((button) => !button.hasAttribute('disabled'))).toHaveLength(
      retries.length,
    );

    // O bloco do produto continua limpo: cada erro no seu bloco.
    expect(sections('step-product').flatMap(alertsIn)).toHaveLength(0);
  });

  it('clicar em "Tentar novamente" chama o retry da carga que falhou', () => {
    const onRetryTechniques = vi.fn();
    renderPanel({ techniquesError: TECHNIQUES_ERROR, onRetryTechniques });

    const [retry] = retryButtonsIn(firstSection('step-technique'));
    if (!retry) throw new Error('botão de retry das técnicas não encontrado');
    fireEvent.click(retry);

    expect(onRetryTechniques).toHaveBeenCalledTimes(1);
  });

  it('o aviso não esconde o resto do painel', () => {
    renderPanel({ techniquesError: TECHNIQUES_ERROR, onRetryTechniques: vi.fn() });

    expect(screen.getAllByTestId('mockup-techniques-error').length).toBeGreaterThan(0);
    // Empresa, produto, áreas e o botão de limpar formulário continuam montados.
    expect(screen.getAllByTestId('child-client-selector').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('child-product-selector').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('child-areas').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /limpar formulário/i }).length).toBeGreaterThan(0);
  });

  it('sem callback de retry, o bloco avisa sem botão (não inventa ação)', () => {
    renderPanel({ techniquesError: TECHNIQUES_ERROR });

    const techniqueSections = sections('step-technique');
    expect(techniqueSections).not.toHaveLength(0);
    expect(techniqueSections.flatMap(alertsIn)).not.toHaveLength(0);
    expect(techniqueSections.flatMap(retryButtonsIn)).toHaveLength(0);
  });
});
