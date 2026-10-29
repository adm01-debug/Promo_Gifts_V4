/**
 * E2E — /mockup-generator: fluxo completo (empresa → produto → técnica → logo → geração)
 * e limpeza do formulário, com assertivas de ESTADO (não só presença no `body`).
 *
 * Seletores conferidos nos componentes atuais da main (git grep data-testid / aria-label):
 *  - mockup-client-search-input / mockup-client-option- / mockup-client-chip
 *      -> src/components/mockup/MockupClientSelector.tsx
 *  - produto: botão "Buscar produto" + dialog "Selecione o Produto" + cartões [role="button"]
 *    + aria-label "Remover produto selecionado"
 *      -> src/components/mockup/MockupProductSelector.tsx (+ MockupColorSelector.tsx)
 *  - mockup-technique-select-trigger (+ placeholder "Selecione uma técnica...") e aria-label
 *    "Limpar formulário" -> src/components/mockup/MockupConfigPanel.tsx
 *  - input[data-testid^="mockup-logo-upload-input-"] e img[alt="Miniatura do logo enviado"]
 *      -> src/components/mockup/AreaCard.tsx
 *  - img[alt="Logo para personalização"] -> src/components/mockup/logo-editor/LogoPreviewCanvas.tsx
 *  - botão "Gerar Layout - IA" -> src/components/mockup/approval/MockupLayoutButtons.tsx
 *  - generating-overlay -> GeneratingOverlay.tsx; mockup-result-card + "Baixar" -> MockupResultCard.tsx
 *
 * O seletor de produto desta rota é MockupProductSelector.tsx (dialog). O data-testid
 * "mockup-product-combobox-trigger" (ProductSearchCombobox.tsx) NÃO é renderizado aqui — é do Magic Up.
 *
 * CUIDADOS verificados no código (não são estilo):
 *  1. MockupConfigPanel.tsx (MobileCollapsibleSection) renderiza os filhos de cada seção DUAS vezes: no
 *     bloco desktop (`hidden md:block`) e no bloco mobile (`md:hidden`). Empresa, técnica e miniatura do
 *     logo existem 2x no DOM e o modo estrito do Playwright recusa um locator que resolve para 2
 *     elementos, mesmo com um deles oculto. `visivel()` fica só com a cópia visível; getByRole já
 *     ignora a oculta.
 *  2. O 1º <span> de um SelectItem é o indicador de seleção (vazio): ler o nome da técnica por ali
 *     devolve "" — `toContainText("")` passa sempre e `not.toContainText("")` falha sempre. O nome vem
 *     do textContent da opção.
 *  3. Após "Gerar Layout - IA" bem-sucedido o MockupLayoutButtons abre o diálogo modal "Aprovação de
 *     Layout"; o Radix põe aria-hidden no resto da página e getByRole deixa de enxergar o card. O
 *     botão "Baixar" do card é buscado por CSS.
 *  4. O rascunho do formulário (mockup_drafts) é restaurado do backend no carregamento: o estado de um
 *     teste/spec anterior preencheria empresa/produto/técnica antes do passo 1. A rota é isolada.
 *
 * DEPENDÊNCIA: o botão "Gerar Layout - IA" será removido pelo cartão do compositor sem IA. Quando
 * entrar, trocar BOTAO_LAYOUT_IA pelo botão novo de geração.
 *
 * Depende de dados do ambiente de teste: empresa no CRM (external-db-bridge) e produto + técnica
 * compatível no catálogo. analyze-logo-colors, generate-mockup e mockup_drafts são mockados por rota.
 * O teste de geração ainda grava 1 linha em generated_mockups e sobe o logo ao storage do projeto
 * Supabase que o app aponta: rodar só com usuário/ambiente de teste.
 */
import { test, expect, requireAuth } from '../fixtures/test-base';
import type { Locator, Page } from '@playwright/test';
import { gotoAndSettle } from '../helpers/nav';
import path from 'node:path';

const LOGO = path.resolve('public/images/promo-brindes-logo.png');
const LOGO_UPLOAD_INPUT = 'input[data-testid^="mockup-logo-upload-input-"]';
const LOGO_THUMB = 'img[alt="Miniatura do logo enviado"]';
const LOGO_PREVIEW = 'img[alt="Logo para personalização"]';
const BOTAO_LAYOUT_IA = /Gerar Layout - IA/i;
const ROTA_ANALYZE_COLORS = /\/functions\/v1\/analyze-logo-colors(\?|$|\/)/;
const ROTA_GENERATE_MOCKUP = /\/functions\/v1\/generate-mockup(\?|$|\/)/;
const ROTA_RASCUNHO = /\/rest\/v1\/mockup_drafts(\?|$)/;
const ROTA_OPCOES_PRODUTO = /\/rest\/v1\/rpc\/fn_get_product_customization_options/;
const MOCKUP_URL = 'https://example.com/mockup.png';
// Atraso da resposta mockada: o overlay precisa ficar observável pelo polling do expect.
const ATRASO_GERACAO_MS = 1500;

/** Só a cópia visível (desktop ou mobile) de um elemento renderizado 2x pelo MobileCollapsibleSection. */
const visivel = (locator: Locator): Locator => locator.filter({ visible: true });

/** Clica no seletor de empresa e escolhe o primeiro registro do CRM. */
async function selecionarCliente(page: Page): Promise<string> {
  await visivel(page.getByTestId('mockup-client-search-input')).click();
  const opcao = page.locator('[data-testid^="mockup-client-option-"]').first();
  await opcao.waitFor({ state: 'visible', timeout: 15000 });
  const nome = (await opcao.locator('span').first().innerText()).trim();
  expect(nome, 'nome da empresa lido da opção').not.toBe('');
  await opcao.click();
  return nome;
}

/** Seleciona o primeiro produto no MockupProductSelector e confirma a cor. */
async function selecionarPrimeiroProduto(page: Page): Promise<string> {
  // As opções de personalização do produto só chegam DEPOIS da seleção. Antes disso a lista de
  // técnicas vem sem filtro; ao chegar, useMockupGenerator troca as áreas (apaga logo já enviado) e
  // limpa técnica incompatível. Conta as respostas para esperar por elas antes de escolher a técnica.
  let opcoesRecebidas = 0;
  page.on('response', (resposta) => {
    if (ROTA_OPCOES_PRODUTO.test(resposta.url())) opcoesRecebidas += 1;
  });

  await page.getByRole('button', { name: /Buscar produto/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /Selecione o Produto/i })).toBeVisible();

  const cartao = dialog.locator('[role="button"]').first();
  await expect(cartao).toBeVisible({ timeout: 15000 });
  const nome = (await cartao.locator('h4').first().innerText()).trim();
  expect(nome, 'nome do produto lido do cartão').not.toBe('');
  await cartao.click();

  // Com variantes o MockupColorSelector pede a cor; sem variantes ele seleciona sozinho.
  const variante = page.getByRole('button', { name: /un$|Estoque zerado/ }).first();
  const selecionado = page.getByRole('button', { name: 'Remover produto selecionado' });
  await expect(variante.or(selecionado).first()).toBeVisible({ timeout: 15000 });
  // count() não lança (0 = produto sem variantes, já confirmado pelo componente):
  // evita clicar num botão que pode não existir sem engolir falha nenhuma.
  if ((await variante.count()) > 0) {
    await variante.click();
  }
  await expect(selecionado).toBeVisible({ timeout: 10000 });
  await expect
    .poll(() => opcoesRecebidas, {
      message: 'opções de personalização do produto recebidas',
      timeout: 15000,
    })
    .toBeGreaterThan(0);
  return nome;
}

/** Seleciona a primeira técnica compatível e devolve o texto dela (o mesmo que o gatilho passa a exibir). */
async function selecionarTecnica(page: Page): Promise<string> {
  const gatilho = visivel(page.getByTestId('mockup-technique-select-trigger'));
  await gatilho.click();
  const opcao = page.locator('[role="option"]').first();
  await expect(opcao).toBeVisible({ timeout: 15000 });
  // textContent: é o que toContainText compara, e o gatilho exibe a cópia do conteúdo da opção.
  const nome = ((await opcao.textContent()) ?? '').trim();
  expect(nome, 'texto da técnica lido da opção').not.toBe('');
  await opcao.click();
  await expect(gatilho).toContainText(nome);
  await expect(gatilho).not.toHaveAttribute('data-placeholder');
  return nome;
}

/** Preenche empresa + produto + técnica e envia o logo na 1ª área de personalização. */
async function preencherComLogo(
  page: Page,
): Promise<{ cliente: string; produto: string; tecnica: string }> {
  const cliente = await selecionarCliente(page);
  await expect(visivel(page.getByTestId('mockup-client-chip'))).toContainText(cliente);

  const produto = await selecionarPrimeiroProduto(page);
  const tecnica = await selecionarTecnica(page);

  await visivel(page.locator(LOGO_UPLOAD_INPUT)).first().setInputFiles(LOGO);
  await expect(visivel(page.locator(LOGO_THUMB))).toBeVisible();
  await expect(page.locator(LOGO_PREVIEW)).toBeVisible();

  return { cliente, produto, tecnica };
}

test.describe('Mockup Module Comprehensive Flow', () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    // A análise de cor da logo é best-effort no produto: mockada para o teste não
    // depender da edge function.
    await page.route(ROTA_ANALYZE_COLORS, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ colors: [] }),
      }),
    );
    // Rascunho isolado: nada é restaurado de execuções anteriores e nada é gravado no banco.
    await page.route(ROTA_RASCUNHO, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        : route.fulfill({ status: 204 }),
    );
    await gotoAndSettle(page, '/mockup-generator');
  });

  test('completa empresa → produto → técnica → logo → geração com estado visível em cada etapa', async ({
    page,
  }) => {
    // 1-4. Preenche a configuração e o logo, conferindo o estado a cada passo.
    const { cliente, produto, tecnica } = await preencherComLogo(page);
    await expect(visivel(page.getByTestId('mockup-client-chip'))).toContainText(cliente);
    await expect(page.getByRole('button', { name: 'Remover produto selecionado' })).toBeVisible();
    await expect(visivel(page.getByText(produto, { exact: true })).first()).toBeVisible();
    await expect(visivel(page.getByTestId('mockup-technique-select-trigger'))).toContainText(
      tecnica,
    );

    // 5. Geração pela rota de IA mockada (não depende da edge function).
    await page.route(ROTA_GENERATE_MOCKUP, async (route) => {
      // Atraso para o overlay de geração ser observável.
      await new Promise((resolve) => setTimeout(resolve, ATRASO_GERACAO_MS));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mockupUrl: MOCKUP_URL }),
      });
    });
    // A imagem do resultado vem de uma URL fictícia: serve a PNG versionada para o <img> ter
    // caixa de verdade e o teste não depender de example.com.
    await page.route(MOCKUP_URL, (route) => route.fulfill({ path: LOGO }));

    const gerarLayoutIa = page.getByRole('button', { name: BOTAO_LAYOUT_IA });
    await expect(gerarLayoutIa).toBeEnabled();
    await gerarLayoutIa.click();

    // 6. Overlay de geração visível enquanto a requisição está em curso.
    await expect(page.getByTestId('generating-overlay')).toBeVisible();

    // 7. Resultado: card com a imagem gerada e o botão de download. "Baixar" por CSS e não por
    //    getByRole: o diálogo modal "Aprovação de Layout" abre depois da geração e deixa o resto
    //    da página com aria-hidden.
    const card = page.getByTestId('mockup-result-card');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card.locator(`img[src="${MOCKUP_URL}"]`)).toBeVisible();
    await expect(card.locator('button', { hasText: 'Baixar' })).toBeVisible();
  });

  test('limpa o estado visível de empresa, produto, técnica e logo ao resetar o formulário', async ({
    page,
  }) => {
    const { cliente, tecnica } = await preencherComLogo(page);
    await expect(visivel(page.getByTestId('mockup-client-chip'))).toContainText(cliente);

    // Reset via botão do painel de configuração.
    await page.getByLabel('Limpar formulário').click();

    // Estado inicial restaurado (assertivas de estado, não só o body):
    await expect(visivel(page.getByTestId('mockup-client-chip'))).toHaveCount(0);
    await expect(visivel(page.getByTestId('mockup-client-search-input'))).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remover produto selecionado' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Buscar produto/i })).toBeVisible();
    const gatilho = visivel(page.getByTestId('mockup-technique-select-trigger'));
    await expect(gatilho).not.toContainText(tecnica);
    await expect(gatilho).toContainText(/Selecione uma técnica/i);
    await expect(gatilho).toHaveAttribute('data-placeholder', '');
    await expect(visivel(page.locator(LOGO_THUMB))).toHaveCount(0);
    await expect(page.locator(LOGO_PREVIEW)).toHaveCount(0);
  });
});
