/**
 * E2E — /mockup-generator: fluxo de upload de logo (bloqueio → liberação) e geração.
 *
 * Seletores conferidos nos componentes atuais (git grep data-testid):
 *  - mockup-client-search-input / mockup-client-option- / mockup-client-chip
 *      -> src/components/mockup/MockupClientSelector.tsx
 *  - seletor de produto: dialog "Selecione o Produto" + cartões [role="button"]
 *      -> src/components/mockup/MockupProductSelector.tsx (+ MockupColorSelector.tsx)
 *  - mockup-technique-select-trigger -> src/components/mockup/MockupConfigPanel.tsx
 *  - input[data-testid^="mockup-logo-upload-input-"] e img[alt="Miniatura do logo enviado"]
 *      -> src/components/mockup/AreaCard.tsx
 *  - img[alt="Logo para personalização"] -> src/components/mockup/logo-editor/LogoPreviewCanvas.tsx
 *  - botões "Gerar Layout" e "Gerar Layout - IA"
 *      -> src/components/mockup/approval/MockupLayoutButtons.tsx
 *  - mockup-art-file-dropzone -> src/components/mockup/ArtFileUpload.tsx
 *  - generating-overlay -> src/components/mockup/GeneratingOverlay.tsx
 *  - mockup-result-card -> src/components/mockup/MockupResultCard.tsx
 *
 * NOTA: o seletor de produto desta rota é MockupProductSelector.tsx (dialog). O
 * data-testid "mockup-product-combobox-trigger" (ProductSearchCombobox.tsx) NÃO é
 * renderizado aqui — pertence ao Magic Up.
 *
 * Depende de dados do ambiente de teste: empresa no CRM (external-db-bridge) e
 * produto/técnica no catálogo. analyze-logo-colors e generate-mockup são mockados
 * aqui para o teste não depender das edge functions.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import type { Page } from "@playwright/test";
import { gotoAndSettle } from "../helpers/nav";
import path from "node:path";

const LOGO = path.resolve("public/images/promo-brindes-logo.png");
const LOGO_UPLOAD_INPUT = 'input[data-testid^="mockup-logo-upload-input-"]';
const LOGO_THUMB = 'img[alt="Miniatura do logo enviado"]';
const LOGO_PREVIEW = 'img[alt="Logo para personalização"]';
const SEM_LOGO_HINT = /Faça upload do logo para posicioná-lo/i;
const BOTAO_LAYOUT = /^Gerar Layout$/i;
const BOTAO_LAYOUT_IA = /Gerar Layout - IA/i;
const ROTA_ANALYZE_COLORS = /\/functions\/v1\/analyze-logo-colors(\?|$|\/)/;
const ROTA_GENERATE_MOCKUP = /\/functions\/v1\/generate-mockup(\?|$|\/)/;
const MOCKUP_URL = "https://example.com/mockup.png";

/** Clica no seletor de empresa e escolhe o primeiro registro do CRM. */
async function selecionarCliente(page: Page): Promise<string> {
  await page.getByTestId("mockup-client-search-input").click();
  const opcao = page.locator('[data-testid^="mockup-client-option-"]').first();
  await opcao.waitFor({ state: "visible", timeout: 15000 });
  const nome = (await opcao.locator("span").first().innerText()).trim();
  await opcao.click();
  return nome;
}

/** Seleciona o primeiro produto no MockupProductSelector e confirma a cor. */
async function selecionarPrimeiroProduto(page: Page): Promise<string> {
  await page.getByRole("button", { name: /Buscar produto/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /Selecione o Produto/i })).toBeVisible();

  const cartao = dialog.locator('[role="button"]').first();
  await expect(cartao).toBeVisible({ timeout: 15000 });
  const nome = (await cartao.locator("h4").first().innerText()).trim();
  await cartao.click();

  // Com variantes o MockupColorSelector pede a cor; sem variantes ele seleciona sozinho.
  const variante = page.getByRole("button", { name: /un$|Estoque zerado/ }).first();
  const selecionado = page.getByLabel("Remover produto selecionado");
  await expect(variante.or(selecionado).first()).toBeVisible({ timeout: 15000 });
  // isVisible() não lança para locator inexistente: devolve false quando o produto
  // não tem variantes e o próprio componente já confirmou a seleção.
  if (await variante.isVisible()) {
    await variante.click();
  }
  await expect(selecionado).toBeVisible({ timeout: 10000 });
  return nome;
}

/** Seleciona a primeira técnica compatível e devolve o nome dela. */
async function selecionarTecnica(page: Page): Promise<string> {
  await page.getByTestId("mockup-technique-select-trigger").click();
  const opcao = page.locator('[role="option"]').first();
  await expect(opcao).toBeVisible({ timeout: 15000 });
  const nome = (await opcao.locator("span").first().innerText()).trim();
  await opcao.click();
  await expect(page.getByTestId("mockup-technique-select-trigger")).toContainText(nome);
  return nome;
}

/** Preenche empresa + produto + técnica e envia o logo na 1ª área de personalização. */
async function preencherComLogo(page: Page): Promise<void> {
  const cliente = await selecionarCliente(page);
  await expect(page.getByTestId("mockup-client-chip")).toContainText(cliente);

  await selecionarPrimeiroProduto(page);
  await selecionarTecnica(page);

  await page.locator(LOGO_UPLOAD_INPUT).first().setInputFiles(LOGO);
  await expect(page.locator(LOGO_PREVIEW)).toBeVisible();
}

test.describe("Mockup Module Upload Flow and Validations", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    // A análise de cor da logo é best-effort no produto: mockada para o teste não
    // depender da edge function nem gerar erro de console.
    await page.route(ROTA_ANALYZE_COLORS, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ colors: [] }),
      }),
    );
    await gotoAndSettle(page, "/mockup-generator");
  });

  test("blocks the layout CTAs until a logo is uploaded, then enables them", async ({ page }) => {
    const cliente = await selecionarCliente(page);
    await expect(page.getByTestId("mockup-client-chip")).toContainText(cliente);

    const produto = await selecionarPrimeiroProduto(page);
    const tecnica = await selecionarTecnica(page);

    const gerarLayout = page.getByRole("button", { name: BOTAO_LAYOUT });
    const gerarLayoutIa = page.getByRole("button", { name: BOTAO_LAYOUT_IA });

    // Sem logo: os CTAs existem, mas ficam desabilitados e o preview pede o upload.
    await expect(gerarLayout).toBeVisible();
    await expect(gerarLayoutIa).toBeVisible();
    await expect(gerarLayout).toBeDisabled();
    await expect(gerarLayoutIa).toBeDisabled();
    await expect(page.getByText(SEM_LOGO_HINT)).toBeVisible();
    await expect(page.locator(LOGO_PREVIEW)).toHaveCount(0);

    // Upload do logo na primeira área de personalização.
    await page.locator(LOGO_UPLOAD_INPUT).first().setInputFiles(LOGO);

    // Estado visível: miniatura na área + logo posicionado no preview.
    await expect(page.locator(LOGO_THUMB)).toBeVisible();
    await expect(page.locator(LOGO_PREVIEW)).toBeVisible();
    await expect(page.getByText(SEM_LOGO_HINT)).toHaveCount(0);

    // Com logo: os dois CTAs liberam.
    await expect(gerarLayout).toBeEnabled();
    await expect(gerarLayoutIa).toBeEnabled();

    // As seleções anteriores continuam visíveis (estado, não só o body).
    await expect(page.getByLabel("Remover produto selecionado")).toBeVisible();
    await expect(page.getByText(produto, { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("mockup-technique-select-trigger")).toContainText(tecnica);
  });

  test("generates the mockup through the mocked IA route and shows the result card", async ({
    page,
  }) => {
    await preencherComLogo(page);

    await page.route(ROTA_GENERATE_MOCKUP, async (route) => {
      // Pequeno atraso para o overlay de geração ser observável.
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, mockupUrl: MOCKUP_URL, mockup_url: MOCKUP_URL }),
      });
    });

    await page.getByRole("button", { name: BOTAO_LAYOUT_IA }).click();

    await expect(page.getByTestId("generating-overlay")).toBeVisible();

    const card = page.getByTestId("mockup-result-card");
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card.locator(`img[src="${MOCKUP_URL}"]`)).toBeVisible();
    await expect(card.getByRole("button", { name: /Baixar/i })).toBeVisible();
  });

  test("art-file dropzone rejects a non-vector file without attaching it", async ({ page }) => {
    const dropzone = page.getByTestId("mockup-art-file-dropzone");
    await expect(dropzone).toBeVisible();

    // PNG não é vetorial: ArtFileUpload recusa por extensão antes de subir ao storage.
    await dropzone.locator('input[type="file"]').setInputFiles(LOGO);

    await expect(page.getByText(/formato não suportado/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Remover arquivo/ })).toHaveCount(0);
  });
});
