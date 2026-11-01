/**
 * MagicUpConfigPanel — toggle "Modo Rápido" sob os tokens do Blue Premium.
 *
 * Regressão (E-20): o toggle usava classes de paleta literais
 * (`amber-400/60`, `bg-amber-50/60`, `dark:amber-700/60`, `dark:bg-amber-950/30`,
 * `text-amber-600/700/400`). Cor literal ignora o token: em dark e em
 * alto-contraste a cor não acompanha o tema e o componente fica fora do
 * design system. A cor semântica de "modo alternativo/atenção" vem do token
 * `warning` (mesmo valor nos dois temas em `src/index.css`), já usado no
 * próprio painel (linha do aviso de `additionalDetails`).
 *
 * Contrato travado aqui:
 *  1. o container ativo usa os tokens semânticos (`border-warning/60`,
 *     `bg-warning/10`) e nenhuma classe literal de paleta (`amber-*`/`red-*`)
 *     aparece no toggle;
 *  2. o estado ativo continua distinguível sem depender só de cor: rótulo
 *     textual "(Nano Banana)" + `aria-checked` do switch.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render-helpers';
import { MagicUpConfigPanel } from '@/pages/magic-up/MagicUpConfigPanel';

// Subcomponentes pesados (estado/rede/portal próprios) não são o alvo: ficam
// stubados para isolar o JSX do toggle de Modo Rápido.
vi.mock('@/components/mockup/ProductSearchCombobox', () => ({
  ProductSearchCombobox: () => null,
}));
vi.mock('@/components/magic-up/PromptBank', () => ({ PromptBank: () => null }));
vi.mock('@/components/magic-up/PromptGenerator', () => ({ PromptGenerator: () => null }));
vi.mock('@/components/magic-up/MagicUpCampaignPanel', () => ({
  MagicUpCampaignPanel: () => null,
}));
vi.mock('@/components/magic-up/MagicUpBrandKitPanel', () => ({
  MagicUpBrandKitPanel: () => null,
}));
vi.mock('@/components/magic-up/MagicUpCreativeControls', () => ({
  MagicUpCreativeControls: () => null,
}));
vi.mock('@/components/magic-up/MagicUpRefinementActions', () => ({
  MagicUpRefinementActions: () => null,
}));
vi.mock('@/components/magic-up/MagicUpBatchGenerationPanel', () => ({
  MagicUpBatchGenerationPanel: () => null,
}));

type PanelState = Parameters<typeof MagicUpConfigPanel>[0]['m'];

/** Stub mínimo do retorno de `useMagicUpState` — só o que o painel lê no render. */
function buildState(fastMode: boolean): PanelState {
  return {
    // Briefing + prévia comercial
    brief: { channel: 'email', tone: 'profissional' },
    creativeControls: { aspectRatio: '1:1' },
    qualityScore: { total: 80, checks: [] },
    activeCampaign: null,
    campaigns: [],
    // Empresa (nenhum resultado de busca aberto)
    selectedClient: null,
    clientSearch: '',
    showClientResults: false,
    clientResults: [],
    loadingClients: false,
    setClientSearch: vi.fn(),
    setShowClientResults: vi.fn(),
    handleSelectClient: vi.fn(),
    handleClearClient: vi.fn(),
    // Produto (nenhum selecionado → estado inicial)
    products: [],
    productSearch: '',
    loadingProducts: false,
    selectedProduct: null,
    setProductSearch: vi.fn(),
    handleSelectProduct: vi.fn(),
    // Logo
    logoPreview: null,
    logoUploading: false,
    handleLogoUpload: vi.fn(),
    // Cenário
    sceneTab: 'bank',
    selectedScene: null,
    additionalDetails: '',
    showPromptPreview: false,
    fullPromptPreview: '',
    printAreas: [],
    availableTechniques: [],
    selectedTechnique: null,
    setSceneTab: vi.fn(),
    setSelectedScene: vi.fn(),
    setAdditionalDetails: vi.fn(),
    setShowPromptPreview: vi.fn(),
    setSelectedTechnique: vi.fn(),
    // Geração — o toggle em teste
    fastMode,
    setFastMode: vi.fn(),
    canGenerate: false,
    generating: false,
    variations: [],
    effectivePrompt: '',
    handleGenerate: vi.fn(),
  } as unknown as PanelState;
}

/** Renderiza o painel e localiza o toggle do Modo Rápido pela label do switch. */
function renderToggle(fastMode: boolean) {
  const utils = renderWithProviders(<MagicUpConfigPanel m={buildState(fastMode)} />);
  const switcher = screen.getByRole('switch', { name: /modo rápido/i });
  const toggle = switcher.closest('label');
  expect(toggle).not.toBeNull();
  return { ...utils, switcher, toggle: toggle as HTMLElement };
}

// Classes literais de paleta que não pertencem ao design system. `border-*`
// não casa: o `\b` exige a palavra `red`/`amber`/`orange` inteira.
const LITERAL_PALETTE = /\b(?:amber|red|orange)-\d/;

describe('MagicUpConfigPanel — toggle de Modo Rápido com tokens', () => {
  it('usa tokens semânticos no estado ativo, sem classe literal de paleta', () => {
    const { toggle } = renderToggle(true);

    expect(toggle.className).toContain('border-warning/60');
    expect(toggle.className).toContain('bg-warning/10');
    expect(toggle.innerHTML).toContain('text-warning');

    expect(toggle.className).not.toMatch(LITERAL_PALETTE);
    expect(toggle.innerHTML).not.toMatch(LITERAL_PALETTE);
  });

  it('não usa classe literal de paleta no estado inativo', () => {
    const { toggle } = renderToggle(false);

    expect(toggle.className).toContain('border-border');
    expect(toggle.className).toContain('bg-muted/30');
    expect(toggle.className).not.toMatch(LITERAL_PALETTE);
    expect(toggle.innerHTML).not.toMatch(LITERAL_PALETTE);
  });

  it('distingue o estado ativo sem depender só de cor (rótulo textual + aria-checked)', () => {
    const ativo = renderToggle(true);

    expect(screen.getByText('(Nano Banana)')).toBeInTheDocument();
    expect(ativo.switcher).toHaveAttribute('aria-checked', 'true');

    ativo.unmount();

    const inativo = renderToggle(false);

    expect(screen.queryByText('(Nano Banana)')).not.toBeInTheDocument();
    expect(inativo.switcher).toHaveAttribute('aria-checked', 'false');
  });
});
