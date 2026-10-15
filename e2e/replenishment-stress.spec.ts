import { test, expect } from '@playwright/test';

test.describe('Reposição Module - Stress & Load Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Simula login se necessário (usando storage state em produção, mas aqui fazemos manual se precisar)
    await page.goto('/reposicao');
  });

  test('Deve carregar grid de reposição com milhares de registros simulados e paginação estável', async ({ page }) => {
    // CONTRATO ATUAL (desde #2094, 2026-10-09): a grade de Reposição NÃO lê mais
    // `v_products_public` com offset/limit e NÃO pagina por scroll de janela.
    // Ela chama UMA vez o RPC `fn_get_reposicao_listing` (p_limit = 2000,
    // p_offset = 0 — ver FETCH_ALL_LIMIT em useReplenishments.ts) e renderiza o
    // resultado num grid virtualizado (VirtualizedReplenishmentGrid) com
    // contêiner de scroll PRÓPRIO (role="list"), não o `window`.
    // A "paginação estável" passa a significar: todo o conjunto retornado é
    // alcançável por scroll e o DOM só mantém as linhas visíveis (virtualização).
    const TOTAL = 5000; // universo simulado; o RPC devolve no máximo p_limit linhas
    const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    // Mesma data para todas as linhas: a ordenação padrão ("mais recentes") desempata
    // por product_id, e os ids zero-padded mantêm a ordem do índice (0 primeiro).
    const restockDate = new Date().toISOString().slice(0, 10);
    const rpcBodies: Array<{ p_limit?: number; p_offset?: number }> = [];

    await page.route('**/rest/v1/rpc/fn_get_reposicao_listing*', async (route) => {
      const request = route.request();
      let args: { p_limit?: number; p_offset?: number } = {};
      try {
        args = request.postDataJSON() ?? {};
      } catch {
        // GET/sem corpo: usa os defaults abaixo
      }
      rpcBodies.push(args);
      const offset = Number(args.p_offset ?? 0);
      const limit = Number(args.p_limit ?? 50);
      const count = Math.max(0, Math.min(limit, TOTAL - offset));

      // Formato ReposicaoRow (src/hooks/products/useReplenishments.ts)
      const rows = Array.from({ length: count }, (_, i) => {
        const n = offset + i;
        return {
          product_id: uuid(n),
          name: `Produto Stress Test ${n}`,
          slug: `produto-stress-test-${n}`,
          sku: `SKU-STRESS-${n}`,
          sale_price: 10,
          is_stockout: false,
          is_new: false,
          total_stock: 1 + (n % 5),
          primary_image_url: null,
          primary_image_cdn: null,
          supplier_id: null,
          supplier_name: null,
          supplier_code: null,
          ultimo_restock_date: restockDate,
          earliest_restock_date: null,
          earliest_restock_qty: null,
          has_upcoming_restock: false,
          category_names: null,
          primary_category_id: null,
          primary_category_name: null,
          is_low_stock: false,
        };
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `${offset}-${offset + count - 1}/${TOTAL}` },
        body: JSON.stringify(rows),
      });
    });

    await page.reload();

    // Mede o tempo de carregamento inicial DEPOIS do reload, como o spec sempre
    // mediu (o orçamento de 1s nunca incluiu o boot da SPA). O tempo medido vai
    // para as anotações do relatório: se o runner de CI precisar de outro limite,
    // o número real está lá — nenhum orçamento é afrouxado sem medição.
    const startTime = Date.now();
    const firstItem = page.getByText('Produto Stress Test 0', { exact: true }).first();
    await expect(firstItem).toBeVisible();
    const loadTime = Date.now() - startTime;
    console.log(`Initial load time (post-reload -> first item): ${loadTime}ms`);
    test.info().annotations.push({ type: 'perf', description: `loadTime=${loadTime}ms (meta < 1000ms)` });
    expect(loadTime).toBeLessThan(1000); // Meta: < 1s

    // O RPC foi de fato interceptado (e não o backend real).
    expect(rpcBodies.length).toBeGreaterThan(0);

    // Virtualização: o DOM só tem as linhas visíveis, não os ~2000 itens do RPC.
    const grid = page.getByRole('list', { name: /Grade de produtos repostos/ });
    await expect(grid).toBeVisible();
    await expect(grid).toHaveAttribute('aria-label', /2000 itens/);
    const rendered = await grid.getByRole('listitem').count();
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(300);

    // Scroll do contêiner virtualizado até o fim: o último item do conjunto
    // retornado (índice 1999) precisa aparecer. A altura total é re-medida
    // conforme as linhas montam, então repete o scroll até estabilizar.
    const lastName = 'Produto Stress Test 1999';
    await expect(async () => {
      await grid.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(page.getByText(lastName, { exact: true }).first()).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20000 });

    // Estabilidade: após rolar ao fim, o DOM continua limitado.
    expect(await grid.getByRole('listitem').count()).toBeLessThan(300);

    // Volta ao topo: o primeiro item reaparece (reciclagem de linhas funciona).
    const scrollStartTime = Date.now();
    await grid.evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect(page.getByText('Produto Stress Test 0', { exact: true }).first()).toBeVisible();
    const scrollBackTime = Date.now() - scrollStartTime;
    console.log(`Scroll back to top: ${scrollBackTime}ms`);
    test.info().annotations.push({ type: 'perf', description: `scrollBackTime=${scrollBackTime}ms (meta < 500ms)` });
    expect(scrollBackTime).toBeLessThan(500);
  });

  test('Resiliência sob 410 Gone (External DB Bridge)', async ({ page }) => {
    // Simula falha no endpoint antigo que o sistema pode tentar acessar
    await page.route('**/functions/v1/external-db-bridge', async (route) => {
      await route.fulfill({
        status: 410,
        body: JSON.stringify({ error: "endpoint_decommissioned" })
      });
    });

    await page.goto('/reposicao');
    
    // O sistema deve cair graciosamente para o REST nativo ou mostrar erro amigável se for crítico
    // Aqui validamos que a página não "quebra" (crash branco)
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('Uncaught Error');
    expect(bodyText).not.toContain('Object object');
  });
});
