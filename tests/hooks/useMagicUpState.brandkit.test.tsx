/**
 * E-6 — Brand Kit do Magic Up: o efeito de sincronização NÃO pode apagar
 * edições locais nem desfazer a logo principal escolhida.
 *
 * Contrato provado aqui:
 *  1. editar o kit e depois trocar a logo → as edições permanecem;
 *  2. marcar uma logo do kit como principal persiste (isPrimary/primaryLogoUrl);
 *  3. o kit vindo do servidor entra só na carga inicial do cliente.
 *
 * Sem a correção o efeito depende de `logoPreview` e reaplica `loadedBrandKit`
 * a cada troca de logo, zerando `brandKit` para o estado do servidor.
 */
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMagicUpState } from "@/hooks/intelligence/useMagicUpState";
import type { MagicUpBrandLogo } from "@/pages/magic-up/magicUpStrategy";

const mocks = vi.hoisted(() => ({
  fromMock: vi.fn(),
  invokeMock: vi.fn().mockResolvedValue({ data: null, error: null }),
  announceStatus: vi.fn(),
  announceAlert: vi.fn(),
  brandKitRow: null as Record<string, unknown> | null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
  supabase: {
    from: mocks.fromMock,
    functions: { invoke: mocks.invokeMock },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "u@e.com" }, loading: false }),
}));

vi.mock("@/components/a11y", () => ({
  useAriaLive: () => ({ announceStatus: mocks.announceStatus, announceAlert: mocks.announceAlert }),
}));

vi.mock("@/hooks/mockup", () => ({
  useProductCustomizationOptionsForMockup: () => ({ data: null, isLoading: false }),
}));

vi.mock("@/lib/external-db", () => ({
  fetchPromobrindProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/crm-db", () => ({
  searchCrm: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/types/crm", () => ({
  getCompanyDisplayName: () => "ACME",
}));

/** Chain mínimo do supabase-js: métodos encadeáveis + terminais que resolvem. */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chainable = [
    "select", "insert", "update", "delete", "upsert", "eq", "neq", "in", "is", "not", "or", "and",
    "match", "filter", "order", "limit", "range", "gt", "gte", "lt", "lte", "like", "ilike", "contains",
  ];
  for (const method of chainable) builder[method] = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

const SERVER_KIT_LOGO_A: MagicUpBrandLogo = {
  id: "srv-1",
  label: "Logo A",
  url: "https://cdn.example.com/a.png",
  variant: "principal",
  isPrimary: true,
};
const SERVER_KIT_LOGO_B: MagicUpBrandLogo = {
  id: "srv-2",
  label: "Logo B",
  url: "https://cdn.example.com/b.png",
  variant: "colorida",
  isPrimary: false,
};

function serverKitRow(): Record<string, unknown> {
  return {
    id: "kit-1",
    client_id: "client-1",
    client_name: "ACME",
    logo_urls: [SERVER_KIT_LOGO_A, SERVER_KIT_LOGO_B],
    primary_color: "#123456",
    secondary_color: "#654321",
    tone_of_voice: "premium-consultivo",
    visual_style: "limpo-corporativo",
    required_words: ["promo"],
    forbidden_words: [],
    notes: "kit do servidor",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.brandKitRow = null;
  mocks.fromMock.mockImplementation((table: string) =>
    table === "magic_up_brand_kits"
      ? makeBuilder({ data: mocks.brandKitRow, error: null })
      : makeBuilder({ data: [], error: null }),
  );
});

describe("useMagicUpState — Brand Kit não apaga edições nem desfaz a logo principal (E-6)", () => {
  it("editar o kit e trocar a logo mantém as edições locais e a logo principal escolhida", async () => {
    mocks.brandKitRow = serverKitRow();
    const { result } = renderHook(() => useMagicUpState(), { wrapper });

    act(() => {
      result.current.handleSelectClient({ id: "client-1", razao_social: "ACME LTDA" } as never);
    });

    // Kit do servidor entra na carga inicial.
    await waitFor(() => expect(result.current.brandKit.id).toBe("kit-1"));
    expect(result.current.brandKit.toneOfVoice).toBe("premium-consultivo");

    // Usuário edita o kit (edição ainda não salva).
    act(() => {
      result.current.handleUpdateBrandKit({ toneOfVoice: "editorial", notes: "minha edição" });
    });
    expect(result.current.brandKit.toneOfVoice).toBe("editorial");

    // Usuário escolhe outra logo do kit como principal.
    act(() => {
      result.current.handleUseBrandLogo(SERVER_KIT_LOGO_B);
    });

    // As edições permanecem (não são resetadas ao kit do servidor).
    expect(result.current.brandKit.toneOfVoice).toBe("editorial");
    expect(result.current.brandKit.notes).toBe("minha edição");
    // A logo principal escolhida persiste.
    expect(result.current.brandKit.primaryLogoUrl).toBe(SERVER_KIT_LOGO_B.url);
    expect(result.current.brandKit.logoUrls.find((l) => l.id === "srv-2")?.isPrimary).toBe(true);
    expect(result.current.brandKit.logoUrls.find((l) => l.id === "srv-1")?.isPrimary).toBe(false);
    expect(result.current.logoPreview).toBe(SERVER_KIT_LOGO_B.url);
    // E o kit do servidor não foi reaplicado (logo principal não voltou para srv-1).
    expect(result.current.brandKit.primaryLogoUrl).not.toBe(SERVER_KIT_LOGO_A.url);
  });

  it("sem kit salvo, editar o kit e trocar a logo preserva as edições locais", async () => {
    mocks.brandKitRow = null;
    const { result } = renderHook(() => useMagicUpState(), { wrapper });

    act(() => {
      result.current.handleSelectClient({
        id: "client-2",
        razao_social: "Sem Kit LTDA",
        logo_url: "https://crm.example.com/sem-kit.png",
      } as never);
    });

    await waitFor(() => expect(result.current.brandKit.clientId).toBe("client-2"));
    expect(result.current.brandKit.id).toBeNull();

    act(() => {
      result.current.handleUpdateBrandKit({ toneOfVoice: "editorial", notes: "edição sem kit salvo" });
    });

    act(() => {
      result.current.handleUseBrandLogo({
        id: "avulsa-1",
        label: "Logo avulsa",
        url: "https://cdn.example.com/avulsa.png",
        variant: "icone",
        isPrimary: true,
      });
    });

    // A edição local sobrevive à troca de logo (o fallback do CRM não é reaplicado).
    expect(result.current.brandKit.toneOfVoice).toBe("editorial");
    expect(result.current.brandKit.notes).toBe("edição sem kit salvo");
    expect(result.current.brandKit.primaryLogoUrl).toBe("https://cdn.example.com/avulsa.png");
  });
});
