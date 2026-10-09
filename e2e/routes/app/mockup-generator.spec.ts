/**
 * Rota: /mockup-generator — gerador de mockups (compositor determinístico).
 * Suíte padrão + cenários críticos de formulário, geração e histórico.
 *
 * Seletores usados aqui foram conferidos nos componentes atuais (git grep data-testid):
 *  - mockup-client-search-input / mockup-client-option- / mockup-client-chip
 *      -> src/components/mockup/MockupClientSelector.tsx
 *  - mockup-technique-select-trigger                  -> src/components/mockup/MockupConfigPanel.tsx
 *  - input[data-testid^="mockup-logo-upload-input-"]  -> src/components/mockup/AreaCard.tsx
 *  - generating-overlay                               -> src/components/mockup/GeneratingOverlay.tsx
 *  - botão "Gerar Layout - IA"                        -> src/components/mockup/approval/MockupLayoutButtons.tsx
 *  - img[alt="Logo para personalização"]              -> src/components/mockup/logo-editor/LogoPreviewCanvas.tsx
 *  - "Nenhum mockup gerado ainda"                     -> src/components/mockup/MockupHistoryPanel.tsx
 *
 * NOTA: o seletor de produto da página vive em MockupProductSelector.tsx (dialog
 * "Selecione o Produto" + cartões com [role="button"]). O ProductSearchCombobox
 * (data-testid="mockup-product-combobox-trigger") NÃO é renderizado nesta rota —
 * ele é usado apenas no MagicUp.
 */
import { test, expect, requireAuth } from "../../fixtures/test-base";
import type { Page } from "@playwright/test";
import path from "node:path";
import { buildAuthedRouteSuite } from "../_factories";
import { gotoAndSettle } from "../../helpers/nav";
import { waitRouteReady } from "../_shared";

buildAuthedRouteSuite({
  name: "/mockup-generator",
  path: "/mockup-generator",
  primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } },
});

// ---------------------------------------------------------------------------
// Helpers — fluxo real do formulário (componentes atuais)
// ---------------------------------------------------------------------------

const LOGO = path.resolve("public/images/promo-brindes-logo.png");
const LOGO_IMG = 'img[alt="Logo para personalização"]';
const BOTAO_IA = /Gerar Layout - IA/i;
const ROTA_GENERATE_MOCKUP = /\/functions\/v1\/generate-mockup(\?|$|\/)/;

/**
 * Seleciona o primeiro produto no MockupProductSelector e confirma a cor.
 * Devolve o nome do produto selecionado.
 */
async function selecionarPrimeiroProduto(page: Page): Promise<string> {
  await page.getByRole("button", { name: /Buscar produto/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /Selecione o Produto/i })).toBeVisible();

  const cartao = dialog.locator('[role="button"]').first();
  await expect(cartao).toBeVisible({ timeout: 15000 });
  const nome = (await cartao.locator("h4").first().innerText()).trim();
  await cartao.click();

  // MockupColorSelector: com variantes pede a escolha da cor; sem variantes o
  // próprio componente seleciona o produto (useEffect em MockupColorSelector.tsx).
  const variante = page.getByRole("button", { name: /un$|Estoque zerado/ }).first();
  const selecionado = page.getByLabel("Remover produto selecionado");
  await expect(variante.or(selecionado).first()).toBeVisible({ timeout: 15000 });
  // count() não lança (0 = produto já selecionado sem variantes), então não
  // esconde falha nenhuma: só evita clicar num botão que pode não existir.
  if ((await variante.count()) > 0) {
    await variante.click();
  }
  await expect(selecionado).toBeVisible({ timeout: 10000 });
  return nome;
}

/** Preenche empresa, produto, técnica e logo; devolve o nome do produto. */
async function preencherGerador(page: Page): Promise<string> {
  await page.getByTestId("mockup-client-search-input").click();
  await page.locator('[data-testid^="mockup-client-option-"]').first().click();
  await expect(page.getByTestId("mockup-client-chip")).toBeVisible();

  const produto = await selecionarPrimeiroProduto(page);

  await page.getByTestId("mockup-technique-select-trigger").click();
  await page.locator('[role="option"]').first().click();

  await page
    .locator('input[data-testid^="mockup-logo-upload-input-"]')
    .first()
    .setInputFiles(LOGO);
  await expect(page.locator(LOGO_IMG)).toBeVisible();

  // Só com produto + técnica + logo o CTA de geração fica habilitado.
  await expect(page.getByRole("button", { name: BOTAO_IA })).toBeEnabled();
  return produto;
}

// ---------------------------------------------------------------------------
// Cenários específicos do gerador de mockup
// ---------------------------------------------------------------------------

test.describe("/mockup-generator — fluxos críticos", () => {
  test.beforeEach(() => requireAuth());

  test("happy: formulário real do gerador carrega (empresa, produto, técnica)", async ({ page }) => {
    await gotoAndSettle(page, "/mockup-generator");
    await waitRouteReady(page);
    await expect(page.getByTestId("mockup-client-search-input")).toBeVisible();
    await expect(page.getByRole("button", { name: /Buscar produto/i })).toBeVisible();
    await expect(page.getByTestId("mockup-technique-select-trigger")).toBeVisible();
  });

  test("erro do gerador (500): a geração é chamada e o erro aparece na tela", async ({ page }) => {
    let chamadas = 0;
    await page.route(ROTA_GENERATE_MOCKUP, async (route) => {
      chamadas += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "internal_server_error" }),
      });
    });
    await gotoAndSettle(page, "/mockup-generator");
    await waitRouteReady(page);
    await preencherGerador(page);

    await page.getByRole("button", { name: BOTAO_IA }).click();

    // Prova de que a geração FOI chamada — sem isso o cenário não testa nada.
    await expect.poll(() => chamadas, { timeout: 15000 }).toBeGreaterThan(0);
    // Erro controlado visível (Alert "Erro na geração"), não só o body.
    await expect(page.getByText("Erro na geração")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/internal_server_error/i).first()).toBeVisible();
    // A tela não trava: o overlay some e o botão volta a ficar habilitado.
    await expect(page.getByTestId("generating-overlay")).toBeHidden();
    await expect(page.getByRole("button", { name: BOTAO_IA })).toBeEnabled();
  });

  test("timeout de geração (504): a geração é chamada, o overlay aparece e o erro é controlado", async ({
    page,
  }) => {
    let chamadas = 0;
    await page.route(ROTA_GENERATE_MOCKUP, async (route) => {
      chamadas += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 504,
        contentType: "application/json",
        body: JSON.stringify({ error: "gateway_timeout" }),
      });
    });
    await gotoAndSettle(page, "/mockup-generator");
    await waitRouteReady(page);
    await preencherGerador(page);

    await page.getByRole("button", { name: BOTAO_IA }).click();

    await expect(page.getByTestId("generating-overlay")).toBeVisible();
    // Falha se a geração não for chamada.
    await expect.poll(() => chamadas, { timeout: 15000 }).toBeGreaterThan(0);
    // 504 é transitório: mockupGenerationService faz 1 retry com backoff de 2s.
    await expect(page.getByText(/gateway_timeout/i).first()).toBeVisible({ timeout: 25000 });
    await expect(page.getByTestId("generating-overlay")).toBeHidden();
    await expect(page.getByRole("button", { name: BOTAO_IA })).toBeEnabled();
  });

  test("histórico de mockups: lista vazia renderiza o empty state da aba", async ({ page }) => {
    await page.route(/\/rest\/v1\/generated_mockups(\?|$)/, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await gotoAndSettle(page, "/mockup-generator");
    await waitRouteReady(page);
    await page.getByRole("tab", { name: /Histórico/i }).click();
    await expect(page.getByText("Nenhum mockup gerado ainda")).toBeVisible();
  });

  test("@mobile: mockup generator não tem overflow horizontal em 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAndSettle(page, "/mockup-generator");
    await waitRouteReady(page);
    await expect(page.getByTestId("mockup-client-search-input")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(overflow).toBe(false);
  });
});
