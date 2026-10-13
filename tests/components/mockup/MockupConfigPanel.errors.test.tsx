/**
 * MockupConfigPanel — estados de erro de carga (A-estados).
 *
 * O que este arquivo prova: a falha de carga das TÉCNICAS e dos PRODUTOS aparece no bloco
 * correspondente (mensagem + "Tentar novamente"), cada uma no seu bloco, sem esconder o resto
 * do painel. Antes da correção o painel só mostrava o erro do CRM (dentro do seletor de
 * empresa): a técnica caía no vazio "Selecione um produto primeiro" e o catálogo aparecia como
 * "Nenhum resultado".
 *
 * Filhos são substituídos por stubs: o alvo aqui é o painel (quem carrega os dados é o
 * produtor — generator/hooks — que passa os erros por prop).
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
const PRODUCTS_ERROR = 'Catálogo externo indisponível agora.';

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

describe('MockupConfigPanel — erro de carga das técnicas e dos produtos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem erro de carga, nenhum aviso aparece (guarda de regressão)', () => {
    renderPanel();

    expect(screen.queryByTestId('mockup-techniques-error')).toBeNull();
    expect(screen.queryByTestId('mockup-products-error')).toBeNull();
    expect(screen.queryByText(/tentar novamente/i)).toBeNull();
  });

  it('erro das técnicas: mensagem + Tentar novamente no bloco da técnica (e não no do produto)', () => {
    renderPanel({ techniquesError: TECHNIQUES_ERROR, onRetryTechniques: vi.fn() });

    const techniqueSections = sections('step-technique');
    expect(techniqueSections.length).toBeGreaterThan(0);
    techniqueSections.forEach((section) => {
      const alerts = alertsIn(section);
      expect(alerts.length).toBeGreaterThan(0);
      alerts.forEach((alert) => {
        expect(alert).toHaveTextContent('Não foi possível carregar técnicas');
        expect(alert).toHaveTextContent(TECHNIQUES_ERROR);
      });
      retryButtonsIn(section).forEach((button) => expect(button).toBeEnabled());
      expect(retryButtonsIn(section).length).toBeGreaterThan(0);
    });

    sections('step-product').forEach((section) => {
      expect(alertsIn(section)).toHaveLength(0);
    });
  });

  it('erro dos produtos: mensagem + Tentar novamente no bloco do produto (e não no da técnica)', () => {
    renderPanel({ productsError: PRODUCTS_ERROR, onRetryProducts: vi.fn() });

    const productSections = sections('step-product');
    expect(productSections.length).toBeGreaterThan(0);
    productSections.forEach((section) => {
      const alerts = alertsIn(section);
      expect(alerts.length).toBeGreaterThan(0);
      alerts.forEach((alert) => {
        expect(alert).toHaveTextContent('Não foi possível carregar produtos');
        expect(alert).toHaveTextContent(PRODUCTS_ERROR);
      });
      retryButtonsIn(section).forEach((button) => expect(button).toBeEnabled());
      expect(retryButtonsIn(section).length).toBeGreaterThan(0);
    });

    sections('step-technique').forEach((section) => {
      expect(alertsIn(section)).toHaveLength(0);
    });
  });

  it('os dois erros juntos não escondem o resto do painel', () => {
    renderPanel({ techniquesError: TECHNIQUES_ERROR, productsError: PRODUCTS_ERROR });

    // Cada instância da seção (desktop/mobile) avisa; a unicidade do aviso é garantida no
    // bloco correspondente, não no painel todo.
    expect(screen.getAllByTestId('mockup-techniques-error').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('mockup-products-error').length).toBeGreaterThan(0);
    // Resto do painel continua montado: empresa, áreas e o botão de limpar formulário.
    expect(screen.getAllByTestId('child-client-selector').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('child-areas').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /limpar formulário/i }).length).toBeGreaterThan(0);
  });

  it('cada "Tentar novamente" chama o retry do seu próprio bloco', () => {
    const onRetryTechniques = vi.fn();
    const onRetryProducts = vi.fn();
    renderPanel({
      techniquesError: TECHNIQUES_ERROR,
      onRetryTechniques,
      productsError: PRODUCTS_ERROR,
      onRetryProducts,
    });

    const [techniqueRetry] = retryButtonsIn(firstSection('step-technique'));
    if (!techniqueRetry) throw new Error('botão de retry das técnicas não encontrado');
    fireEvent.click(techniqueRetry);
    expect(onRetryTechniques).toHaveBeenCalledTimes(1);
    expect(onRetryProducts).not.toHaveBeenCalled();

    const [productRetry] = retryButtonsIn(firstSection('step-product'));
    if (!productRetry) throw new Error('botão de retry dos produtos não encontrado');
    fireEvent.click(productRetry);
    expect(onRetryProducts).toHaveBeenCalledTimes(1);
    expect(onRetryTechniques).toHaveBeenCalledTimes(1);
  });

  it('sem callback de retry, o bloco avisa sem botão (não inventa ação)', () => {
    renderPanel({ techniquesError: TECHNIQUES_ERROR });

    const techniqueSections = sections('step-technique');
    expect(techniqueSections.length).toBeGreaterThan(0);
    techniqueSections.forEach((section) => {
      expect(alertsIn(section).length).toBeGreaterThan(0);
      expect(retryButtonsIn(section)).toHaveLength(0);
    });
  });
});
