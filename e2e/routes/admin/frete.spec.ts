/**
 * /admin/frete — parâmetros globais de frete (linha única de freight_settings).
 *
 * REST 100% mockado com `page.route()`: este spec roda contra o banco de
 * produção depois do merge e NUNCA pode gravar nele. O GET devolve a linha de
 * exemplo abaixo e o PATCH fica só na memória do teste.
 */
import type { Page } from "@playwright/test";
import { test, expect, requireAuth } from "../../fixtures/test-base";
import { gotoAndSettle } from "../../helpers/nav";
import { buildAuthedRouteSuite } from "../_factories";
import { waitRouteReady } from "../_shared";

const PATH = "/admin/frete";
const SETTINGS_ROUTE = /\/rest\/v1\/freight_settings(\?|$)/;

/** A linha como nasce na migration 20261119213100. */
const ROW = {
  id: true,
  origin_cep: "03377-000",
  cubic_divisor_correios: 6000,
  cubic_divisor_rodoviario: 3333,
  default_fill_factor: 0.9,
  internal_buffer_days: 0,
  multi_personalization_rule: "max",
  updated_at: "2026-11-19T21:31:00Z",
  updated_by: null,
};

const NEW_DIVISOR = 5000;
const INCOMPLETE_CEP = "0337";

buildAuthedRouteSuite({
  name: PATH,
  path: PATH,
  // maybeSingle() busca como lista e confere a cardinalidade no cliente.
  primary: { kind: "rest", key: "freight_settings", successBody: [ROW] },
});

/** Guarda a linha em memória: o GET lê dela e o PATCH altera só ela. */
async function mockFreightSettings(page: Page) {
  const patches: Record<string, unknown>[] = [];
  const state: { row: Record<string, unknown>; patches: Record<string, unknown>[] } = { row: { ...ROW }, patches };
  await page.route(SETTINGS_ROUTE, async route => {
    const request = route.request();
    if (request.method() === "PATCH") {
      const patch: Record<string, unknown> = request.postDataJSON();
      state.patches.push(patch);
      state.row = { ...state.row, ...patch, updated_at: "2026-11-20T12:00:00Z" };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: true }]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([state.row]) });
  });
  return state;
}

/**
 * Abre a tela e devolve o formulário. O AdminRoute só libera gestor com MFA em
 * AAL2; quando o usuário do E2E não chega lá, o teste é pulado com o motivo.
 */
async function openFormOrSkip(page: Page) {
  await gotoAndSettle(page, PATH);
  await waitRouteReady(page);
  const form = page.getByTestId("freight-settings-form");
  const opened = await form.waitFor({ state: "visible", timeout: 10_000 }).then(
    () => true,
    () => false,
  );
  if (!opened) {
    const denied = await page.getByTestId("app-access-denied").isVisible().catch(() => false);
    const mfaDialog = await page.getByRole("dialog").first().isVisible().catch(() => false);
    const loggedOut = /\/(login|auth)(\/|\?|$)/.test(page.url());
    test.skip(denied || mfaDialog || loggedOut, "usuário do E2E sem acesso de gestor com MFA: /admin/frete não abre");
  }
  await expect(form).toBeVisible();
  return form;
}

test.describe("[module:admin] [component:frete] [owner:team-growth] @regression route:/admin/frete formulário", () => {
  test.beforeEach(() => requireAuth());

  test("@critical salvar 6000 → 5000 envia só o divisor e o valor continua após recarregar", async ({ page }) => {
    const state = await mockFreightSettings(page);
    const form = await openFormOrSkip(page);
    const divisor = form.getByLabel("Divisor de cubagem — Correios");
    const save = form.getByTestId("save-freight-settings");

    await expect(divisor).toHaveValue(String(ROW.cubic_divisor_correios));
    await expect(save).toBeDisabled();

    await divisor.fill(String(NEW_DIVISOR));
    await save.click();

    await expect.poll(() => state.patches.length).toBe(1);
    expect(state.patches[0]).toMatchObject({ cubic_divisor_correios: NEW_DIVISOR });
    // Só o campo alterado viaja (mais o updated_by que o serviço acrescenta).
    expect(Object.keys(state.patches[0]).sort()).toEqual(["cubic_divisor_correios", "updated_by"]);

    await page.reload();
    await waitRouteReady(page);
    await expect(page.getByLabel("Divisor de cubagem — Correios")).toHaveValue(String(NEW_DIVISOR));
  });

  test("@edge CEP incompleto bloqueia o salvar e nada é enviado", async ({ page }) => {
    const state = await mockFreightSettings(page);
    const form = await openFormOrSkip(page);

    await form.getByLabel("CEP de origem").fill(INCOMPLETE_CEP);
    await form.getByTestId("save-freight-settings").click();

    await expect(form.getByText("Informe o CEP completo, no formato 00000-000.")).toBeVisible();
    expect(state.patches).toHaveLength(0);
  });
});
