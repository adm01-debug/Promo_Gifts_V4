/**
 * Mockup Resilience and Error Handling — /mockup-generator
 *
 * Seletores conferidos nos componentes atuais (git grep data-testid):
 *  - mockup-client-search-input / mockup-client-option- / mockup-client-chip
 *      -> src/components/mockup/MockupClientSelector.tsx
 *  - seletor de produto: dialog "Selecione o Produto" + cartões [role="button"]
 *      -> src/components/mockup/MockupProductSelector.tsx (+ MockupColorSelector.tsx)
 *  - mockup-technique-select-trigger -> src/components/mockup/MockupConfigPanel.tsx
 *  - input[data-testid^="mockup-logo-upload-input-"] -> src/components/mockup/AreaCard.tsx
 *  - img[alt="Logo para personalização"] -> src/components/mockup/logo-editor/LogoPreviewCanvas.tsx
 *  - botão "Gerar Layout - IA" -> src/components/mockup/approval/MockupLayoutButtons.tsx
 *  - "Pos: N% × N%" / "Rot: N°" -> src/components/mockup/logo-editor/LogoSizeControls.tsx
 *  - generating-overlay / mockup-result-card -> GeneratingOverlay.tsx / MockupResultCard.tsx
 *
 * Depende de dados do ambiente de teste (empresa no CRM, produto e técnica no
 * catálogo) e de uma PNG de logo versionada em public/images/.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import type { Page } from "@playwright/test";
import { gotoAndSettle } from "../helpers/nav";
import path from "node:path";

const LOGO = path.resolve("public/images/promo-brindes-logo.png");
const LOGO_IMG = 'img[alt="Logo para personalização"]';
const BOTAO_IA = /Gerar Layout - IA/i;

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

  // Com variantes o componente pede a cor; sem variantes ele seleciona sozinho.
  const variante = page.getByRole("button", { name: /un$|Estoque zerado/ }).first();
  const selecionado = page.getByLabel("Remover produto selecionado");
  await expect(variante.or(selecionado).first()).toBeVisible({ timeout: 15000 });
  if (await variante.isVisible().catch(() => false)) {
    await variante.click();
  }
  await expect(selecionado).toBeVisible({ timeout: 10000 });
  return nome;
}

/** Seleciona empresa, produto e técnica (base dos cenários deste spec). */
async function preencherConfiguracao(page: Page): Promise<{ clientName: string; productName: string }> {
  await page.getByTestId("mockup-client-search-input").click();
  const clientOption = page.locator('[data-testid^="mockup-client-option-"]').first();
  await clientOption.waitFor({ state: "visible", timeout: 15000 });
  const clientName = (await clientOption.locator("span").first().innerText()).trim();
  await clientOption.click();
  await expect(page.getByTestId("mockup-client-chip")).toContainText(clientName);

  const productName = await selecionarPrimeiroProduto(page);

  await page.getByTestId("mockup-technique-select-trigger").click();
  await page.locator('[role="option"]').first().click();

  return { clientName, productName };
}

test.describe("Mockup Resilience and Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    await gotoAndSettle(page, "/mockup-generator");
  });

  test("should handle generation timeout and recover correctly", async ({ page }) => {
    // 1. Preenche o mínimo obrigatório
    await preencherConfiguracao(page);

    const fileInput = page.locator('input[data-testid^="mockup-logo-upload-input-"]').first();
    await fileInput.setInputFiles(LOGO);
    await expect(page.locator(LOGO_IMG)).toBeVisible();

    // 2. Simula timeout na geração (resposta lenta + 504)
    await page.route("**/functions/v1/generate-mockup", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 504,
        contentType: "application/json",
        body: JSON.stringify({ error: "IA service timeout" }),
      });
    });

    const generateBtn = page.getByRole("button", { name: BOTAO_IA });
    await generateBtn.click();

    // 3. Overlay de geração visível enquanto "espera"
    await expect(page.locator('[data-testid="generating-overlay"]')).toBeVisible();

    // 4. Mensagem de erro controlada (504 é transitório: 1 retry + backoff de 2s)
    await expect(page.getByText(/IA service timeout/i).first()).toBeVisible({ timeout: 20000 });

    // 5. Botão de gerar volta a ficar habilitado (a tela se recupera)
    await expect(generateBtn).toBeEnabled();
  });

  test("should persist configuration and position after page reload", async ({ page }) => {
    // 1. Preenche e ajusta a posição
    const { clientName, productName } = await preencherConfiguracao(page);

    const fileInput = page.locator('input[data-testid^="mockup-logo-upload-input-"]').first();
    await fileInput.setInputFiles(LOGO);
    await expect(page.locator(LOGO_IMG)).toBeVisible();

    // Move a logo para o centro
    const centerBtn = page.getByRole("button", { name: /^Centro$/i });
    await centerBtn.click();
    await expect(page.getByText(/Pos: 50% × 50%/i)).toBeVisible();

    // Rotaciona +15
    await page.getByRole("button", { name: "+15°" }).click();
    await expect(page.getByText(/Rot: 15°/i)).toBeVisible();

    // 2. Espera o auto-save (debounce de 2000ms)
    await page.waitForTimeout(3000);

    // 3. Recarrega
    await page.reload();
    await expect(page.getByText(/Rascunho restaurado/i)).toBeVisible();

    // 4. Confere o estado persistido (empresa, produto, logo, posição e rotação)
    await expect(page.getByTestId("mockup-client-chip")).toContainText(clientName);
    await expect(page.getByText(productName, { exact: true }).first()).toBeVisible();
    await expect(page.locator(LOGO_IMG)).toBeVisible();
    await expect(page.getByText(/Pos: 50% × 50%/i)).toBeVisible();
    await expect(page.getByText(/Rot: 15°/i)).toBeVisible();
  });

  test("should allow retry after failure without losing selections", async ({ page }) => {
    // 1. Preenche o mínimo obrigatório
    await preencherConfiguracao(page);
    await page
      .locator('input[data-testid^="mockup-logo-upload-input-"]')
      .first()
      .setInputFiles(LOGO);

    // 2. 1ª chamada falha, 2ª sucede
    let callCount = 0;
    await page.route("**/functions/v1/generate-mockup", async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Temporary IA failure" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          // A edge real devolve camelCase (lido pelo frontend) e snake_case.
          body: JSON.stringify({
            ok: true,
            mockupUrl: "https://example.com/mockup.png",
            mockup_url: "https://example.com/mockup.png",
          }),
        });
      }
    });

    const generateBtn = page.getByRole("button", { name: BOTAO_IA });

    // Primeira tentativa — erro visível
    await generateBtn.click();
    await expect(page.getByText(/Temporary IA failure/i).first()).toBeVisible();

    // As seleções continuam na tela
    await expect(page.getByTestId("mockup-client-chip")).toBeVisible();

    // Segunda tentativa — resultado na tela
    await generateBtn.click();
    await expect(page.getByTestId("mockup-result-card")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('img[src="https://example.com/mockup.png"]')).toBeVisible();
  });

  test("should show skeletons during data loading deterministically", async ({ page }) => {
    // 1. Simula fetch lento das técnicas
    await page.route("**/rest/v1/tabela_preco_gravacao_oficial*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });

    // 2. Recarrega para observar o estado de loading
    await page.reload();

    // 3. Skeleton/spinner do painel aparece (MockupConfigPanel.tsx / MockupGenerator.tsx)
    await expect(page.locator(".animate-spin").first()).toBeVisible();

    // 4. Depois de carregar, o formulário real está pronto
    await expect(page.locator(".animate-spin")).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByTestId("mockup-client-search-input")).toBeVisible();
  });
});
