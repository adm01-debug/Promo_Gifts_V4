/**
 * Magazine Editor — preview da capa alinhado ao Hero e sticky no scroll (xl+).
 *
 * Valida:
 *  1. No load inicial (viewport xl), o topo do `magazine-preview-aside` bate
 *     com o topo da coluna principal do workspace (`magazine-editor-main-col`,
 *     diferença < 4px) — Blue Premium: o stage A4 é a coluna central do grid
 *     de 3 painéis da etapa Identidade, abaixo do header/stepper.
 *  2. Ao rolar a página, o preview permanece pinned (top ≈ 8px, i.e. `top-2`)
 *     e NÃO desce com o scroll — comportamento sticky.
 *
 * Se não houver revistas na conta de teste, o spec faz skip silencioso —
 * a página lista pode estar vazia em ambientes de dev.
 */
import { expect } from "@playwright/test";

import { test } from "../fixtures/test-base";
import { loginAs } from "../helpers/auth";
import { gotoAndSettle } from "../helpers/nav";

const XL_VIEWPORT = { width: 1440, height: 900 };

test.describe("@smoke Magazine Editor — preview sticky/aligned", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(XL_VIEWPORT);
    await loginAs(page);
  });

  test("preview alinha com hero e permanece sticky ao scrollar (xl+)", async ({ page }) => {
    await gotoAndSettle(page, "/magazine");

    // Encontra o primeiro card de revista. Se não houver, skip.
    const firstCard = page.locator('[data-testid^="magazine-card-"]').first();
    const hasMagazine = await firstCard.count();
    test.skip(hasMagazine === 0, "sem revistas cadastradas na conta de teste");

    await firstCard.click();
    await expect(page).toHaveURL(/\/magazine\/(?!templates)[^/]+$/);

    const hero = page.getByTestId("magazine-editor-hero-row");
    const mainCol = page.getByTestId("magazine-editor-main-col");
    const aside = page.getByTestId("magazine-preview-aside");

    await expect(hero).toBeVisible();
    await expect(mainCol).toBeVisible();
    await expect(aside).toBeVisible();

    // 1. Alinhamento inicial: topo do aside ≈ topo da coluna principal (tolerância 4px)
    const mainTop0 = await mainCol.evaluate((el) => el.getBoundingClientRect().top);
    const asideTop0 = await aside.evaluate((el) => el.getBoundingClientRect().top);
    expect(
      Math.abs(asideTop0 - mainTop0),
      `preview desalinhado da coluna principal (main=${mainTop0}, aside=${asideTop0})`,
    ).toBeLessThan(4);

    // 2. Scroll para fora do hero e verifica sticky
    // O elemento sticky é o painel interno do PreviewSidebar (top-2 = 8px).
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: "instant" as ScrollBehavior }));
    await page.waitForFunction(() => window.scrollY >= 700);

    const heroTop1 = await hero.evaluate((el) => el.getBoundingClientRect().top);
    const stickyCardTop = await page
      .locator('[data-testid="magazine-preview-aside"] > *')
      .first()
      .evaluate((el) => el.getBoundingClientRect().top);

    // Hero deve ter saído (rolou para cima → top << 0)
    expect(heroTop1, "hero não rolou").toBeLessThan(-100);
    // Preview deve estar pinned próximo do topo (top-2 ≈ 8px, tolerância 8px)
    expect(
      stickyCardTop,
      `preview não ficou sticky (top=${stickyCardTop}, scrollY=800)`,
    ).toBeLessThan(24);
    expect(stickyCardTop).toBeGreaterThanOrEqual(0);
  });
});
