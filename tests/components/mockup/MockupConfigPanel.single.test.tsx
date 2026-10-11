/**
 * Regressão A-3/M29 — MockupConfigPanel montava os MESMOS filhos em dois
 * wrappers (desktop `hidden md:block` e mobile `md:hidden`) escondidos apenas
 * por CSS. Em jsdom/DOM os dois existem sempre, o que duplicava chamadas ao
 * CRM e ao catálogo, inputs de arquivo e `data-testid`.
 *
 * Prova exigida pelo cartão: cada seção aparece UMA única vez no DOM nos dois
 * breakpoints (375 = mobile, 1280 = desktop) e o layout continua responsivo
 * (colapsável no mobile, sempre aberto no desktop).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import React from 'react';
import { MockupConfigPanel } from '@/components/mockup/MockupConfigPanel';

// Filhos reais fazem I/O (CRM / catálogo / upload). Substituídos por um testid
// para contar instâncias montadas sem depender de rede — o que está sob teste é
// o wrapper `MobileCollapsibleSection`, não os filhos.
vi.mock('@/components/mockup/MockupClientSelector', () => ({
  MockupClientSelector: () => <div data-testid="child-client-selector" />,
}));
vi.mock('@/components/mockup/MockupProductSelector', () => ({
  MockupProductSelector: () => <div data-testid="child-product-selector" />,
}));
vi.mock('@/components/mockup/MultiAreaManager', () => ({
  MultiAreaManager: () => <div data-testid="child-area-manager" />,
}));
vi.mock('@/components/mockup/ArtFileUpload', () => ({
  ArtFileUpload: () => <div data-testid="child-art-upload" />,
}));

const MOBILE = 375;
const DESKTOP = 1280;

/**
 * Instala um `matchMedia` que responde de acordo com a largura informada —
 * é o que `useMediaQuery` consulta para decidir entre desktop e mobile.
 */
function setViewportWidth(width: number): void {
  const matchMediaMock = (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    const matches =
      (min === null || width >= Number(min[1])) && (max === null || width <= Number(max[1]));
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn().mockReturnValue(true),
    };
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMediaMock,
  });
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
}

function makeProps() {
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
    userId: 'user-1',
  };
}

async function renderPanel(props = makeProps()) {
  return renderWithProviders(<MockupConfigPanel {...props} />);
}

describe('MockupConfigPanel — montagem única das seções (A-3/M29)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Sem a correção cada filho era montado 2x em QUALQUER breakpoint (os dois
  // wrappers existem no DOM; o CSS só esconde um deles).
  it.each([MOBILE, DESKTOP])(
    '%i px: cada seção/filho aparece uma única vez no DOM',
    async (width) => {
      setViewportWidth(width);
      await renderPanel();

      expect(screen.getAllByTestId('child-client-selector')).toHaveLength(1);
      expect(screen.getAllByTestId('child-product-selector')).toHaveLength(1);
      expect(screen.getAllByTestId('child-area-manager')).toHaveLength(1);
      expect(screen.getAllByTestId('child-art-upload')).toHaveLength(1);

      // O seletor de técnica também mora dentro do wrapper duplicado.
      expect(screen.getAllByTestId('mockup-technique-select-trigger')).toHaveLength(1);

      // Rótulos das seções: um título por seção, nunca dois (desktop + mobile).
      expect(screen.getAllByText('Empresa')).toHaveLength(1);
      expect(screen.getAllByText('Produto')).toHaveLength(1);
      expect(screen.getAllByText('Técnica de Personalização')).toHaveLength(1);
      expect(screen.getAllByText('Áreas de Personalização')).toHaveLength(1);
      expect(screen.getAllByText('Arquivos de Arte (Vetor)')).toHaveLength(1);
    },
  );

  it('375 px: seção concluída nasce colapsável (conteúdo desmontado, não duplicado)', async () => {
    setViewportWidth(MOBILE);
    await renderPanel();
    // `getByRole('button')` só existe no ramo mobile (CollapsibleTrigger).
    expect(screen.getByRole('button', { name: /Empresa/ })).toBeTruthy();
  });

  it('1280 px: não há trigger colapsável e o filho fica sempre montado', async () => {
    setViewportWidth(DESKTOP);
    await renderPanel();
    expect(screen.queryByRole('button', { name: /Empresa/ })).toBeNull();
    expect(screen.getAllByTestId('child-client-selector')).toHaveLength(1);
  });

  it('mobile colapsa a seção concluída e reabre mantendo uma única instância', async () => {
    setViewportWidth(MOBILE);
    const props = makeProps();
    props.selectedClient = { id: 'c1', name: 'Cliente Teste' };
    await renderPanel(props);

    // Concluída → defaultOpen=false → conteúdo fora do DOM (nada de duplicata).
    expect(screen.queryByTestId('child-client-selector')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Empresa/ }));
    expect(screen.getAllByTestId('child-client-selector')).toHaveLength(1);
  });
});
