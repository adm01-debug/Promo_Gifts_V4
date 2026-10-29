/**
 * Matriz de aceite do Mockup — GRUPO 3 (A05–A08): áreas, técnica e escala.
 *
 * Um teste por cenário, nomeado com o ID. Fixtures fixas em `./grupo3.fixtures.ts`
 * (nunca marca/cliente real). Sem `it.skip`.
 *
 * A07/A08 assertam o contrato de rótulo de geometria (`data-testid="logo-geometry-state"`)
 * do cartão da etapa 74 ("prévia rotulada em três estados"), AINDA NÃO em main: hoje
 * falham por ausência do rótulo (a prévia é muda) e passam quando ele integrar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { toast } from 'sonner';

// Observação (não é o comportamento testado): sonner com `warning`, ausente no helper global.
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }),
  Toaster: () => null,
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
// Dependências do editor de posição (não é o rótulo sob teste).
vi.mock('@/hooks/products', () => ({
  useProductBounds: () => ({ fractionX: 0.85, fractionY: 0.85, centerX: 0.5, centerY: 0.5, detected: false, imageAspectRatio: 1, loading: false }),
}));
vi.mock('@/components/mockup/logo-editor/useElementSize', () => ({ useElementSize: () => ({ ref: { current: null }, size: { width: 400, height: 400 } }) }));
vi.mock('@/components/mockup/logo-editor/useLogoProcessing', () => ({ useLogoProcessing: () => ({ processedLogoUrl: null }) }));
vi.mock('@/components/mockup/logo-editor/useLogoDrag', () => ({ useLogoDrag: () => ({ handlePointerDown: vi.fn() }) }));
// Dependências do hook useMockupGenerator (só o caminho de A06-dimensão usa).
vi.mock('@/lib/image-converter', () => ({ needsConversion: vi.fn(() => false), ensureSupportedFormat: vi.fn(async (f: File) => f) }));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: vi.fn().mockResolvedValue({ records: [], count: 0 }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fixture-user-id' } }) }));
vi.mock('@/contexts/ProductsContext', () => ({ useProductsContext: () => ({ getProductById: () => null, products: [] }) }));
vi.mock('@/hooks/mockup/useMockupTechniques', () => ({ useFilteredTechniques: () => [], useProductCustomizationOptionsForMockup: () => ({ data: null }) }));
vi.mock('@/hooks/mockup/useMockupDraft', () => ({
  useMockupDraft: () => ({ saveDraft: vi.fn(), loadDraft: vi.fn().mockResolvedValue(null), clearDraft: vi.fn().mockResolvedValue(undefined), isSaving: false, isLoading: false, lastSaved: null, error: null }),
}));
vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => ({ colors: [], isAnalyzing: false, error: null, analyzeImage: vi.fn(), clearAnalysis: vi.fn(), updatePantone: vi.fn() }),
  usePositionHistory: () => ({ setOnApply: vi.fn(), pushState: vi.fn(), clear: vi.fn(), canRedo: false }),
}));
vi.mock('@/components/mockup/mockupWizardStep', () => ({ getMockupWizardStep: () => 'product' }));
vi.mock('@/components/mockup/MockupSuccessToast', () => ({ showMockupSuccessToast: vi.fn() }));
vi.mock('@/components/mockup/techniqueColorUtils', () => ({ classifyTechnique: () => 'other', techniqueNeedsColorConfig: () => false }));
vi.mock('@/lib/personalization/adapters', () => ({ adaptTabelaPrecoRows: (rows: unknown[]) => rows }));
vi.mock('@/utils/image-utils', () => ({ getCdnUrl: (url: string) => url }));
vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  createDefaultArea: () => ({ id: 'fixture-default-area', name: 'FIXTURE-AREA-1', positionX: 50, positionY: 50, logoWidth: 5, logoHeight: 3, logoPreview: null }),
  fetchMockupHistory: vi.fn().mockResolvedValue([]),
  saveMockupToDb: vi.fn().mockResolvedValue('fixture-record-id'),
  generateMockupApi: vi.fn().mockResolvedValue({ singleUrl: 'https://fixture.invalid/mockup.png', batchResults: [] }),
  downloadMockupAsPdf: vi.fn().mockResolvedValue(undefined),
  deleteMockupFromDb: vi.fn().mockResolvedValue(undefined),
}));

import { MultiAreaManager } from '@/components/mockup/MultiAreaManager';
import { LogoColorAnalyzer } from '@/components/mockup/LogoColorAnalyzer';
import { LogoPositionEditor } from '@/components/mockup/LogoPositionEditor';
import { TooltipProvider } from '@/components/ui/tooltip';
import { renderHookWithProviders } from '../../../hooks/_helpers/render-hook-providers';
import { useMockupGenerator } from '@/hooks/mockup/useMockupGenerator';
import {
  AREAS_DUAS, AREA_FRENTE, LIMITE_CORES_FRENTE, CORES_DETECTADAS_3,
  CLIENTE_FIXTURE, PRODUTO_CALIBRADO, TECNICA_SERIGRAFIA,
} from './grupo3.fixtures';

beforeEach(() => vi.clearAllMocks());

const renderEditor = (over: Partial<React.ComponentProps<typeof LogoPositionEditor>> = {}) =>
  render(
    <TooltipProvider>
      <LogoPositionEditor
        productImageUrl={PRODUTO_CALIBRADO.images[0]}
        logoPreview={AREA_FRENTE.logoPreview}
        positionX={AREA_FRENTE.positionX}
        positionY={AREA_FRENTE.positionY}
        logoWidth={AREA_FRENTE.logoWidth}
        logoHeight={AREA_FRENTE.logoHeight}
        maxWidth={AREA_FRENTE.maxWidthCm}
        maxHeight={AREA_FRENTE.maxHeightCm}
        techniqueCode={TECNICA_SERIGRAFIA.code}
        techniqueName="Serigrafia"
        onPositionChange={vi.fn()}
        onSizeChange={vi.fn()}
        {...over}
      />
    </TooltipProvider>,
  );

describe('A05 — isolamento entre áreas (logo e paleta)', () => {
  it('mantém o logo e o limite de cores de cada área, sem vazar de uma para a outra', () => {
    const onAreasChange = vi.fn();
    render(
      <MultiAreaManager
        areas={AREAS_DUAS}
        activeAreaId={AREA_FRENTE.id}
        onAreasChange={onAreasChange}
        onActiveAreaChange={vi.fn()}
        onLogoUpload={vi.fn()}
        onLogoRemove={vi.fn()}
      />,
    );

    // Cada área mostra o SEU logo (dois thumbnails, srcs distintos).
    const srcs = (screen.getAllByAltText('Miniatura do logo enviado') as HTMLImageElement[]).map((t) => t.getAttribute('src'));
    expect(srcs).toHaveLength(2);
    expect(srcs).toContain(AREA_FRENTE.logoPreview);
    expect(srcs).toContain(AREAS_DUAS[1].logoPreview);
    expect(srcs[0]).not.toBe(srcs[1]);

    // Cada área mostra a SUA paleta (limite de cores próprio).
    expect(screen.getByText('FIXTURE-FRENTE')).toBeInTheDocument();
    expect(screen.getByText('FIXTURE-COSTAS')).toBeInTheDocument();
    expect(screen.getByText(/até 1 cor\b/)).toBeInTheDocument();
    expect(screen.getByText(/até 4 cores/)).toBeInTheDocument();

    // Remover o logo de UMA área não toca na outra (sem vazamento).
    act(() => screen.getByLabelText('Remover logo de FIXTURE-FRENTE').click());
    expect(onAreasChange).toHaveBeenCalledTimes(1);
    const next = onAreasChange.mock.calls[0][0] as typeof AREAS_DUAS;
    expect(next.find((a) => a.id === AREA_FRENTE.id)?.logoPreview).toBeNull();
    expect(next.find((a) => a.id === AREAS_DUAS[1].id)?.logoPreview).toBe(AREAS_DUAS[1].logoPreview);
    expect(next.find((a) => a.id === AREAS_DUAS[1].id)?.maxColors).toBe(AREAS_DUAS[1].maxColors);
  });
});

describe('A06 — excesso gera pendência específica', () => {
  it('cores acima do limite da área exibem pendência com o número exato do limite', () => {
    render(
      <LogoColorAnalyzer colors={CORES_DETECTADAS_3} isAnalyzing={false} error={null} maxColors={LIMITE_CORES_FRENTE} onPantoneChange={vi.fn()} />,
    );
    // Pendência específica: cita o limite real (2), não um aviso genérico.
    const warning = screen.getByText(/O número máximo de cores é/i);
    expect(warning).toBeInTheDocument();
    expect(warning.textContent).toContain(String(LIMITE_CORES_FRENTE));
  });

  it('dimensão acima do limite da área gera aviso nomeando a área e as medidas', async () => {
    const { result } = renderHookWithProviders(() => useMockupGenerator());
    act(() => {
      result.current.setProductSelection({ product: { ...PRODUTO_CALIBRADO }, variant: null, imageUrl: PRODUTO_CALIBRADO.images[0] } as never);
      result.current.setSelectedClient({ ...CLIENTE_FIXTURE });
      // Técnica SEM limites próprios: o limite vem da ÁREA (maxWidthCm=5).
      result.current.setSelectedTechnique({ id: TECNICA_SERIGRAFIA.id, name: TECNICA_SERIGRAFIA.name, code: TECNICA_SERIGRAFIA.code } as never);
      result.current.setPersonalizationAreas([{ ...AREA_FRENTE, maxWidthCm: 5, logoWidth: 20 }]);
      result.current.setActiveAreaId(AREA_FRENTE.id);
    });
    await act(async () => { await result.current.generateMockup(); });

    const warning = (toast as unknown as { warning: ReturnType<typeof vi.fn> }).warning;
    expect(warning).toHaveBeenCalledTimes(1);
    const message = String(warning.mock.calls[0][0]);
    expect(message).toContain('FIXTURE-FRENTE');
    expect(message).toContain('20.0 cm');
    expect(message).toContain('5 cm');
  });
});

describe('A07 — escala conhecida na prévia', () => {
  it('com produto, área e logo medidos, a prévia rotula geometria validada em cm', () => {
    renderEditor({ productWidthCm: PRODUTO_CALIBRADO.dimensions.width_cm, productHeightCm: PRODUTO_CALIBRADO.dimensions.height_cm });
    const label = screen.getByTestId('logo-geometry-state');
    expect(label).toHaveAttribute('data-state', 'validada');
    expect(label.textContent).toContain('5,0 × 3,0 cm'); // medida real da logo
    expect(label.textContent).toContain('7,0 × 3,0 cm'); // fronteira oficial da área
  });
});

describe('A08 — sem calibração a prévia mostra estimativa', () => {
  it('produto sem dimensões físicas rotula geometria ilustrativa, sem cm de falsa precisão', () => {
    renderEditor();
    const label = screen.getByTestId('logo-geometry-state');
    expect(label).toHaveAttribute('data-state', 'ilustrativa');
    expect(label.textContent).toMatch(/ilustrativ/i);
    // Estimativa NUNCA vira régua: nenhum cm exibido sem calibração real.
    expect(label.textContent).not.toContain('cm');
  });
});
