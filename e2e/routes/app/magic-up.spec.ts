/**
 * Rota: /magic-up — gerador de imagens publicitárias com IA (vendedor/marketing).
 *
 * E-5 — o spec anterior usava `buildAuthedRouteSuite` com
 * `primary: { kind: "rest", key: "magic_up_jobs" }`: uma tabela que NÃO existe no
 * banco e que a página nunca consulta. Resultado: os testes de falha
 * interceptavam uma rota que nunca disparava — não provavam nada.
 *
 * Este spec aponta para as tabelas/rotas REAIS da rota, conferidas no código
 * em 09/10/2026:
 *
 *  - REST `v_products_public`      → `useMagicUpState.ts` carrega o catálogo via
 *                                    `dbInvoke` (em `src/lib/db/postgrest.ts`,
 *                                    `products` é aliasado para `v_products_public`).
 *  - REST `magic_up_generations`   → `useMagicUpState.ts` (histórico) e
 *                                    `useMagicUpGeneration.ts` (insert da geração).
 *  - REST `magic_up_campaigns`     → `useMagicUpState.ts` (campanhas).
 *  - Edge `generate-ad-image`      → `useMagicUpGeneration.ts#handleGenerate`.
 *  - Edge `magic-up-score`         → `useMagicUpGeneration.ts#analyzeQuality`
 *                                    (falha cai em diagnóstico heurístico identificado).
 *
 * Cada teste de falha DISPARA a chamada de fato (os mocks contam as requisições
 * recebidas) e assere a mensagem/estado visível ao usuário.
 */
import path from 'node:path';
import { test, expect, requireAuth } from '../../fixtures/test-base';
import type { Page, Route } from '@playwright/test';
import { gotoAndSettle } from '../../helpers/nav';
import { waitRouteReady } from '../_shared';
import { installMockAuth, isMockAuthEnabled } from '../../helpers/mock-auth';

test.beforeEach(async ({ page }) => {
  if (isMockAuthEnabled()) await installMockAuth(page);
});

// ─── Dados e rotas reais ─────────────────────────────────────────────

/** Produto devolvido pela view Ouro `v_products_public`. */
const PRODUTO = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Caneta Esferográfica Azul',
  sku: 'CAN-001',
  images: [],
  primary_image_url: 'https://cdn.promobrindes.example/caneta-azul.png',
  og_image_url: null,
};

const LOGO = path.resolve('public/images/promo-brindes-logo.png');

/**
 * Cenário digitado no campo "Detalhes adicionais". É texto de prompt enviado
 * apenas para a edge mockada (`generate-ad-image`) — nunca vira nome de recurso
 * persistido (por isso não usa `e2eName`/cleanup escopado).
 */
const DETALHES_CENARIO = 'fundo de escritório, luz suave, foco no produto';

const ROTAS = {
  produtos: /\/rest\/v1\/v_products_public(\?|$)/,
  variantes: /\/rest\/v1\/product_variants(\?|$)/,
  imagens: /\/rest\/v1\/product_images(\?|$)/,
  coresVariacoes: /\/rest\/v1\/color_variations(\?|$)/,
  coresGrupos: /\/rest\/v1\/color_groups(\?|$)/,
  rpc: /\/rest\/v1\/rpc\//,
  generations: /\/rest\/v1\/magic_up_generations(\?|$)/,
  campaigns: /\/rest\/v1\/magic_up_campaigns(\?|$)/,
  generateAdImage: /\/functions\/v1\/generate-ad-image(\?|$|\/)/,
  magicUpScore: /\/functions\/v1\/magic-up-score(\?|$|\/)/,
};

interface BackendOptions {
  /** Status da view Ouro do catálogo (`v_products_public`). */
  produtosStatus?: number;
  /** Linhas devolvidas por `magic_up_generations` (histórico). */
  historico?: unknown[];
  /** Status de `magic_up_generations` (leitura do histórico). */
  historicoStatus?: number;
  /** Status da edge `generate-ad-image`. */
  geracaoStatus?: number;
  /** Body de sucesso da edge `generate-ad-image`. */
  geracaoBody?: Record<string, unknown>;
  /** Status da edge `magic-up-score`. */
  scoreStatus?: number;
  /** Body de sucesso da edge `magic-up-score`. */
  scoreBody?: Record<string, unknown>;
}

interface Contadores {
  produtos: number;
  historicoGet: number;
  historicoInsert: number;
  generateAdImage: number;
  magicUpScore: number;
}

const GERACAO_OK = {
  imageUrl: 'https://cdn.promobrindes.example/gerada.png',
  model: 'magic-up-pro',
  outputChannel: 'instagram',
  aspectRatio: '1:1',
  qualityMode: 'alta',
  creativeMode: 'campanha',
  compositionMode: 'produto',
};

const SCORE_OK = {
  total: 88,
  label: 'Excelente para envio',
  summary: 'Peça consistente para uso comercial.',
  criteria: [],
  strengths: [],
  risks: [],
  recommendations: [],
  source: 'ai',
};

/**
 * Instala os mocks das tabelas/edges reais do /magic-up e devolve contadores
 * incrementados a cada requisição interceptada — é a prova de que o teste
 * dispara a chamada de verdade.
 */
async function mockBackend(page: Page, options: BackendOptions = {}): Promise<Contadores> {
  const contadores: Contadores = {
    produtos: 0,
    historicoGet: 0,
    historicoInsert: 0,
    generateAdImage: 0,
    magicUpScore: 0,
  };

  const responder = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(ROTAS.produtos, async (route) => {
    contadores.produtos += 1;
    if (options.produtosStatus && options.produtosStatus >= 400) {
      return responder(route, options.produtosStatus, { message: 'service unavailable' });
    }
    return responder(route, 200, [PRODUTO]);
  });

  // Tabelas acessórias consultadas em paralelo pelo enriquecimento do catálogo
  // e pela RPC de áreas de personalização — vazias para manter o teste determinístico.
  for (const tabela of [ROTAS.variantes, ROTAS.imagens, ROTAS.coresVariacoes, ROTAS.coresGrupos]) {
    await page.route(tabela, (route) => responder(route, 200, []));
  }
  await page.route(ROTAS.rpc, (route) => responder(route, 200, []));
  await page.route(ROTAS.campaigns, (route) => responder(route, 200, []));

  await page.route(ROTAS.generations, async (route) => {
    if (route.request().method() !== 'GET') {
      contadores.historicoInsert += 1;
      return responder(route, 201, { id: 'gen-0001' });
    }
    contadores.historicoGet += 1;
    if (options.historicoStatus && options.historicoStatus >= 400) {
      return responder(route, options.historicoStatus, { message: 'service unavailable' });
    }
    return responder(route, 200, options.historico ?? []);
  });

  await page.route(ROTAS.generateAdImage, (route) => {
    contadores.generateAdImage += 1;
    if (options.geracaoStatus && options.geracaoStatus >= 400) {
      return responder(route, options.geracaoStatus, { error: 'internal_server_error' });
    }
    return responder(route, 200, options.geracaoBody ?? GERACAO_OK);
  });

  await page.route(ROTAS.magicUpScore, (route) => {
    contadores.magicUpScore += 1;
    if (options.scoreStatus && options.scoreStatus >= 400) {
      return responder(route, options.scoreStatus, { error: 'service_unavailable' });
    }
    return responder(route, 200, options.scoreBody ?? SCORE_OK);
  });

  return contadores;
}

/** Seleciona o produto no combobox real da página (componente compartilhado do Mockup). */
async function selecionarProduto(page: Page): Promise<void> {
  await page.getByTestId('mockup-product-combobox-trigger').click();
  await page.getByTestId(`mockup-product-option-${PRODUTO.id}`).click();
  // `.filter({ visible: true })`: o SKU aparece em mais de um lugar — a opção no
  // popover do combobox (que fica OCULTA depois da seleção) e o painel do
  // produto escolhido. Sem o filtro, o matcher estrito do Playwright resolve
  // para 2 elementos (ou pega o oculto); o visível é a prova de que o produto
  // foi selecionado de fato.
  await expect(page.getByText(`SKU: ${PRODUTO.sku}`).filter({ visible: true }).first()).toBeVisible();
}

/** Preenche produto + logo + cenário até o CTA de geração ficar habilitado. */
async function preencherGerador(page: Page): Promise<void> {
  await selecionarProduto(page);

  await page.locator('#magic-logo-upload').setInputFiles(LOGO);
  await expect(page.locator('img[alt="Logo"]')).toBeVisible();

  await page.getByPlaceholder(/A pessoa deve estar sorrindo/i).fill(DETALHES_CENARIO);

  await expect(page.getByRole('button', { name: /Gerar Imagem Publicitária/ })).toBeEnabled();
}

// ─── Cenários ────────────────────────────────────────────────────────

test.describe('/magic-up — tabelas e rotas reais', () => {
  test.beforeEach(() => requireAuth());

  test('render: consulta as tabelas reais (v_products_public e magic_up_generations)', async ({
    page,
  }) => {
    const contadores = await mockBackend(page);
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));

    await gotoAndSettle(page, '/magic-up');
    await waitRouteReady(page);

    // 30s: o primeiro render da rota em dev (vite sem cache) monta o chunk
    // pesado do /magic-up bem depois do domcontentloaded — o default de 15s do
    // config é apertado para a primeira carga de cada sessão.
    await expect(page.getByTestId('page-title-magic-up')).toBeVisible({ timeout: 30_000 });
    // Prova de que o spec aponta para as tabelas reais: as duas consultas dispararam.
    await expect.poll(() => contadores.produtos, { timeout: 10_000 }).toBeGreaterThan(0);
    await expect.poll(() => contadores.historicoGet, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(erros, 'page errors: ' + erros.join('; ')).toHaveLength(0);
  });

  test('happy: histórico real de magic_up_generations renderiza no painel', async ({ page }) => {
    await mockBackend(page, {
      historico: [
        {
          id: 'gen-0001',
          generated_image_url: 'https://cdn.promobrindes.example/historico.png',
          product_name: 'Caneta Histórica',
          scene_title: 'Escritório',
          scene_category: 'custom',
          is_favorite: false,
          created_at: '2026-10-09T12:00:00.000Z',
          client_name: null,
          quality_score: 88,
          status: 'draft',
          channel: 'instagram',
          aspect_ratio: '1:1',
          metadata: null,
          copy_pack: null,
        },
      ],
    });

    await gotoAndSettle(page, '/magic-up');
    await waitRouteReady(page);

    await page.getByRole('button', { name: /Ver histórico/i }).click();
    await expect(page.getByLabel('Selecionar histórico Caneta Histórica')).toBeVisible();
  });

  test("falha: catálogo indisponível (5xx na view Ouro) mostra 'Erro ao carregar produtos'", async ({
    page,
  }) => {
    const contadores = await mockBackend(page, { produtosStatus: 503 });

    await gotoAndSettle(page, '/magic-up');

    // O toast do sonner se auto-dispensa em ~4s (ver `assertCartAddErrorToast`,
    // que checa exatamente esse auto-dismiss). Como `waitRouteReady` pode levar
    // mais que isso enquanto a página termina de carregar, o poll do toast
    // começa AQUI (logo depois do domcontentloaded) — do contrário o assert
    // corre atrás de um toast que já desapareceu e falha com "element(s) not
    // found" mesmo com a mensagem tendo sido exibida ao usuário.
    await expect(page.getByText('Erro ao carregar produtos').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect.poll(() => contadores.produtos, { timeout: 10_000 }).toBeGreaterThan(0);
    await waitRouteReady(page);
  });

  test("falha: geração (500 em generate-ad-image) dispara a edge e mostra 'Erro ao gerar imagem'", async ({
    page,
  }) => {
    const contadores = await mockBackend(page, { geracaoStatus: 500 });

    await gotoAndSettle(page, '/magic-up');
    await waitRouteReady(page);
    await preencherGerador(page);

    await page.getByRole('button', { name: /Gerar Imagem Publicitária/ }).click();

    await expect(page.getByText('Erro ao gerar imagem').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect.poll(() => contadores.generateAdImage, { timeout: 20_000 }).toBeGreaterThan(0);
    // A falha não deixa a tela travada: o CTA volta a ficar habilitado.
    await expect(page.getByRole('button', { name: /Gerar Imagem Publicitária/ })).toBeEnabled({
      timeout: 20_000,
    });
  });

  test('falha: score IA indisponível (500 em magic-up-score) cai em heurística identificada', async ({
    page,
  }) => {
    const contadores = await mockBackend(page, { scoreStatus: 500 });

    await gotoAndSettle(page, '/magic-up');
    await waitRouteReady(page);
    await preencherGerador(page);

    await page.getByRole('button', { name: /Gerar Imagem Publicitária/ }).click();

    // A geração conclui: a falha do score não vira erro de geração.
    await expect(page.getByText(/Imagem publicitária gerada com sucesso/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect.poll(() => contadores.magicUpScore, { timeout: 20_000 }).toBeGreaterThan(0);
    await expect(page.getByLabel('Origem do diagnóstico: Heurístico')).toBeVisible();
    await expect.poll(() => contadores.historicoInsert, { timeout: 20_000 }).toBeGreaterThan(0);
  });

  test('sucesso: executa as duas edges reais e persiste em magic_up_generations', async ({
    page,
  }) => {
    const contadores = await mockBackend(page);

    await gotoAndSettle(page, '/magic-up');
    await waitRouteReady(page);
    await preencherGerador(page);

    await page.getByRole('button', { name: /Gerar Imagem Publicitária/ }).click();

    await expect(page.getByText(/Imagem publicitária gerada com sucesso/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect.poll(() => contadores.generateAdImage, { timeout: 20_000 }).toBeGreaterThan(0);
    await expect.poll(() => contadores.magicUpScore, { timeout: 20_000 }).toBeGreaterThan(0);
    await expect.poll(() => contadores.historicoInsert, { timeout: 20_000 }).toBeGreaterThan(0);
    await expect(page.getByLabel('Origem do diagnóstico: Inteligência Artificial')).toBeVisible();
    await expect(page.locator(`img[alt="Imagem publicitária - ${PRODUTO.name}"]`)).toBeVisible();
  });

  test('@mobile: /magic-up não tem overflow horizontal em 375px', async ({ page }) => {
    await mockBackend(page);
    await page.setViewportSize({ width: 375, height: 812 });

    await gotoAndSettle(page, '/magic-up');
    await waitRouteReady(page);

    // Mesmo motivo do teste de render: primeira carga da rota em dev é lenta.
    await expect(page.getByTestId('page-title-magic-up')).toBeVisible({ timeout: 30_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(overflow).toBe(false);
  });
});
