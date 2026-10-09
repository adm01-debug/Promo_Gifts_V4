/**
 * useMockupGenerator — testes de comportamento.
 *
 * Os `vi.mock` abaixo apontam para os caminhos REAIS dos módulos importados
 * pelo hook. (Até a etapa 45 esta suíte mockava `@/hooks/useMockupDraft`,
 * `@/hooks/usePositionHistory` e `@/hooks/useLogoColorAnalysis` — caminhos que
 * não existem: o mock não se aplicava e os testes passavam sem exercitar o
 * hook. Os reais são `@/hooks/mockup/useMockupDraft` e `@/hooks/simulation`.)
 *
 * Cada caso falha se o comportamento correspondente do hook for quebrado.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import type { ReactNode } from "react";

// --- Mocks de dependências pesadas (caminhos reais) ---
vi.mock("@/lib/image-converter", () => ({
  needsConversion: vi.fn(() => false),
  ensureSupportedFormat: vi.fn(async (f: File) => f),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/external-db/invoke", () => ({
  invokeWithRetry: vi.fn().mockResolvedValue({ data: null, error: null }),
  extractFunctionErrorMessage: vi.fn(() => "erro"),
}));

vi.mock("@/lib/db/postgrest", () => ({
  dbInvoke: vi.fn().mockResolvedValue({ records: [], count: 0 }),
  dbInvokeSingle: vi.fn().mockResolvedValue({}),
  dbInvokeDelete: vi.fn().mockResolvedValue(undefined),
  dbBatch: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/contexts/ProductsContext", () => ({
  useProductsContext: () => ({ getProductById: vi.fn(() => null), products: [] }),
  ProductsProvider: ({ children }: { children: ReactNode }) => children,
}));

// Caminho real: o hook importa `./useMockupDraft` (src/hooks/mockup/useMockupDraft).
vi.mock("@/hooks/mockup/useMockupDraft", () => {
  const draft = {
    saveDraft: vi.fn(),
    loadDraft: vi.fn().mockResolvedValue(null),
    clearDraft: vi.fn().mockResolvedValue(undefined),
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    error: null,
  };
  return { useMockupDraft: vi.fn(() => draft) };
});

vi.mock("@/hooks/mockup/useMockupTechniques", () => ({
  useFilteredTechniques: () => ({ techniques: [], isLoading: false }),
  useProductCustomizationOptionsForMockup: () => ({ data: null, isLoading: false }),
}));

// Caminho real: o hook importa `useLogoColorAnalysis` e `usePositionHistory`
// do barrel `@/hooks/simulation`.
vi.mock("@/hooks/simulation", () => {
  const positionHistory = {
    pushState: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    clear: vi.fn(),
    canUndo: false,
    canRedo: false,
    setOnApply: vi.fn(),
    historyLength: 0,
    currentIndex: -1,
  };
  const logoColorAnalysis = {
    colors: [],
    isAnalyzing: false,
    error: null,
    analyzeImage: vi.fn().mockResolvedValue([]),
    updatePantone: vi.fn(),
    clearAnalysis: vi.fn(),
  };
  return {
    usePositionHistory: vi.fn(() => positionHistory),
    useLogoColorAnalysis: vi.fn(() => logoColorAnalysis),
  };
});

vi.mock("@/components/mockup/mockupWizardStep", () => ({
  getMockupWizardStep: vi.fn(() => "product"),
}));

vi.mock("@/components/mockup/MockupSuccessToast", () => ({
  showMockupSuccessToast: vi.fn(),
}));

vi.mock("@/components/mockup/techniqueColorUtils", () => ({
  classifyTechnique: vi.fn(() => "monocolor"),
  techniqueNeedsColorConfig: vi.fn(() => false),
}));

// Contrato real de generateMockupApi: { singleUrl, batchResults }.
vi.mock("@/hooks/mockup/mockupGenerationService", () => ({
  createDefaultArea: vi.fn(() => ({
    id: "a1",
    name: "Área 1",
    positionX: 50,
    positionY: 50,
    logoWidth: 10,
    logoHeight: 5,
    logoPreview: null,
  })),
  fetchMockupHistory: vi.fn().mockResolvedValue([]),
  saveMockupToDb: vi.fn().mockResolvedValue("m1"),
  generateMockupApi: vi.fn().mockResolvedValue({
    singleUrl: "https://cdn.example.com/mockup.png",
    batchResults: [],
  }),
  downloadMockupAsPdf: vi.fn().mockResolvedValue(undefined),
  deleteMockupFromDb: vi.fn().mockResolvedValue(undefined),
}));

import "../components/render-helpers"; // Supabase + Auth + sonner globais
import { toast } from "sonner";
import { useMockupGenerator } from "@/hooks/mockup/useMockupGenerator";
import {
  generateMockupApi,
  saveMockupToDb,
  fetchMockupHistory,
} from "@/hooks/mockup/mockupGenerationService";
import { showMockupSuccessToast } from "@/components/mockup/MockupSuccessToast";
import { renderHookWithProviders } from "./_helpers/render-hook-providers";
import { useMockupDraft } from "@/hooks/mockup/useMockupDraft";
import { usePositionHistory, useLogoColorAnalysis } from "@/hooks/simulation";
import type { PersonalizationArea } from "@/components/mockup/MultiAreaManager";
import type { Product } from "@/types/product-catalog";

const SELECTION_ERROR =
  "Selecione empresa, produto, técnica e faça upload de pelo menos um logo";

function makeArea(overrides: Partial<PersonalizationArea> = {}): PersonalizationArea {
  return {
    id: "area-1",
    name: "Frontal",
    positionX: 50,
    positionY: 50,
    logoWidth: 5,
    logoHeight: 3,
    logoPreview: "data:image/png;base64,AAAA",
    ...overrides,
  };
}

function makeProduct(): Product {
  return {
    id: "p1",
    name: "Caneca Premium",
    shortDescription: "Caneca",
    price: 19.9,
    images: ["https://cdn.example.com/caneca.png"],
    sku: "CAN-001",
    stock: 10,
    colors: [],
    materials: [],
    minQuantity: 1,
    stockStatus: "in-stock",
    featured: false,
    newArrival: false,
    onSale: false,
    isKit: false,
    category: { id: 1, name: "Canecas" },
    supplier: { id: "s1", name: "Fornecedor" },
    tags: {
      publicoAlvo: [],
      datasComemorativas: [],
      endomarketing: [],
      ramo: [],
      nicho: [],
    },
    dimensions: { width_cm: 20, height_cm: 10 },
  };
}

/** Deixa os efeitos assíncronos de montagem (fetchData/restoreDraft) resolverem dentro do act. */
async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Preenche a seleção mínima para o caminho de geração bem-sucedida. */
async function selectEverything(api: ReturnType<typeof useMockupGenerator>) {
  await act(async () => {
    api.setSelectedClient({ id: "c1", name: "Acme" });
    api.setProductSelection({
      product: makeProduct(),
      variant: null,
      imageUrl: "https://cdn.example.com/caneca.png",
    });
    api.setSelectedTechnique({ id: "t1", name: "Serigrafia", code: "silk" });
    api.setPersonalizationAreas([makeArea()]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useMockupGenerator (contrato do módulo)", () => {
  it("exporta o hook como função", () => {
    expect(typeof useMockupGenerator).toBe("function");
  });

  it("monta sem crashar e expõe a API de geração", async () => {
    const { result, unmount } = renderHookWithProviders(() => useMockupGenerator());
    await flushEffects();

    expect(typeof result.current).toBe("object");
    expect(typeof result.current.generateMockup).toBe("function");
    expect(Array.isArray(result.current.personalizationAreas)).toBe(true);
    // Prova que o hook consome getMockupWizardStep (mock aplicado no caminho real).
    expect(result.current.wizardStep).toBe("product");
    // Prova que os mocks usam os caminhos REAIS: se o caminho do vi.mock estiver
    // errado, o módulo real é carregado e estas funções nunca são chamadas.
    expect(vi.mocked(useMockupDraft)).toHaveBeenCalled();
    expect(vi.mocked(usePositionHistory)).toHaveBeenCalledWith({ enabled: true });
    expect(vi.mocked(useLogoColorAnalysis)).toHaveBeenCalled();

    unmount();
  });
});

describe("useMockupGenerator — geração de mockup", () => {
  it("avisa e não chama a API quando falta cliente/produto/técnica/logo", async () => {
    const { result } = renderHookWithProviders(() => useMockupGenerator());
    await flushEffects();

    await act(async () => {
      await result.current.generateMockup();
    });
    await flushEffects();

    expect(vi.mocked(generateMockupApi)).not.toHaveBeenCalled();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(SELECTION_ERROR);
    expect(result.current.generatedMockup).toBeNull();
  });

  it("gera o mockup, salva no histórico e expõe a URL quando a seleção está completa", async () => {
    const { result } = renderHookWithProviders(() => useMockupGenerator());
    await flushEffects();
    await selectEverything(result.current);

    const historyCallsAfterMount = vi.mocked(fetchMockupHistory).mock.calls.length;

    await act(async () => {
      await result.current.generateMockup();
    });
    await flushEffects();

    expect(vi.mocked(generateMockupApi)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateMockupApi)).toHaveBeenCalledWith(
      expect.objectContaining({
        productImage: "https://cdn.example.com/caneca.png",
        productName: "Caneca Premium",
        technique: expect.objectContaining({ id: "t1" }),
        productWidthCm: 20,
        productHeightCm: 10,
        areas: [
          expect.objectContaining({
            id: "area-1",
            logoPreview: "data:image/png;base64,AAAA",
          }),
        ],
      }),
    );

    expect(result.current.generatedMockup).toBe("https://cdn.example.com/mockup.png");
    expect(result.current.isLoading).toBe(false);

    expect(vi.mocked(saveMockupToDb)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveMockupToDb)).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "test-user-id",
        mockupUrl: "https://cdn.example.com/mockup.png",
        area: expect.objectContaining({ id: "area-1" }),
      }),
    );
    expect(vi.mocked(showMockupSuccessToast)).toHaveBeenCalledTimes(1);
    // BUG-3: o histórico é recarregado logo após gerar.
    expect(vi.mocked(fetchMockupHistory).mock.calls.length).toBeGreaterThan(
      historyCallsAfterMount,
    );
  });

  it("ignora uma segunda chamada concorrente (guard de reentrância)", async () => {
    const { result } = renderHookWithProviders(() => useMockupGenerator());
    await flushEffects();
    await selectEverything(result.current);

    await act(async () => {
      const first = result.current.generateMockup();
      const second = result.current.generateMockup();
      await Promise.all([first, second]);
    });
    await flushEffects();

    expect(vi.mocked(generateMockupApi)).toHaveBeenCalledTimes(1);
  });
});
