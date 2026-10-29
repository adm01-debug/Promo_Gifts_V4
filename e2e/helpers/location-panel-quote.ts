import { expect, type Page } from '@playwright/test';
import { installMockAuth, isMockAuthEnabled } from './mock-auth';
import { gotoAndSettle } from './nav';

const PRODUCT_ID = 'e2e-location-panel-product';

/**
 * Prepara um orçamento determinístico com produto personalizável.
 * Todas as respostas são interceptadas no navegador: não grava no Supabase e
 * não depende de um catálogo ou seed comercial específico do ambiente.
 */
export async function openQuoteWithPersonalizableProduct(page: Page): Promise<void> {
  if (isMockAuthEnabled()) await installMockAuth(page);

  await page.route('**/rest/v1/v_products_public*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: PRODUCT_ID,
          name: 'Produto E2E com personalização',
          sku: 'E2E-LOCATION-001',
          sale_price: 12,
          base_price: 12,
          images: [],
          stock_quantity: 200,
          min_quantity: 1,
          colors: [],
          is_active: true,
          active: true,
        },
      ]),
    }),
  );
  await page.route('**/rest/v1/product_variants*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/rest/v1/product_images*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/rest/v1/rpc/fn_get_product_customization_options', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        product_id: PRODUCT_ID,
        locations: [
          {
            location_code: 'LADO-A',
            location_name: 'Lado A',
            location_order: 1,
            options: [
              {
                technique_id: 'e2e-serigrafia-1-cor',
                codigo_tabela: 'E2E-SER-01',
                tecnica_nome: 'Serigrafia 1 cor',
                grupo_tecnica: 'SERIGRAFIA',
                variacao_label: '1 cor',
                max_width: 10,
                max_height: 5,
                gravacao_largura_max: 10,
                gravacao_altura_max: 5,
                efetiva_largura_max: 10,
                efetiva_altura_max: 5,
                shape: 'rectangle',
                is_curved: false,
                usa_dimensao: false,
                cobra_por_cor: false,
                max_cores: 1,
              },
            ],
          },
        ],
      }),
    }),
  );
  await page.route('**/rest/v1/rpc/fn_get_customization_price', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        tabela: 'E2E-SER-01',
        nome_tabela: 'Serigrafia 1 cor',
        grupo_tecnica: 'SERIGRAFIA',
        quantidade: 1,
        num_cores: 1,
        preco_unitario: 1,
        valor_gravacao: 1,
        setup_total: 0,
        total_cobrado: 1,
        faixa: { qtd_min: 1, qtd_max: 1000, prazo_dias: 2 },
        detalhes: { cobra_por_cor: false, max_cores: 1 },
      }),
    }),
  );
  // A preferência é lida/sincronizada pelo hook ao montar e alternar o painel.
  // Mantém o fixture totalmente local, inclusive no modo autenticado simulado.
  await page.route('**/rest/v1/user_preferences*', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ filter_states: {} }),
      });
    }
    return route.fulfill({ status: 204, body: '' });
  });

  await gotoAndSettle(page, '/orcamentos/novo');
  await page.getByTestId('quote-add-product-button-summary').click();
  await expect(page.getByTestId('quote-add-product-modal')).toBeVisible();
  const productOption = page.getByTestId(`product-search-option-${PRODUCT_ID}`);
  await expect(productOption).toBeVisible();
  await productOption.click();

  // Sem variantes, o seletor adiciona o produto automaticamente.
  await expect(page.getByTestId('quote-item-editor-sheet')).toBeVisible();
  const techniqueCard = page.getByTestId('customization-technique-card-e2e-serigrafia-1-cor');
  if (!(await techniqueCard.isVisible().catch(() => false))) {
    const changeTechnique = page.getByTestId('customization-change-technique');
    await expect(changeTechnique).toBeVisible();
    await changeTechnique.click();
  }
  await expect(techniqueCard).toBeVisible();
  await techniqueCard.click();
  await expect(page.getByTestId('customization-collapse-toggle')).toBeVisible();
}
