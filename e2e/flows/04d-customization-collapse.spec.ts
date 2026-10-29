/**
 * E2E — Colapso do ConfigurationPanelV6 (gravação).
 *
 * Cobre:
 *  - Toggle colapsa/expande a região (aria-expanded, aria-hidden/inert).
 *  - Persistência após reload (localStorage v1).
 *  - Navegação via teclado (Enter / Space) com foco gerenciado.
 *  - Emissão de evento de analytics (`panel_collapsed` / `panel_expanded`)
 *    com `technique_id` correto via clique e teclado. O logger
 *    `createClientLogger` escreve um JSON estruturado em `console.info` no
 *    bundle de dev, então capturamos `page.on('console')` para asserts.
 *
 * Um fixture E2E intercepta catálogo e RPC para preparar o produto sem depender
 * de seed comercial ou gravar dados operacionais no banco.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { openQuoteWithPersonalizableProduct } from "../helpers/location-panel-quote";
import { TID } from "../fixtures/selectors";

const TOGGLE = TID("customization-collapse-toggle");

interface AnalyticsEvent {
  event: string;
  technique_id?: string;
  state?: string;
}

test.describe("ConfigurationPanelV6 — colapso", () => {
  test.beforeEach(() => requireAuth());

  test("colapsa, persiste, navega por teclado e emite analytics", async ({ page }) => {
    const events: AnalyticsEvent[] = [];
    page.on("console", async (msg) => {
      if (!msg.text().includes("customization.collapsePrefs")) return;
      // Em DEV o logger chama console.info(tag, payload): o payload chega como
      // argumento estruturado separado, não necessariamente dentro de text().
      const args = await Promise.all(msg.args().map((arg) => arg.jsonValue().catch(() => null)));
      const payload = args.find(
        (value): value is AnalyticsEvent =>
          !!value && typeof value === "object" && "event" in value && "technique_id" in value,
      );
      if (payload) events.push(payload);
    });

    await openQuoteWithPersonalizableProduct(page);

    const toggle = page.locator(TOGGLE).first();
    await expect(toggle).toBeVisible();

    const controlsId = await toggle.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    const region = page.locator(`#${controlsId}`);
    const shell = page.locator('[data-testid="customization-config-shell"]').first();

    // 1) Clique → colapsa + evento panel_collapsed.
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(region).toHaveAttribute("aria-hidden", "true");
    await expect(region).toHaveAttribute("inert", "");
    await expect(shell).not.toHaveClass(/min-h-\[260px\]/);

    // 2) Reload preserva o estado.
    await page.reload({ waitUntil: "domcontentloaded" });
    // O rascunho não restaura produtos em memória; recria a mesma combinação
    // deterministicamente e valida a preferência de colapso persistida.
    await openQuoteWithPersonalizableProduct(page);
    const toggleAfter = page.locator(TOGGLE).first();
    await expect(toggleAfter).toBeVisible({ timeout: 10_000 });
    await expect(toggleAfter).toHaveAttribute("aria-expanded", "false");

    // 3) Teclado: Enter expande, Space recolhe.
    await toggleAfter.focus();
    await expect(toggleAfter).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(toggleAfter).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Space");
    await expect(toggleAfter).toHaveAttribute("aria-expanded", "false");

    // 4) Analytics — pelo menos um collapsed e um expanded, todos com mesmo technique_id.
    await expect
      .poll(() => events.filter((e) => e.event === "panel_collapsed").length, { timeout: 3_000 })
      .toBeGreaterThanOrEqual(1);
    await expect
      .poll(() => events.filter((e) => e.event === "panel_expanded").length, { timeout: 3_000 })
      .toBeGreaterThanOrEqual(1);

    const techniqueIds = new Set(events.map((e) => e.technique_id).filter(Boolean));
    expect(techniqueIds.size).toBe(1);
    const [techniqueId] = [...techniqueIds];
    expect(techniqueId).toBeTruthy();

    for (const e of events) {
      if (e.event === "panel_collapsed") expect(e.state).toBe("collapsed");
      if (e.event === "panel_expanded") expect(e.state).toBe("expanded");
    }
  });
});
