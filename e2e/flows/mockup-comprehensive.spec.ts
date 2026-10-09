/**
 * E2E — /mockup-generator: fluxo completo (empresa → produto → técnica → logo → geração)
 * e limpeza do formulário, com assertivas de ESTADO (não só presença no `body`).
 *
 * Seletores conferidos nos componentes atuais (git grep data-testid / aria-label):
 *  - mockup-client-search-input / mockup-client-option- / mockup-client-chip
 *      -> src/components/mockup/MockupClientSelector.tsx:169,296,110
 *  - produto: botão "Buscar produto" + dialog "Selecione o Produto" + cartões [role="button"]
 *      -> src/components/mockup/MockupProductSelector.tsx:219,230,352
 *  - aria-label "Remover produto selecionado" -> MockupProductSelector.tsx:186
 *  - variantes por cor (quando o produto tem variantes) -> MockupColorSelector.tsx:129
 *  - mockup-technique-select-trigger -> src/components/mockup/MockupConfigPanel.tsx:193
 *  - input[data-testid^="mockup-logo-upload-input-"] e img[alt="Miniatura do logo enviado"]
 *      -> src/components/mockup/AreaCard.tsx:200,139
 *  - img[alt="Logo para personalização"]
 *      -> src/components/mockup/logo-editor/LogoPreviewCanvas.tsx:112
 *  - botões "Gerar Layout" e "Gerar Layout - IA"
 *      -> src/components/mockup/approval/MockupLayoutButtons.tsx:337,362
 *  - generating-overlay -> src/components/mockup/GeneratingOverlay.tsx:71
 *  - mockup-result-card + botão "Baixar" -> src/components/mockup/MockupResultCard.tsx:131,169
 *  - aria-label "Limpar formulário" -> src/components/mockup/MockupConfigPanel.tsx:367
 *
 * NOTA: o seletor de produto desta rota é MockupProductSelector.tsx (dialog). O
 * data-testid "mockup-product-combobox-trigger" (ProductSearchCombobox.tsx) NÃO é
 * renderizado aqui — pertence ao Magic Up.
 *
 * Depende de dados do ambiente de teste: empresa no CRM (external-db-bridge) e
 * produto/técnica no catálogo. As edge functions analyze-logo-colors e
 * generate-mockup são mockadas para o teste não depender delas.
 */
import { test, expect, requireAuth } from '../fixtures/test-base';
import type { Page } from '@playwright/test';
import { gotoAndSettle } from '../helpers/nav';
import path from 'node:path';

const LOGO = path.resolve('public/images/promo-brindes-logo.png');
const LOGO_UPLOAD_INPUT = 'input[data-testid^="mockup-logo-upload-input-"]';
const LOGO_THUMB = 'img[alt="Miniatura do logo enviado"]';
const LOGO_PREVIEW = 'img[alt="Logo para personalização"]';
const ROTA_ANALYZE_COLORS = /\/functions\/v1\/analyze-logo-colors(\?|$|\/)/;
const ROTA_GENERATE_MOCKUP = /\/functions\/v1\/generate-mockup(\?|$|\/)/;
const MOCKUP_URL = 'https://example.com/mockup.png';

/** Clica no seletor de empresa e escolhe o primeiro registro do CRM. */
async function selecionarCliente(page: Page): Promise<string> {
  await page.getByTestId('mockup-client-search-input').click();
  const opcao = page.locator('[data-testid^="mockup-client-option-"]').first();
  await opcao.waitFor({ state: 'visible', timeout: 15000 });
  const nome = (await opcao.locator('span').first().innerText()).trim();
  await opcao.click();
  return nome;
}

/** Seleciona o primeiro produto no MockupProductSelector e confirma a cor. */
async function selecionarPrimeiroProduto(page: Page): Promise<string> {
  await page.getByRole('button', { name: /Buscar produto/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /Selecione o Produto/i })).toBeVisible();

  const cartao = dialog.locator('[role="button"]').first();
  await expect(cartao).toBeVisible({ timeout: 15000 });
  const nome = (await cartao.locator('h4').first().innerText()).trim();
  await cartao.click();

  // Com variantes o MockupColorSelector pede a cor; sem variantes ele seleciona sozinho.
  const variante = page.getByRole('button', { name: /un$|Estoque zerado/ }).first();
  const selecionado = page.getByLabel('Remover produto selecionado');
  await expect(variante.or(selecionado).first()).toBeVisible({ timeout: 15000 });
  // count() não lança (0 = produto sem variantes, já confirmado pelo componente):
  // evita clicar num botão que pode não existir sem engolir falha nenhuma.
  if ((await variante.count()) > 0) {
    await variante.click();
  }
  await expect(selecionado).toBeVisible({ timeout: 10000 });
  return nome;
}

/** Seleciona a primeira técnica compatível e devolve o nome dela. */
async function selecionarTecnica(page: Page): Promise<string> {
  await page.getByTestId('mockup-technique-select-trigger').click();
  const opcao = page.locator('[role="option"]').first();
  await expect(opcao).toBeVisible({ timeout: 15000 });
  const nome = (await opcao.locator('span').first().innerText()).trim();
  await opcao.click();
  await expect(page.getByTestId('mockup-technique-select-trigger')).toContainText(nome);
  return nome;
}

/** Preenche empresa + produto + técnica e envia o logo na 1ª área de personalização. */
async function preencherComLogo(
  page: Page,
): Promise<{ cliente: string; produto: string; tecnica: string }> {
  const cliente = await selecionarCliente(page);
  await expect(page.getByTestId('mockup-client-chip')).toContainText(cliente);

  const produto = await selecionarPrimeiroProduto(page);
  const tecnica = await selecionarTecnica(page);

  await page.locator(LOGO_UPLOAD_INPUT).first().setInputFiles(LOGO);
  await expect(page.locator(LOGO_THUMB)).toBeVisible();
  await expect(page.locator(LOGO_PREVIEW)).toBeVisible();

  return { cliente, produto, tecnica };
}

test.describe('Mockup Module Comprehensive Flow', () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    // A análise de cor da logo é best-effort no produto: mockada para o teste não
    // depender da edge function nem gerar erro de console.
    await page.route(ROTA_ANALYZE_COLORS, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ colors: [] }),
      }),
    );
    await gotoAndSettle(page, '/mockup-generator');
  });

  test('completa empresa → produto → técnica → logo → geração com estado visível em cada etapa', async ({
    page,
  }) => {
    // 1-4. Preenche a configuração e o logo, conferindo o estado a cada passo.
    const { cliente, produto, tecnica } = await preencherComLogo(page);
    await expect(page.getByTestId('mockup-client-chip')).toContainText(cliente);
    await expect(page.getByLabel('Remover produto selecionado')).toBeVisible();
    await expect(page.getByText(produto, { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('mockup-technique-select-trigger')).toContainText(tecnica);

    // 5. Geração pela rota de IA mockada (não depende da edge function).
    await page.route(ROTA_GENERATE_MOCKUP, async (route) => {
      // Pequeno atraso para o overlay de geração ser observável.
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mockupUrl: MOCKUP_URL }),
      });
    });

    const gerarLayoutIa = page.getByRole('button', { name: /Gerar Layout - IA/i });
    await expect(gerarLayoutIa).toBeEnabled();
    await gerarLayoutIa.click();

    // 6. Overlay de geração visível enquanto a requisição está em curso.
    await expect(page.getByTestId('generating-overlay')).toBeVisible();

    // 7. Resultado persistido: card com a imagem gerada e o botão de download.
    const card = page.getByTestId('mockup-result-card');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card.locator(`img[src="${MOCKUP_URL}"]`)).toBeVisible();
    await expect(card.getByRole('button', { name: /Baixar/i })).toBeVisible();
  });

  test('limpa o estado visível de empresa, produto, técnica e logo ao resetar o formulário', async ({
    page,
  }) => {
    const { cliente, tecnica } = await preencherComLogo(page);
    await expect(page.getByTestId('mockup-client-chip')).toContainText(cliente);

    // Reset via botão do painel de configuração.
    await page.getByLabel('Limpar formulário').click();

    // Estado inicial restaurado (assertivas de estado, não só o body):
    await expect(page.getByTestId('mockup-client-chip')).toHaveCount(0);
    await expect(page.getByTestId('mockup-client-search-input')).toBeVisible();
    await expect(page.getByLabel('Remover produto selecionado')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Buscar produto/i })).toBeVisible();
    await expect(page.getByTestId('mockup-technique-select-trigger')).not.toContainText(tecnica);
    await expect(page.getByTestId('mockup-technique-select-trigger')).toContainText(
      /Selecione uma técnica/i,
    );
    await expect(page.locator(LOGO_THUMB)).toHaveCount(0);
    await expect(page.locator(LOGO_PREVIEW)).toHaveCount(0);
  });
});
