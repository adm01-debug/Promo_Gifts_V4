import React from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useMagicUpGeneration } from "@/hooks/intelligence/useMagicUpGeneration";
import { MAGIC_UP_SHARE_NO_IMAGE_REASON } from "@/hooks/intelligence/magicUpShare";
import {
  DEFAULT_BRAND_KIT,
  DEFAULT_BRIEF,
  DEFAULT_CREATIVE_CONTROLS,
  buildCopyPack,
  buildMagicScore,
  type MagicUpQualityDiagnosis,
} from "@/pages/magic-up/magicUpStrategy";

const mocks = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  selectMock: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }) };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invokeMock },
    from: () => ({
      insert: mocks.insertMock,
      update: mocks.updateMock,
      select: mocks.selectMock,
    }),
  },
}));

const aiDiagnosis = (total = 91): MagicUpQualityDiagnosis => ({
  total,
  label: "Excelente para envio",
  summary: "Diagnóstico por IA aprovado.",
  source: "ai",
  strengths: ["Produto claro"],
  risks: [],
  recommendations: ["Enviar ao cliente."],
  criteria: [
    { id: "produto-claro", label: "Produto claro", score: 94, passed: true, weight: 5, recommendation: "Ok" },
  ],
});

const deps = {
  selectedProduct: { id: "prod-1", name: "Caneta Metal", sku: "CAN-1", images: [], primary_image_url: "https://example.com/product.png" },
  currentImage: "https://example.com/product.png",
  logoPreview: "https://example.com/logo.png",
  effectivePrompt: "Cenário corporativo premium",
  selectedColor: { name: "Azul", hex: "#0000ff", code: "AZ" },
  selectedTechnique: { id: "tec-1", name: "Silk", code: "SLK" },
  selectedLocationName: "Corpo",
  selectedScene: { id: "scene-1", title: "Escritório", category: "corporativo", prompt: "Mesa executiva" },
  selectedClient: { id: "client-1", name: "ACME" },
  userId: "user-1",
  brief: DEFAULT_BRIEF,
  creativeControls: DEFAULT_CREATIVE_CONTROLS,
  qualityScore: buildMagicScore({ hasProduct: true, hasLogo: true, hasClient: true, hasTechnique: true, hasBrief: true, channel: DEFAULT_BRIEF.channel }),
  copyPack: buildCopyPack({ productName: "Caneta Metal", clientName: "ACME", cta: DEFAULT_BRIEF.cta, tone: DEFAULT_BRIEF.tone, channel: DEFAULT_BRIEF.channel }),
  fullPromptPreview: "Prompt completo",
  activeCampaign: null,
  brandKit: DEFAULT_BRAND_KIT,
  brandNotes: "Tom premium",
  activeRefinement: null,
};

// Data URL reproduz o defeito E-3: base64 embutido no ?text= estoura/quebra o link.
const GENERATED_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

const sharedText = (url: string) =>
  decodeURIComponent(url.slice("https://wa.me/?text=".length));

describe("useMagicUpGeneration — compartilhar (E-3)", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    mocks.insertMock.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: "gen-1" }, error: null }) }) });
    mocks.updateMock.mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });
    mocks.selectMock.mockReturnValue({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { metadata: {}, status: "draft" }, error: null }) }) });
    mocks.invokeMock
      .mockResolvedValueOnce({ data: { imageUrl: GENERATED_IMAGE, model: "magic-up-pro" }, error: null })
      .mockResolvedValueOnce({ data: aiDiagnosis(90), error: null });
  });

  const renderAndGenerate = async () => {
    const rendered = renderHook(() => useMagicUpGeneration(deps), { wrapper });
    await act(async () => {
      await rendered.result.current.handleGenerate();
    });
    expect(rendered.result.current.currentVariation?.imageUrl).toBe(GENERATED_IMAGE);
    return rendered;
  };

  it("nunca embute a imagem no link — só a descrição e o nome do criativo", async () => {
    const { result } = await renderAndGenerate();

    result.current.handleShare();

    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);

    const text = sharedText(url);
    expect(text).not.toContain("data:");
    expect(text).not.toContain(GENERATED_IMAGE);
    expect(text).toContain("Caneta Metal");
    expect(text).toContain("Escritório");
  });

  it("sem imagem disponível o botão informa o motivo e não abre o WhatsApp", () => {
    const { result } = renderHook(() => useMagicUpGeneration(deps), { wrapper });
    expect(result.current.currentVariation).toBeNull();

    result.current.handleShare();

    expect(openSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(MAGIC_UP_SHARE_NO_IMAGE_REASON);
  });
});
