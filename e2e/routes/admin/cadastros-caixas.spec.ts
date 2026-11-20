/**
 * /admin/cadastros?tab=caixas — cadastro de caixas de transporte (shipping_boxes).
 *
 * REST 100% mockado com `page.route()`: este spec roda contra o banco de
 * produção depois do merge e NUNCA pode gravar nele. Criar, editar, excluir e
 * restaurar são cobertos pelos testes unitários da aba; aqui se confere que a
 * rota abre na aba certa e lista o que o banco devolve.
 */
import type { Page } from "@playwright/test";
import { test, expect, requireAuth } from "../../fixtures/test-base";
import { gotoAndSettle } from "../../helpers/nav";
import { buildAuthedRouteSuite } from "../_factories";
import { waitRouteReady } from "../_shared";

const PATH = "/admin/cadastros?tab=caixas";
const BOXES_ROUTE = /\/rest\/v1\/shipping_boxes(\?|$)/;

/**
 * Caixa de exemplo (medidas da caixa P). Interna = externa − 2 × 3 mm de
 * parede: 27 − 0,6 = 26,4 cm e 33 − 0,6 = 32,4 cm.
 */
const BOX = {
  id: "00000000-0000-4000-8000-0000000000c1",
  code: "E2E",
  name: "Caixa de exemplo do E2E",
  outer_height_cm: 27,
  outer_width_cm: 33,
  outer_length_cm: 33,
  wall_thickness_mm: 3,
  inner_height_cm: 26.4,
  inner_width_cm: 32.4,
  inner_length_cm: 32.4,
  empty_weight_g: 0,
  max_weight_g: 10000,
  fill_factor: 0.9,
  is_active: true,
  sort_order: 0,
  created_at: "2026-11-19T21:30:00Z",
  updated_at: "2026-11-19T21:30:00Z",
  deleted_at: null,
};

buildAuthedRouteSuite({
  name: PATH,
  path: PATH,
  primary: { kind: "rest", key: "shipping_boxes", successBody: [BOX] },
});

/** GET devolve a caixa de exemplo (lixeira vazia); qualquer escrita é recusada aqui mesmo. */
async function mockShippingBoxes(page: Page) {
  const writes: string[] = [];
  await page.route(BOXES_ROUTE, async route => {
    const request = route.request();
    if (request.method() !== "GET") {
      writes.push(request.method());
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ message: "escrita não mockada" }) });
      return;
    }
    const trash = request.url().includes("deleted_at=not.is.null");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(trash ? [] : [BOX]) });
  });
  return writes;
}

test.describe("[module:admin] [component:cadastros-tab-caixas] [owner:team-growth] @regression route:/admin/cadastros?tab=caixas listagem", () => {
  test.beforeEach(() => requireAuth());

  test("@critical abre na aba Caixas de transporte e lista a caixa devolvida pelo banco", async ({ page }) => {
    const writes = await mockShippingBoxes(page);
    await gotoAndSettle(page, PATH);
    await waitRouteReady(page);

    // O AdminRoute só libera gestor com MFA em AAL2; sem isso o teste é pulado com o motivo.
    const tab = page.getByRole("tab", { name: /Caixas de transporte/ });
    const opened = await tab.waitFor({ state: "visible", timeout: 10_000 }).then(
      () => true,
      () => false,
    );
    if (!opened) {
      const denied = await page.getByTestId("app-access-denied").isVisible().catch(() => false);
      const mfaDialog = await page.getByRole("dialog").first().isVisible().catch(() => false);
      const loggedOut = /\/(login|auth)(\/|\?|$)/.test(page.url());
      test.skip(denied || mfaDialog || loggedOut, "usuário do E2E sem acesso de gestor com MFA: /admin/cadastros não abre");
    }

    await expect(tab).toHaveAttribute("data-state", "active");
    const row = page.getByTestId(`admin-row-${BOX.id}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(BOX.code);
    await expect(row).toContainText(BOX.name);
    expect(writes).toHaveLength(0);
  });
});
