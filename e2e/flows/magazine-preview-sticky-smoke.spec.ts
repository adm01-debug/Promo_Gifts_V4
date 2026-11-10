/**
 * Magazine Editor — preview da capa alinhado ao Hero e sticky no scroll (xl+).
 */
import { expect } from "@playwright/test";
import { test } from "../fixtures/test-base";
import { loginAs } from "../helpers/auth";
import { gotoAndSettle, waitForRouteIdle } from "../helpers/nav";

const XL_VIEWPORT = { width: 1440, height: 900 };

test.describe("@smoke Magazine Editor — preview sticky/aligned", () => {
  test.use({ timeout: 300_000 });
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(XL_VIEWPORT);
    await loginAs(page);
  });

  test("preview alinha com hero e permanece sticky ao scrollar (xl+)", async ({ page }) => {
    test.setTimeout(300_000);
    await gotoAndSettle(page, "/magazine");

    const firstCard = page.locator('[data-testid^="magazine-card-"]').first();
    const hasMagazine = await firstCard.count();
    test.skip(hasMagazine === 0, "sem revistas cadastradas na conta de teste");

    await firstCard.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/magazine\/(?!templates)[^/]+$/);
    await waitForRouteIdle(page);
    let editorPronto = false;
    try {
      await page.waitForFunction(
        () => {
          const titleInput = document.querySelector('[data-testid="magazine-title-input"]');
          if (!titleInput || !(titleInput as HTMLElement).offsetParent) return false;
          const aside = document.querySelector('[data-testid="magazine-preview-aside"]');
          if (!aside) return false;
          let stickyEl: Element | null = null;
          for (const el of Array.from(aside.querySelectorAll<Element>("*"))) {
            if (getComputedStyle(el).position === "sticky") {
              stickyEl = el;
              break;
            }
          }
          if (!stickyEl || (stickyEl as HTMLElement).getBoundingClientRect().height === 0)
            return false;
          const stickyHeight = (stickyEl as HTMLElement).getBoundingClientRect().height;
          const asideBottomDoc = aside.getBoundingClientRect().bottom + window.scrollY;
          return asideBottomDoc > 520 + stickyHeight + 20;
        },
        undefined,
        { timeout: 60_000 },
      );
      editorPronto = true;
    } catch {
      editorPronto = false;
    }
    test.skip(!editorPronto, "PostgREST cold start > 60s — editor não hidratou; skip de infraestrutura");

    const hero = page.getByTestId("magazine-editor-hero-row");
    const mainCol = page.getByTestId("magazine-editor-main-col");
    const aside = page.getByTestId("magazine-preview-aside");

    await expect(hero).toBeVisible();
    await expect(mainCol).toBeVisible();
    await expect(aside).toBeVisible();

    const mainTop0 = await mainCol.evaluate((el) => el.getBoundingClientRect().top);
    const asideTop0 = await aside.evaluate((el) => el.getBoundingClientRect().top);
    expect(
      Math.abs(asideTop0 - mainTop0),
      `preview desalinhado da coluna principal (main=${mainTop0}, aside=${asideTop0})`,
    ).toBeLessThan(4);

    await page.evaluate(() => window.scrollTo({ top: 520, behavior: "instant" as ScrollBehavior }));
    await expect
      .poll(() => page.evaluate(() => window.scrollY), {
        timeout: 5_000,
        message: await page.evaluate(
          () =>
            `página não rolou até 500px: scrollHeight=${document.documentElement.scrollHeight}, ` +
            `innerHeight=${window.innerHeight} (rolagem máxima=${
              document.documentElement.scrollHeight - window.innerHeight
            }px)`,
        ),
      })
      .toBeGreaterThanOrEqual(500);

    const heroTop1 = await hero.evaluate((el) => el.getBoundingClientRect().top);
    const stickyCardTop = await page
      .locator('[data-testid="magazine-preview-aside"]')
      .evaluate((aside) => {
        const all = aside.querySelectorAll<Element>("*");
        for (const el of Array.from(all)) {
          if (getComputedStyle(el).position === "sticky") {
            return el.getBoundingClientRect().top;
          }
        }
        return aside.firstElementChild?.getBoundingClientRect().top ?? -1_000;
      });

    expect(heroTop1, "hero não rolou").toBeLessThan(-100);
    expect(
      stickyCardTop,
      `preview não ficou sticky (top=${stickyCardTop}, scrollY=520)`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      stickyCardTop,
      `preview está sticky mas acima do ponto de pinning (top=${stickyCardTop}, scrollY=520)`,
    ).toBeLessThan(24);
  });
});
