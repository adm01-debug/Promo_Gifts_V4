/**
 * E2E — posicionar o logo do editor de mockup SEM arrastar (só teclado).
 *
 * Cartão: e2e/flows/mockup-keyboard.spec.ts — depende do cartão de teclado do
 * editor (`v2/fix-arraste-e-ajuste-da-logo-com-teclado-*`), que dá foco ao
 * canvas do editor e trata as setas nele.
 *
 * Contrato asserido aqui (DOM do editor):
 *  - o canvas do editor (a área quadrada que contém a caixa do logo) é o
 *    elemento focável e é ele que recebe as setas;
 *  - ArrowLeft/ArrowRight movem o eixo X e ArrowUp/ArrowDown movem o eixo Y;
 *  - passo fino = 0,5% da área; Shift+seta = 5% (10x o passo fino);
 *  - a posição é limitada para o logo inteiro (com a rotação) caber na área —
 *    por isso o spec reduz a Área de Gravação ao mínimo antes de mover: com o
 *    logo pequeno nenhum passo é cortado pelos limites.
 *
 * Prova no estado VISÍVEL: o texto "Pos: X% × Y%" do painel de tamanho e o
 * deslocamento real da caixa do logo medido por boundingBox. O spec falha se a
 * navegação por teclado parar de mover o logo.
 *
 * Sem dados reais: nada é gerado nem gravado (nenhum clique em "Gerar
 * Layout"), nenhum dado de cliente é usado e o logo é o arquivo do próprio
 * repo. O catálogo de produtos é apenas consultado, como nos demais specs da
 * rota /mockup-generator.
 */
import { test, expect, requireAuth } from '../fixtures/test-base';
import type { Locator, Page } from '@playwright/test';
import path from 'node:path';
import { gotoAndSettle } from '../helpers/nav';

const LOGO_LOCAL = path.resolve('public/images/promo-brindes-logo.png');
const IMG_LOGO = 'img[alt="Logo para personalização"]';

/** Passos do teclado do editor, em % da área do canvas. */
const PASSO_FINO = 0.5;
const PASSO_GRANDE = 5;

/** Rótulos do estado visível ("Pos: 50% × 50%" / "Área: 10×5cm"). */
const RE_POSICAO = /Pos:\s*([\d.,]+)%\s*×\s*([\d.,]+)%/;
const RE_AREA = /Área:\s*([\d.,]+)×([\d.,]+)cm/;

/** Imagem do logo dentro do editor (renderizada só com logo + produto). */
function imagemDoLogo(page: Page): Locator {
  return page.locator(IMG_LOGO);
}

/** Caixa do logo: o elemento posicionado (left/top em %) que recebe o arraste. */
function caixaDoLogo(page: Page): Locator {
  return imagemDoLogo(page).locator('..');
}

/**
 * Canvas do editor: a área quadrada que contém a caixa do logo. É o elemento
 * focável que recebe as setas (no cartão do teclado ele é `role="group"` com o
 * rótulo acessível "Área de posicionamento do logo").
 */
function canvasDoEditor(page: Page): Locator {
  return caixaDoLogo(page).locator('..');
}

/** Lê a posição do logo no estado visível (o texto "Pos: X% × Y%"). */
async function lerPosicaoVisivel(page: Page): Promise<{ x: number; y: number }> {
  const texto =
    (await page
      .getByText(/Pos:\s*[\d.]/)
      .first()
      .textContent()) ?? '';
  const m = texto.match(RE_POSICAO);
  if (!m?.[1] || !m[2]) throw new Error(`Posição visível não encontrada no editor: "${texto}"`);
  return { x: Number.parseFloat(m[1]), y: Number.parseFloat(m[2]) };
}

/** Caixa delimitadora real do elemento (erro explícito se não estiver renderizado). */
async function medir(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Elemento sem caixa delimitadora — não está visível na página');
  return { x: box.x, y: box.y };
}

/** Seleciona o primeiro produto do catálogo e confirma a cor (somente leitura). */
async function selecionarPrimeiroProduto(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Buscar produto/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /Selecione o Produto/i })).toBeVisible();

  const cartao = dialog.locator('[role="button"]').first();
  await expect(cartao).toBeVisible({ timeout: 15000 });
  await cartao.click();

  // MockupColorSelector: com variantes pede a cor; sem variantes o próprio
  // componente seleciona o produto (useEffect em MockupColorSelector.tsx).
  const variante = page.getByRole('button', { name: /un$|Estoque zerado/ }).first();
  const selecionado = page.getByLabel('Remover produto selecionado');
  await expect(variante.or(selecionado).first()).toBeVisible({ timeout: 15000 });
  if ((await variante.count()) > 0) {
    await variante.click();
  }
  await expect(selecionado).toBeVisible({ timeout: 10000 });
}

/** Clica N vezes num botão de rótulo fixo (passo de 0,5cm do editor). */
async function clicar(page: Page, rotulo: string, vezes: number): Promise<void> {
  const botao = page.getByRole('button', { name: rotulo, exact: true });
  for (let i = 0; i < vezes; i += 1) {
    await botao.click();
  }
}

/**
 * Reduz a Área de Gravação para 1cm em largura e altura (o mínimo do editor).
 * O logo passa a ser pequeno em relação ao canvas, então os limites que mantêm
 * o logo dentro da área nunca cortam um passo de 0,5% ou 5%.
 */
async function reduzirAreaAoMinimo(page: Page): Promise<void> {
  const texto =
    (await page
      .getByText(/Área:\s*[\d.]/)
      .first()
      .textContent()) ?? '';
  const m = texto.match(RE_AREA);
  if (!m?.[1] || !m[2]) throw new Error(`Área de gravação não encontrada no editor: "${texto}"`);

  const cliquesAteMinimo = (atual: number) => Math.max(0, Math.ceil((atual - 1) / 0.5));
  await clicar(page, 'Diminuir largura', cliquesAteMinimo(Number.parseFloat(m[1])));
  await clicar(page, 'Diminuir altura', cliquesAteMinimo(Number.parseFloat(m[2])));
}

test.describe('editor de logo do mockup — posicionamento por teclado', () => {
  test.beforeEach(() => requireAuth());

  test('setas e Shift+setas movem o logo sem arrastar o mouse', async ({ page }) => {
    await gotoAndSettle(page, '/mockup-generator');

    // 1. Produto do catálogo — o editor só aparece com produto + imagem.
    await selecionarPrimeiroProduto(page);

    // 2. Logo do próprio repo (arquivo local) na Área 1.
    const upload = page.locator('input[data-testid^="mockup-logo-upload-input-"]').first();
    await upload.setInputFiles(LOGO_LOCAL);

    const caixa = caixaDoLogo(page);
    await expect(caixa).toBeVisible({ timeout: 20000 });

    // 3. Área mínima: nenhum passo é limitado pelos limites da área.
    await reduzirAreaAoMinimo(page);

    // 4. Ponto de partida determinístico (independe do rascunho salvo da conta).
    await page.getByRole('button', { name: 'Centro', exact: true }).click();
    await expect.poll(() => lerPosicaoVisivel(page)).toEqual({ x: 50, y: 50 });

    // 5. O canvas do editor é focável e é quem recebe as setas.
    const canvas = canvasDoEditor(page);
    await canvas.focus();
    await expect(canvas).toBeFocused();
    const larguraCanvas = (await canvas.boundingBox())?.width ?? 0;
    expect(larguraCanvas).toBeGreaterThan(0);

    // 6. Passo fino: uma seta = 0,5% da área.
    const antesFino = await medir(caixa);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => lerPosicaoVisivel(page)).toEqual({ x: 50 + PASSO_FINO, y: 50 });
    const depoisFino = await medir(caixa);
    const deslocamentoFino = depoisFino.x - antesFino.x;
    expect(deslocamentoFino).toBeGreaterThan(0);
    expect(Math.abs(deslocamentoFino - (larguraCanvas * PASSO_FINO) / 100)).toBeLessThan(1.5);

    // 7. Passo grande: Shift+seta = 5% da área (10x o passo fino).
    await page.keyboard.press('Shift+ArrowDown');
    await expect
      .poll(() => lerPosicaoVisivel(page))
      .toEqual({
        x: 50 + PASSO_FINO,
        y: 50 + PASSO_GRANDE,
      });
    const depoisGrande = await medir(caixa);
    expect(depoisGrande.y - depoisFino.y).toBeGreaterThan(deslocamentoFino * 5);

    // 8. Mesma navegação no sentido inverso (setas e Shift+setas).
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Shift+ArrowUp');
    await expect.poll(() => lerPosicaoVisivel(page)).toEqual({ x: 50, y: 50 });

    // 9. Tecla que não é seta não move o logo, e o canvas segue com o foco.
    await page.keyboard.press('a');
    await page.waitForTimeout(200);
    expect(await lerPosicaoVisivel(page)).toEqual({ x: 50, y: 50 });
    await expect(canvas).toBeFocused();
  });
});
