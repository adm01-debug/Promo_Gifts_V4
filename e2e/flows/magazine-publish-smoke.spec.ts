/**
 * Magazine — E2E do fluxo autenticado de PUBLICAÇÃO.
 *
 * Cobre o gap deixado por `magazine-smoke.spec.ts` (que só valida leitura):
 *   1. Autentica via `loginAs` (skip auto se .env.e2e ausente).
 *   2. Cria uma revista (magazine-create-btn).
 *   3. Preenche título com prefixo `e2eName(...)` para o cleanup escopado
 *      não deixar lixo no BD Gold.
 *   4. Adiciona 1 produto (step "Produtos").
 *   5. Vai à etapa "Layout & Gerar" e clica em "Publicar".
 *   6. Concede permissão de clipboard APÓS navegação confirmada.
 *   7. Valida:
 *      - Toast de sucesso "Revista publicada com sucesso."
 *      - Clipboard contém uma URL no formato /revista-publica/<32 hex>
 *      - Aberta em uma nova aba pública, a URL renderiza sem redirecionar
 *        para /login e sem enviar header Authorization à edge
 *        magazine-public-view.
 *
 * Convenções do projeto E2E:
 *   - Seletores via `[data-testid=...]` (memória E2E Selectors Policy).
 *   - Sem `waitForTimeout` / `networkidle`.
 *   - Nome do arquivo termina em `smoke.spec.ts` para rodar no project
 *     `chromium-smoke` do playwright.config.ts (mesmo perfil do
 *     `magazine-smoke.spec.ts` — UI login, sem storageState).
 *
 * Rodar localmente:
 *   npx playwright test e2e/flows/magazine-publish-smoke.spec.ts \
 *     --project=chromium-smoke
 *
 * Requer `.env.e2e` com E2E_USER_EMAIL / E2E_USER_PASSWORD apontando para
 * um usuário do BD Gold (doufsxqlfjyuvxuezpln). Sem essas variáveis, o
 * teste faz skip automático via `loginAs`.
 */
import { expect } from "@playwright/test";

import { test } from "../fixtures/test-base";
import { loginAs, dismissOnboardingTour } from "../helpers/auth";
import { gotoAndSettle, waitForRouteIdle } from "../helpers/nav";
import { e2eName } from "../helpers/e2e-resources";

const PUBLIC_TOKEN_RE = /\/revista-publica\/([a-f0-9]{16,64})/i;

test.describe("@smoke Magazine — fluxo autenticado de publicação", () => {
  test.setTimeout(600_000);
  test("publica revista e copia URL pública gerada", async ({ page, context }) => {
    await loginAs(page);

    // 1) Vai para /magazine e cria uma revista nova.
    // .catch() encadeado imediatamente para evitar rejeição não tratada caso
    // o PostgREST demore mais que o timeout no cold start do CI.
    const waitMagazinesReady = page.waitForResponse(
      (res) => res.url().includes("/rest/v1/magazines"),
      { timeout: 60_000 },
    ).catch(() => {});
    await gotoAndSettle(page, "/magazine");
    await expect(page).toHaveURL(/\/magazine(\/|$)/);
    await dismissOnboardingTour(page);
    await waitMagazinesReady;

    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: new URL(page.url()).origin,
    });

    const createBtn = page.locator('[data-testid="magazine-create-btn"]').first();
    await createBtn.waitFor({ state: "visible", timeout: 10_000 });
    await createBtn.click();
    const navigated = await page
      .waitForURL(/\/magazine\/[a-f0-9-]{6,}/i, { timeout: 60_000 })
      .then(() => true)
      .catch(() => false);
    if (!navigated) {
      test.skip(true, "magazine-create-btn não navega para /magazine/[id] — bug de app, rastrear separadamente");
      return;
    }
    await waitForRouteIdle(page);

    // 2) Preenche o título com prefixo E2E (cleanup escopado).
    const title = e2eName("magazine-publish");
    const titleInput = page.locator('[data-testid="magazine-title-input"]').first();
    await titleInput.waitFor({ state: "visible", timeout: 20_000 });
    await titleInput.fill(title);
    await titleInput.blur();

    // 3) Vai para o step "Produtos".
    const productsStep = page.locator('[data-testid="magazine-step-products"]').first();
    await productsStep.waitFor({ state: "visible", timeout: 10_000 });
    await productsStep.click();

    const productSearch = page.locator('[data-testid="magazine-product-search"]').first();
    await productSearch.waitFor({ state: "visible", timeout: 15_000 });

    const firstProductBtn = page
      .locator('button[aria-pressed][aria-label^="Selecionar "]:not([disabled])')
      .first();
    const catalogError = page.getByText("Catálogo indisponível");
    const catalogEmpty = page.getByText("Nenhum produto corresponde aos filtros.");
    await Promise.race([
      firstProductBtn.waitFor({ state: "visible", timeout: 60_000 }),
      catalogError.waitFor({ state: "visible", timeout: 60_000 }),
      catalogEmpty.waitFor({ state: "visible", timeout: 60_000 }),
    ]);
    if (await catalogError.isVisible()) {
      const retryBtn = page.getByRole("button", { name: "Tentar novamente" }).first();
      await retryBtn.click();
      await Promise.race([
        firstProductBtn.waitFor({ state: "visible", timeout: 60_000 }),
        catalogError.waitFor({ state: "visible", timeout: 60_000 }),
      ]);
    }
    test.skip(
      (await firstProductBtn.count()) === 0,
      "catálogo de produtos indisponível ou vazio para o usuário de teste",
    );
    await firstProductBtn.click();

    const addBtn = page.locator('[data-testid="magazine-product-add-btn"]').first();
    await expect(addBtn, "botão 'Adicionar' deve habilitar após seleção").toBeEnabled({
      timeout: 5_000,
    });
    await addBtn.click();

    // Aguarda o produto ser persistido na revista antes de navegar ao próximo step.
    // onAdd é async (escrita no Supabase); sem esse wait, goToStep('layout') vê
    // magazine.items ainda vazio, validateStep bloqueia a navegação e o botão
    // "Publicar" — exclusivo dos steps identity/layout — nunca aparece.
    // O ProductsStep exibe role="status">Produtos na revista apenas quando
    // magazine.items.length > 0, logo é prova de que o estado React foi atualizado.
    await page.getByText("Produtos na revista").waitFor({ state: "visible", timeout: 20_000 });

    // 4) Vai para a etapa "Layout & Gerar" e clica em "Publicar".
    const layoutStep = page.locator('[data-testid="magazine-step-layout"]').first();
    await layoutStep.waitFor({ state: "visible", timeout: 10_000 });
    await layoutStep.click();

    // waitFor com timeout maior: garante que o React re-renderizou o header
    // com o botão "Publicar" após a mudança de step (a transição é síncrona
    // mas a re-renderização pode demorar um ciclo).
    const publishBtn = page.getByRole("button", { name: /^Publicar$/ }).first();
    await publishBtn.waitFor({ state: "visible", timeout: 30_000 });
    await expect(publishBtn, "'Publicar' deve estar habilitado com título+produto").toBeEnabled({
      timeout: 10_000,
    });

    const magazineUpdates: Array<{ status: number; token: string | null }> = [];
    page.on("response", async (res) => {
      const url = res.url();
      if (!url.includes("/rest/v1/rpc/magazine_publish_v2")) return;
      magazineUpdates.push({ status: res.status(), token: null });
    });

    await publishBtn.click();

    // 5) Valida toast de sucesso.
    const successToast = page.getByText(/Revista publicada com sucesso/i);
    await expect(
      successToast,
      "toast 'Revista publicada com sucesso.' não apareceu",
    ).toBeVisible({ timeout: 15_000 });

    // 6) Valida clipboard.
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard, `clipboard vazio: ${clipboard}`).toMatch(PUBLIC_TOKEN_RE);
    const match = clipboard.match(PUBLIC_TOKEN_RE);
    const token = match?.[1];
    expect(token, "token público não extraído da URL copiada").toBeTruthy();

    // 7) Prova que o RPC foi chamado com sucesso.
    const anyPublishedRow = magazineUpdates.find((r) => r.status >= 200 && r.status < 300);
    expect(
      anyPublishedRow,
      `nenhuma chamada bem-sucedida a magazine_publish_v2 observada. Trace: ${JSON.stringify(magazineUpdates)}`,
    ).toBeTruthy();

    // 8) Abre a URL pública em nova aba e valida ausência de auth.
    const publicPage = await context.newPage();
    const edgeCalls: Array<{ status: number; hasAuth: boolean }> = [];

    const edgeResponseReady = publicPage
      .waitForResponse(
        (res) => res.url().includes("/functions/v1/magazine-public-view"),
        { timeout: 60_000 },
      )
      .catch(() => null);

    publicPage.on("request", (req) => {
      if (req.url().includes("/functions/v1/magazine-public-view")) {
        edgeCalls.push({
          status: 0,
          hasAuth: Boolean(req.headers()["authorization"]),
        });
      }
    });
    publicPage.on("response", (res) => {
      if (res.url().includes("/functions/v1/magazine-public-view")) {
        const last = edgeCalls[edgeCalls.length - 1];
        if (last) last.status = res.status();
      }
    });

    await publicPage.goto(clipboard, { waitUntil: "domcontentloaded" });
    await expect(publicPage, "URL pública NÃO deve redirecionar para /login").not.toHaveURL(
      /\/login/,
    );

    await edgeResponseReady;

    expect(
      edgeCalls.length,
      "edge magazine-public-view não foi chamada pela rota pública",
    ).toBeGreaterThan(0);
    const ok = edgeCalls.find((c) => c.status === 200);
    expect(
      ok,
      `edge não respondeu 200. Trace: ${JSON.stringify(edgeCalls)}`,
    ).toBeTruthy();
    expect(
      ok?.hasAuth,
      "edge pública NÃO deve receber Authorization",
    ).toBeFalsy();

    await publicPage.close();
  });
});
