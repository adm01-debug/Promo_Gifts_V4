/**
 * E2E smoke: CartSidebar pós-faxina não renderiza painéis legados.
 *
 * Trava qualquer regressão visual que reintroduza "Inteligência de vendas" /
 * "Histórico de ações" / "Sugestões inteligentes" no sidebar. Roda no workflow
 * `cart-quality.yml` sempre que `src/pages/products/seller-carts/**` ou
 * `src/components/cart/**` mudam.
 *
 * 2026-11-18: "Saúde do carrinho" saiu desta lista. A #3817 devolveu o painel à
 * sidebar por decisão do dono — está documentado no próprio código
 * (src/pages/products/seller-carts/CartSidebar.tsx:9-11) e montado em
 * CartSidebar.tsx:102-108 quando o carrinho tem itens; o título "Saúde do
 * Carrinho" sai de src/components/cart/CartHealthChecklist.tsx:80. O teste
 * unitário irmão já havia sido atualizado para EXIGIR o rótulo
 * (src/pages/products/seller-carts/__tests__/CartSidebar.render.test.tsx:119-123)
 * e este e2e ficou para trás, proibindo o mesmo rótulo. Como o spec semeia 3
 * itens por carrinho, o painel renderiza e a falha era garantida — só não
 * aparecia nas PRs porque o arquivo não tem a tag @smoke.
 */
import { test, expect } from '@playwright/test';
import { setupAuthedWithCarts } from '../helpers/cart-setup';
import { gotoAndSettle } from '../helpers/nav';

const FORBIDDEN_LABELS = [
  /Inteligência de vendas/i,
  /Histórico de ações/i,
  /Sugestões inteligentes/i,
  /Checklist do carrinho/i,
];

test.describe('CartSidebar · smoke pós-faxina (sem painéis legados)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('página do carrinho hidrata (menu de ações do header) e NÃO renderiza Saúde/Inteligência/Histórico/Sugestões', async ({
    page,
  }) => {
    const { cartA } = await setupAuthedWithCarts(page, {
      role: 'user',
      count: 1,
      itemsPerCart: 3,
      gotoUrl: null,
    });
    await gotoAndSettle(page, `/carrinhos/${cartA.id}`);

    // Marcador de hidratação: o menu "…" do header do carrinho ativo
    // (`cart-actions-menu`, SellerCartsPage → CartActionsMenu) agrupa "Gerar
    // Orçamento" e "Excluir" e só monta com o carrinho carregado. O
    // `cart-checkout-cta` NÃO serve aqui: no desktop ele não é renderizado
    // (CartHeaderActions não é montado; o único `cart-checkout-cta` vive no
    // MobileSummarySheet, oculto acima de md) — a versão anterior deste spec esperava
    // esse botão visível por 60 s e falhava com `Received: hidden`. Esperar o menu
    // garante que a página montou com os itens semeados, eliminando o falso-verde em
    // que getByText(...).toHaveCount(0) passa antes do componente renderizar.
    // Timeout folgado: o backend do CI chega a levar 15–60 s por request.
    const actionsMenu = page.getByTestId('cart-actions-menu');
    await expect(actionsMenu).toBeVisible({ timeout: 60_000 });
    await expect(actionsMenu).toBeEnabled();

    // O hero (`cart-sidebar-hero`) só renderiza quando há peso/volume calculável a
    // partir de produtos REAIS do catálogo (useSellerCartsPage.weightVolume). Os
    // carrinhos mockados usam product_id `mock-prod-*`, sem dimensões, então o hero
    // é opcional aqui: quando presente, precisa estar marcado como carregado e NÃO
    // pode conter o CTA de checkout (a ação vive no menu do header).
    const hero = page.getByTestId('cart-sidebar-hero');
    if (await hero.count()) {
      await expect(hero).toHaveAttribute('data-loaded', 'true');
      await expect(hero.getByTestId('cart-checkout-cta')).toHaveCount(0);
    }

    // Nenhum dos rótulos dos painéis removidos pode aparecer no DOM
    for (const label of FORBIDDEN_LABELS) {
      await expect(
        page.getByText(label),
        `Rótulo legado reintroduzido: ${label}`,
      ).toHaveCount(0);
    }


  });
});
