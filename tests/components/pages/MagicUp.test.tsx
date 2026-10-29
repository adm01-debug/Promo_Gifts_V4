/**
 * MagicUp page — smoke do fluxo real (E-26).
 *
 * O teste anterior só provava "renderiza sem crashar": os mocks de hook
 * apontavam para especificadores que a página não usa
 * (`@/hooks/mockup/useMockupTechniques`, enquanto `useMagicUpState` importa o
 * barrel `@/hooks/mockup`; e `@/hooks/usePrintAreas`, que não existe — o módulo
 * real é `@/hooks/simulation/usePrintAreas`), então o fluxo de
 * configuração/geração nunca era exercitado.
 *
 * Aqui a página é montada com os hooks REAIS (`useMagicUpState`,
 * `useMagicUpGeneration`, `useProductCustomizationOptionsForMockup`,
 * `useAriaLive`) e SÓ as bordas de rede são substituídas (catálogo externo,
 * RPC de personalização, postgrest, edge function, CRM). Isso prova:
 *   1. o passo de configuração (produto → logo → prompt) habilita "Gerar"
 *      SOMENTE quando os três pilares existem — a assertiva quebra se o botão
 *      habilitar cedo demais;
 *   2. o caminho feliz gera a imagem e a exibe no painel de resultado;
 *   3. quando a edge function falha, o erro chega ao usuário (toast) e nenhuma
 *      variação é fabricada.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// IMPORTANTE — ORDEM DE IMPORTAÇÃO: `../render-helpers` precisa ser o primeiro
// módulo do projeto avaliado neste arquivo. É ele que registra (`vi.mock`) as
// bordas de rede — o client do Supabase, auth e sonner. Se um módulo da página
// (ex.: `@/pages/tools/MagicUp`) for avaliado antes, o import de
// `@/integrations/supabase/client` resolve para o client REAL e o
// `supabase.functions.invoke('magic-up-score')` do fluxo de geração vira
// requisição de rede de verdade — que `STRICT_TEST_SIDE_EFFECTS=1` (test:ci-core)
// reprova. Não reordene estas linhas.
import { renderWithProviders } from "../render-helpers";
// `sonner` também é mockado por `../render-helpers` (é ele que vence para os
// módulos da página). Importamos AQUI — depois do render-helpers — para falar
// com a MESMA instância que a página usa ao chamar `toast.error(...)`.
import { toast } from "sonner";
import { AriaLiveProvider } from "@/components/a11y";
import MagicUp from "@/pages/tools/MagicUp";

const mocks = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  invokeExternalRpc: vi.fn(),
  dbInvoke: vi.fn(),
  invokeEdge: vi.fn(),
  searchCrm: vi.fn(),
}));

vi.mock("@/lib/external-db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/external-db")>()),
  fetchPromobrindProducts: mocks.fetchProducts,
}));

vi.mock("@/lib/external-rpc", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/external-rpc")>()),
  invokeExternalRpc: mocks.invokeExternalRpc,
}));

vi.mock("@/lib/db/postgrest", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/postgrest")>()),
  dbInvoke: mocks.dbInvoke,
}));

vi.mock("@/lib/edge/safeInvokeCall", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/edge/safeInvokeCall")>()),
  invokeEdge: mocks.invokeEdge,
}));

vi.mock("@/lib/crm-db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/crm-db")>()),
  searchCrm: mocks.searchCrm,
}));

/** Produto de exemplo devolvido pelo catálogo externo. */
const PRODUCT = {
  id: "prod-caneta",
  name: "Caneta Metal Premium",
  sku: "CAN-001",
  images: [],
  primary_image_url: "https://cdn.example.com/caneta.png",
  og_image_url: null,
};

/** Erro seguro (sanitizeError) exibido ao usuário quando a geração falha. */
const GENERIC_ERROR = "Operação não pôde ser concluída. Tente novamente em instantes.";

const PROMPT = "Cenário corporativo premium";

type User = ReturnType<typeof userEvent.setup>;

/** userEvent sem delay artificial: o DOM da página é grande e o timeout padrão
 *  de teste do Vitest é 15s por caso. */
function setupUser() {
  return userEvent.setup({ delay: null });
}

function renderMagicUp() {
  return renderWithProviders(
    <AriaLiveProvider>
      <MagicUp />
    </AriaLiveProvider>,
  );
}

function generateButton() {
  return screen.getByRole("button", { name: /Gerar Imagem Publicitária/ });
}

/** Abre o combobox real e escolhe o produto de exemplo. */
async function selectProduct(user: User) {
  await user.click(screen.getByTestId("mockup-product-combobox-trigger"));
  const option = await screen.findByTestId(`mockup-product-option-${PRODUCT.id}`);
  await user.click(option);
  // O produto passa a contar no estado (o botão Gerar troca a dica de
  // "Selecione um produto" para "Envie o logo"). Evita query ambígua: o SKU
  // aparece tanto no combobox quanto no card do produto.
  await waitFor(() => expect(screen.getByText("Envie o logo")).toBeInTheDocument());
}

/** Envia o logo pelo input real do card "Logo do Cliente". */
async function uploadLogo() {
  const input = document.getElementById("magic-logo-upload") as HTMLInputElement;
  const file = new File(["logo-bytes"], "logo.png", { type: "image/png" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
  // FileReader lê o arquivo e preenche o preview de forma assíncrona.
  await waitFor(() => expect(screen.getByAltText("Logo")).toBeInTheDocument());
}

/** Digita o prompt/cenário no textarea real. */
async function typePrompt() {
  fireEvent.change(screen.getByPlaceholderText(/A pessoa deve estar sorrindo/i), {
    target: { value: PROMPT },
  });
}

async function configure(user: User) {
  await selectProduct(user);
  await uploadLogo();
  await typePrompt();
  await waitFor(() => expect(generateButton()).toBeEnabled());
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchProducts.mockResolvedValue([PRODUCT]);
  mocks.invokeExternalRpc.mockResolvedValue({ product_id: PRODUCT.id, locations: [] });
  mocks.dbInvoke.mockResolvedValue({ records: [], count: 0 });
  mocks.searchCrm.mockResolvedValue([]);
  mocks.invokeEdge.mockResolvedValue({
    data: { imageUrl: "https://cdn.example.com/gerada.png", model: "magic-up-pro" },
    error: null,
  });
});

describe("MagicUp — fluxo real da página", () => {
  it("habilita 'Gerar' só quando produto, logo e prompt estão configurados", async () => {
    const user = setupUser();
    renderMagicUp();
    await screen.findByTestId("mockup-product-combobox-trigger");

    // Nada configurado: botão desabilitado + dica do que falta.
    expect(generateButton()).toBeDisabled();
    expect(screen.getByText("Selecione um produto")).toBeInTheDocument();

    // Produto sozinho não basta.
    await selectProduct(user);
    expect(generateButton()).toBeDisabled();
    expect(screen.getByText("Envie o logo")).toBeInTheDocument();

    // Produto + logo ainda não basta — falta o prompt.
    await uploadLogo();
    expect(generateButton()).toBeDisabled();
    expect(screen.getByText("Escolha um cenário")).toBeInTheDocument();

    // Produto + logo + prompt: agora sim.
    await typePrompt();
    await waitFor(() => expect(generateButton()).toBeEnabled());
    expect(screen.queryByText("Selecione um produto")).not.toBeInTheDocument();
    expect(screen.queryByText("Envie o logo")).not.toBeInTheDocument();
    expect(screen.queryByText("Escolha um cenário")).not.toBeInTheDocument();
  });

  it("gera a imagem pelo fluxo real e exibe o resultado", async () => {
    const user = setupUser();
    renderMagicUp();
    await screen.findByTestId("mockup-product-combobox-trigger");
    await configure(user);

    await user.click(generateButton());

    await waitFor(() =>
      expect(mocks.invokeEdge).toHaveBeenCalledWith("generate-ad-image", expect.any(Object)),
    );
    const [fnName, call] = mocks.invokeEdge.mock.calls[0] as [
      string,
      { body: Record<string, unknown> },
    ];
    expect(fnName).toBe("generate-ad-image");
    expect(call.body).toMatchObject({
      productImageUrl: PRODUCT.primary_image_url,
      productName: PRODUCT.name,
      scenePrompt: PROMPT,
      imageModel: "pro",
    });

    // A variação gerada é renderizada no painel de resultado.
    const result = await screen.findByAltText(`Imagem publicitária - ${PRODUCT.name}`);
    expect(result).toHaveAttribute("src", "https://cdn.example.com/gerada.png");
  });

  it("mostra o erro da geração e não fabrica um resultado de sucesso", async () => {
    const user = setupUser();
    // O hook loga `generate_failed` em nível error (telemetria intencional do
    // produto) e o structuredLogger escreve isso em `console.error`. O modo
    // estrito conta console.error não interceptado como falha do teste, então
    // interceptamos AQUI — e usamos o spy para provar que a falha foi
    // registrada, não engolida.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const toastError = vi.spyOn(toast, "error");
    mocks.invokeEdge.mockRejectedValueOnce(new Error("edge indisponível"));
    renderMagicUp();
    await screen.findByTestId("mockup-product-combobox-trigger");
    await configure(user);

    await user.click(generateButton());

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Erro ao gerar imagem", {
        description: GENERIC_ERROR,
      }),
    );

    // A falha foi registrada na telemetria (spy do console.error).
    await waitFor(() => {
      const logged = errorSpy.mock.calls.map((args) => String(args[0])).join("\n");
      expect(logged).toContain("generate_failed");
    });

    // Sem imagem fabricada: o painel segue no estado vazio.
    expect(screen.getByText("Sua imagem aparecerá aqui")).toBeInTheDocument();
    expect(
      screen.queryByAltText(`Imagem publicitária - ${PRODUCT.name}`),
    ).not.toBeInTheDocument();
  });
});
