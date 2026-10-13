/**
 * Varredura de acessibilidade (axe-core / WCAG 2.1 AA) da PÁGINA INTEIRA do
 * Magic Up. O doc de acessibilidade da Onda 5 declara as melhorias; este teste
 * as trava nos três estados de uso da página:
 *
 *   1. vazio        — nada escolhido, nenhuma variação gerada;
 *   2. configurando — produto + logo + cenário prontos, ainda sem resultado;
 *   3. resultado    — variações geradas com diagnóstico (comparador + curadoria).
 *
 * Em cada estado o axe roda no container completo da página e, além disso, o
 * teste trava a semântica dos dois agrupamentos que a Onda 5 introduziu:
 *   • radiogroup de curadoria (MagicUpCurationStatus) — role=radiogroup + radios;
 *   • comparador de variações (MagicUpVariationComparator) — role=list + listitem.
 * Remover o role do container passa batido pelo axe, então a asserção de papel
 * é o que realmente detecta a perda de semântica.
 *
 * O estado do hook de página é mockado (o hook real depende de Supabase/CRM),
 * mas os painéis config/result e os componentes folha são os reais.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import MagicUpPage from '@/pages/tools/MagicUp';
import { renderWithProviders } from '../components/render-helpers';
import { axe } from '../a11y/axe-helper';
import type { useMagicUpState, VariationItem } from '@/hooks/intelligence';
import {
  CURATION_STATUSES,
  DEFAULT_BRAND_KIT,
  DEFAULT_BRIEF,
  DEFAULT_CREATIVE_CONTROLS,
  buildCopyPack,
  buildMagicScore,
  buildQualityDiagnosis,
} from '@/pages/magic-up/magicUpStrategy';

type MagicUpState = ReturnType<typeof useMagicUpState>;

// vi.mock é hoisted acima dos imports — o estado que o mock devolve precisa
// viver num holder criado com vi.hoisted.
const holder = vi.hoisted(() => ({ current: null as MagicUpState | null }));

vi.mock('@/hooks/intelligence/useMagicUpState', () => ({
  useMagicUpState: () => holder.current,
}));

// ─── Fixtures ────────────────────────────────────────────────────────

const emptyScore = buildMagicScore({
  hasProduct: false,
  hasLogo: false,
  hasClient: false,
  hasTechnique: false,
  hasBrief: true,
  channel: DEFAULT_BRIEF.channel,
});

const readyScore = buildMagicScore({
  hasProduct: true,
  hasLogo: true,
  hasClient: true,
  hasTechnique: true,
  hasBrief: true,
  channel: 'whatsapp',
});

const readyDiagnosis = buildQualityDiagnosis(readyScore);

const copyPack = buildCopyPack({
  productName: 'Caneca Térmica 500ml',
  clientName: 'Test Co',
  cta: DEFAULT_BRIEF.cta,
  tone: DEFAULT_BRIEF.tone,
  channel: DEFAULT_BRIEF.channel,
});

const product = {
  id: 'prod-1',
  name: 'Caneca Térmica 500ml',
  sku: 'CAN-500',
  images: [],
  primary_image_url: 'https://example.com/caneca.png',
  og_image_url: null,
};

const client = {
  id: 'cli-1',
  name: 'Test Co',
  logo_url: 'https://example.com/logo.png',
  ramo_atividade: 'Bebidas',
  cor_primaria_hex: '#123456',
  cor_primaria_nome: 'Azul',
};

const scene = {
  id: 'scene-1',
  title: 'Mesa de trabalho premium',
  category: 'escritorio',
  prompt: 'Caneca sobre mesa de madeira com luz natural',
};

function variation(overrides: Partial<VariationItem> = {}): VariationItem {
  return {
    id: 'var-1',
    imageUrl: 'https://example.com/magic-up.png',
    isFavorite: false,
    qualityScore: readyDiagnosis.total,
    qualityDiagnosis: readyDiagnosis,
    curationStatus: 'draft',
    isWinner: false,
    ...overrides,
  };
}

/** Handlers compartilhados: nenhum estado exercita clique, só render+a11y. */
const noop = vi.fn();

/** Estado base = página VAZIA (nada escolhido, nenhuma variação). */
function buildState(overrides: Partial<MagicUpState> = {}): MagicUpState {
  const base: Partial<MagicUpState> = {
    // Produto
    products: [],
    loadingProducts: false,
    initialProductsLoaded: true,
    productSearch: '',
    setProductSearch: noop,
    selectedProduct: null,
    colors: [],
    productImages: [],
    selectedColor: null,
    setSelectedColor: noop,
    loadingColors: false,
    handleSelectProduct: noop,
    printAreas: [],
    loadingPrintAreas: false,
    availableTechniques: [],
    selectedLocationId: null,
    setSelectedLocationId: noop,
    selectedTechnique: null,
    setSelectedTechnique: noop,
    // Logo
    logoPreview: null,
    logoUploading: false,
    handleLogoUpload: noop,
    // Cenário
    selectedScene: null,
    setSelectedScene: noop,
    additionalDetails: '',
    setAdditionalDetails: noop,
    showPromptPreview: false,
    setShowPromptPreview: noop,
    sceneTab: 'ai',
    setSceneTab: noop,
    // Briefing / campanha
    brief: DEFAULT_BRIEF,
    setBrief: noop,
    activeCampaign: null,
    setActiveCampaign: noop,
    campaigns: [],
    handleSaveCampaign: noop,
    handleSelectCampaign: noop,
    handleDuplicateCampaign: noop,
    // Controles criativos / marca / refinamento / lote
    creativeControls: DEFAULT_CREATIVE_CONTROLS,
    setCreativeControls: noop,
    brandNotes: '',
    setBrandNotes: noop,
    brandKit: DEFAULT_BRAND_KIT,
    loadingBrandKit: false,
    handleUpdateBrandKit: noop,
    handleUseBrandLogo: noop,
    handleAddCurrentLogoToBrandKit: noop,
    handleSaveBrandKit: noop,
    activeRefinement: null,
    handleApplyRefinement: noop,
    batchQueue: [],
    batchRunning: false,
    handleSetBatchQueue: noop,
    handleRunBatchQueue: noop,
    handleClearBatchQueue: noop,
    // Score / copy
    qualityScore: emptyScore,
    qualityDiagnosis: buildQualityDiagnosis(emptyScore),
    copyPack,
    effectivePrompt: '',
    fullPromptPreview: '',
    // Cliente (CRM)
    selectedClient: null,
    clientSearch: '',
    setClientSearch: noop,
    showClientResults: false,
    setShowClientResults: noop,
    clientResults: [],
    loadingClients: false,
    handleSelectClient: noop,
    handleClearClient: noop,
    // Geração
    variations: [],
    activeVariation: 0,
    setActiveVariation: noop,
    setVariations: noop,
    currentVariation: null,
    generating: false,
    canGenerate: false,
    curationStatus: 'draft',
    handleGenerate: noop,
    handleDownload: noop,
    handleShare: noop,
    handleRunQualityScore: noop,
    handleSetCurationStatus: noop,
    handleSelectWinningVariation: noop,
    handleToggleFavorite: noop,
    handleToggleHistoryFavorite: noop,
    handleDeleteHistory: noop,
    handleSelectHistory: noop,
    history: [],
    // Layout
    currentImage: null,
    selectedLocationName: null,
    step: 1,
    fastMode: false,
    setFastMode: noop,
  };
  return { ...base, ...overrides } as MagicUpState;
}

/** Estado CONFIGURANDO: produto, logo e cenário prontos, ainda sem resultado. */
function configuringState(): MagicUpState {
  return buildState({
    selectedProduct: product,
    colors: [{ hex: '#FFFFFF', name: 'Branco', code: 'BR', stock: 12 }],
    currentImage: product.primary_image_url,
    selectedColor: { hex: '#FFFFFF', name: 'Branco', code: 'BR', stock: 12 },
    printAreas: [
      {
        area_id: 'AREA-1',
        area_code: 'AREA-1',
        area_name: 'Frente',
        component_name: null,
        location_name: 'Frente',
        max_width: 10,
        max_height: 5,
        unit: 'cm',
        shape: 'rectangle',
        is_curved: false,
        is_primary: true,
        display_order: 1,
        techniques: [{ id: 'tec-1', nome: 'Serigrafia', codigo: 'SRG' }],
      },
    ],
    availableTechniques: [{ id: 'tec-1', name: 'Serigrafia', code: 'SRG' }],
    selectedTechnique: { id: 'tec-1', name: 'Serigrafia', code: 'SRG' },
    selectedLocationId: 'AREA-1',
    logoPreview: 'https://example.com/logo.png',
    selectedScene: scene,
    additionalDetails: 'Ambiente com tons quentes',
    selectedClient: client,
    qualityScore: readyScore,
    qualityDiagnosis: readyDiagnosis,
    effectivePrompt: 'Caneca sobre mesa de madeira com luz natural',
    fullPromptPreview: 'BRIEFING: objetivo=orcamento-rapido; canal=whatsapp',
    canGenerate: true,
    step: 4,
  });
}

/** Estado RESULTADO: 3 variações com diagnóstico, curadoria e comparador. */
function resultState(): MagicUpState {
  const variations = [
    variation({ id: 'var-1', qualityScore: 92, imageUrl: 'https://example.com/v1.png' }),
    variation({ id: 'var-2', qualityScore: 80, imageUrl: 'https://example.com/v2.png' }),
    variation({ id: 'var-3', qualityScore: 70, imageUrl: 'https://example.com/v3.png' }),
  ];
  return buildState({
    ...configuringState(),
    variations,
    currentVariation: variations[0],
    activeVariation: 0,
    history: [
      {
        id: 'hist-1',
        generated_image_url: 'https://example.com/hist.png',
        product_name: 'Caneca Térmica 500ml',
        scene_title: 'Mesa de trabalho premium',
        scene_category: 'escritorio',
        is_favorite: false,
        created_at: '2026-10-01T10:00:00.000Z',
        quality_score: 90,
      },
    ],
  });
}

function renderPage(state: MagicUpState) {
  holder.current = state;
  const utils = renderWithProviders(<MagicUpPage />);
  // O painel real só monta depois do primeiro load de produtos.
  expect(screen.getByTestId('page-title-magic-up')).toBeInTheDocument();
  return utils;
}

describe('MagicUp — varredura axe da página inteira (WCAG 2.1 AA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    holder.current = null;
  });

  it('estado vazio: sem violações e sem comparador/curadoria montados', async () => {
    const { container } = renderPage(buildState());

    expect(screen.queryByTestId('magic-up-variation-comparator')).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: /curadoria/i })).toBeNull();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('estado configurando: sem violações com produto, logo e cenário escolhidos', async () => {
    const { container } = renderPage(configuringState());

    expect(screen.getByRole('button', { name: /Ver prompt completo/i })).toBeInTheDocument();
    expect(screen.queryByTestId('magic-up-variation-comparator')).toBeNull();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('estado resultado: sem violações com as 3 variações geradas', async () => {
    const { container } = renderPage(resultState());

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('resultado: mantém a semântica do comparador de variações (list/listitem/aria-pressed)', () => {
    renderPage(resultState());

    const comparator = screen.getByTestId('magic-up-variation-comparator');
    expect(comparator).toHaveAttribute('aria-label', 'Comparador de variações');

    const list = within(comparator).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);

    const cards = within(list).getAllByRole('button', { name: /^Selecionar variação \d/ });
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveAttribute('aria-pressed', 'true');
    expect(cards[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('resultado: mantém a semântica do radiogroup de curadoria (radiogroup/radio/aria-checked)', () => {
    renderPage(resultState());

    const group = screen.getByRole('radiogroup', { name: /curadoria/i });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(CURATION_STATUSES.length);
    // Todo radio precisa de nome acessível próprio (só o rótulo visível não basta).
    for (const radio of radios) {
      expect(radio).toHaveAccessibleName(/^Definir curadoria como /);
    }
    // exatamente um selecionado — contrato de radiogroup único.
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
  });
});
