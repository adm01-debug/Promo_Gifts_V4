/**
 * E2E — /mockup-generator: fluxo de upload de logo (bloqueio → liberação) e geração.
 *
 * Seletores conferidos nos componentes atuais da main (git grep data-testid / aria-label):
 *  - mockup-client-search-input / mockup-client-option- / mockup-client-chip
 *      -> src/components/mockup/MockupClientSelector.tsx
 *  - produto: botão "Buscar produto" + dialog "Selecione o Produto" + cartões [role="button"]
 *    + aria-label "Remover produto selecionado"
 *      -> src/components/mockup/MockupProductSelector.tsx (+ MockupColorSelector.tsx)
 *  - mockup-technique-select-trigger -> src/components/mockup/MockupConfigPanel.tsx
 *  - input[data-testid^="mockup-logo-upload-input-"] e img[alt="Miniatura do logo enviado"]
 *      -> src/components/mockup/AreaCard.tsx
 *  - img[alt="Logo para personalização"] -> src/components/mockup/logo-editor/LogoPreviewCanvas.tsx
 *  - botões "Gerar Layout" e "Gerar Layout - IA"
 *      -> src/components/mockup/approval/MockupLayoutButtons.tsx
 *  - mockup-art-file-dropzone -> src/components/mockup/ArtFileUpload.tsx
 *  - generating-overlay -> GeneratingOverlay.tsx; mockup-result-card + "Baixar" -> MockupResultCard.tsx
 *
 * O seletor de produto desta rota é MockupProductSelector.tsx (dialog). O data-testid
 * "mockup-product-combobox-trigger" (ProductSearchCombobox.tsx) NÃO é renderizado aqui — é do Magic Up.
 *
 * CUIDADOS verificados no código (não são estilo):
 *  1. MockupConfigPanel.tsx (MobileCollapsibleSection) renderiza os filhos de cada seção DUAS vezes: no
 *     bloco desktop (`hidden md:block`) e no bloco mobile (`md:hidden`). Empresa, técnica, miniatura do
 *     logo e dropzone existem 2x no DOM e o modo estrito do Playwright recusa um locator que resolve
 *     para 2 elementos, mesmo com um deles oculto. `visivel()` fica só com a cópia visível; getByRole
 *     já ignora a oculta.
 *  2. O 1º <span> de um SelectItem é o indicador de seleção (vazio): ler o nome da técnica por ali
 *     devolve "" e `toContainText("")` passa sempre. O nome vem do textContent da opção.
 *  3. Após "Gerar Layout - IA" bem-sucedido o MockupLayoutButtons abre o diálogo modal "Aprovação de
 *     Layout"; o Radix põe aria-hidden no resto da página e getByRole deixa de enxergar o card. O
 *     botão "Baixar" do card é buscado por CSS.
 *  4. O rascunho do formulário (mockup_drafts) é restaurado do backend no carregamento: o estado de um
 *     teste/spec anterior preencheria empresa/produto/técnica antes do passo 1. A rota é isolada.
 *
 * DEPENDÊNCIA: o botão "Gerar Layout - IA" será removido pelo cartão do compositor sem IA (e "Centro"
 * vira Horizontal/Ambos/Vertical). Quando entrar, trocar BOTAO_LAYOUT_IA pelo botão novo de geração.
 *
 * Depende de dados do ambiente de teste: empresa no CRM (external-db-bridge) e produto + técnica
 * compatível no catálogo. analyze-logo-colors, generate-mockup e mockup_drafts são mockados por rota.
 * O teste de geração ainda grava 1 linha em generated_mockups e sobe o logo ao storage do projeto
 * Supabase que o app aponta: rodar só com usuário/ambiente de teste.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import type { Locator, Page } from "@playwright/test";
import { gotoAndSettle } from "../helpers/nav";
import path from "node:path";

const LOGO = path.resolve("public/images/promo-brindes-logo.png");
const LOGO_UPLOAD_INPUT = 'input[data-testid^="mockup-logo-upload-input-"]';
const LOGO_THUMB = 'img[alt="Miniatura do logo enviado"]';
const LOGO_PREVIEW = 'img[alt="Logo para personalização"]';
const SEM_LOGO_HINT = /Faça upload do logo para posicioná-lo/i;
const BOTAO_LAYOUT = /^Gerar Layout$/i;
const BOTAO_LAYOUT_IA = /Gerar Layout - IA/i;
const ROTA_ANALYZE_COLORS = /\/functions\/v1\/analyze-logo-colors(\?|$|\/)/;
const ROTA_GENERATE_MOCKUP = /\/functions\/v1\/generate-mockup(\?|$|\/)/;
const ROTA_RASCUNHO = /\/rest\/v1\/mockup_drafts(\?|$)/;
const ROTA_OPCOES_PRODUTO = /\/rest\/v1\/rpc\/fn_get_product_customization_options/;
const MOCKUP_URL = "https://example.com/mockup.png";
// Atraso da resposta mockada: o overlay precisa ficar observável pelo polling do expect.
const ATRASO_GERACAO_MS = 1500;

/** Só a cópia visível (desktop ou mobile) de um elemento renderizado 2x pelo MobileCollapsibleSection. */
const visivel = (locator: Locator): Locator => locator.filter({ visible: true });

/** Clica no seletor de empresa e escolhe o primeiro registro do CRM. */
async function selecionarCliente(page: Page): Promise<string> {
  await visivel(page.getByTestId("mockup-client-search-input")).click();
  const opcao = page.locator('[data-testid^="mockup-client-option-"]').first();
  await opcao.waitFor({ state: "visible", timeout: 15000 });
  const nome = (await opcao.locator("span").first().innerText()).trim();
  expect(nome, "nome da empresa lido da opção").not.toBe("");
  await opcao.click();
  return nome;
}

/** Seleciona o primeiro produto no MockupProductSelector e confirma a cor. */
async function selecionarPrimeiroProduto(page: Page): Promise<string> {
  // As opções de personalização do produto só chegam DEPOIS da seleção. Antes disso a lista de
  // técnicas vem sem filtro; ao chegar, useMockupGenerator troca as áreas (apaga logo já enviado) e
  // limpa técnica incompatível. Conta as respostas para esperar por elas antes de escolher a técnica.
  let opcoesRecebidas = 0;
  page.on("response", (resposta) => {
    if (ROTA_OPCOES_PRODUTO.test(resposta.url())) opcoesRecebidas += 1;
  });

  await page.getByRole("button", { name: /Buscar produto/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /Selecione o Produto/i })).toBeVisible();

  const cartao = dialog.locator('[role="button"]').first();
  await expect(cartao).toBeVisible({ timeout: 15000 });
  const nome = (await cartao.locator("h4").first().innerText()).trim();
  expect(nome, "nome do produto lido do cartão").not.toBe("");
  await cartao.click();

  // Com variantes o MockupColorSelector pede a cor; sem variantes ele seleciona sozinho.
  const variante = page.getByRole("button", { name: /un$|Estoque zerado/ }).first();
  const selecionado = page.getByRole("button", { name: "Remover produto selecionado" });
  await expect(variante.or(selecionado).first()).toBeVisible({ timeout: 15000 });
  // count() não lança (0 = produto já selecionado sem variantes), então não
  // esconde falha nenhuma: só evita clicar num botão que pode não existir.
  if ((await variante.count()) > 0) {
    await variante.click();
  }
  await expect(selecionado).toBeVisible({ timeout: 10000 });
  await expect
    .poll(() => opcoesRecebidas, {
      message: "opções de personalização do produto recebidas",
      timeout: 15000,
    })
    .toBeGreaterThan(0);
  return nome;
}

/** Seleciona a primeira técnica compatível e devolve o texto dela (o mesmo que o gatilho passa a exibir). */
async function selecionarTecnica(page: Page): Promise<string> {
  const gatilho = visivel(page.getByTestId("mockup-technique-select-trigger"));
  await gatilho.click();
  const opcao = page.locator('[role="option"]').first();
  await expect(opcao).toBeVisible({ timeout: 15000 });
  // textContent: é o que toContainText compara, e o gatilho exibe a cópia do conteúdo da opção.
  const nome = ((await opcao.textContent()) ?? "").trim();
  expect(nome, "texto da técnica lido da opção").not.toBe("");
  await opcao.click();
  await expect(gatilho).toContainText(nome);
  await expect(gatilho).not.toHaveAttribute("data-placeholder");
  return nome;
}

/** Preenche empresa + produto + técnica e envia o logo na 1ª área de personalização. */
async function preencherComLogo(page: Page): Promise<void> {
  const cliente = await selecionarCliente(page);
  await expect(visivel(page.getByTestId("mockup-client-chip"))).toContainText(cliente);

  await selecionarPrimeiroProduto(page);
  await selecionarTecnica(page);

  await visivel(page.locator(LOGO_UPLOAD_INPUT)).first().setInputFiles(LOGO);
  await expect(page.locator(LOGO_PREVIEW)).toBeVisible();
}

test.describe("Mockup Module Upload Flow and Validations", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    // A análise de cor da logo é best-effort no produto: mockada para o teste não
    // depender da edge function.
    await page.route(ROTA_ANALYZE_COLORS, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ colors: [] }),
      }),
    );
    // Rascunho isolado: nada é restaurado de execuções anteriores e nada é gravado no banco.
    await page.route(ROTA_RASCUNHO, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
        : route.fulfill({ status: 204 }),
    );
    await gotoAndSettle(page, "/mockup-generator");
  });

  test("blocks the layout CTAs until a logo is uploaded, then enables them", async ({ page }) => {
    const cliente = await selecionarCliente(page);
    await expect(visivel(page.getByTestId("mockup-client-chip"))).toContainText(cliente);

    const produto = await selecionarPrimeiroProduto(page);
    const tecnica = await selecionarTecnica(page);

    const gerarLayout = page.getByRole("button", { name: BOTAO_LAYOUT });
    const gerarLayoutIa = page.getByRole("button", { name: BOTAO_LAYOUT_IA });

    // Sem logo: os CTAs existem, mas ficam desabilitados e o preview pede o upload.
    await expect(gerarLayout).toBeVisible();
    await expect(gerarLayoutIa).toBeVisible();
    await expect(gerarLayout).toBeDisabled();
    await expect(gerarLayoutIa).toBeDisabled();
    await expect(page.getByText(SEM_LOGO_HINT)).toBeVisible();
    await expect(page.locator(LOGO_PREVIEW)).toHaveCount(0);

    // Upload do logo na primeira área de personalização.
    await visivel(page.locator(LOGO_UPLOAD_INPUT)).first().setInputFiles(LOGO);

    // Estado visível: miniatura na área + logo posicionado no preview.
    await expect(visivel(page.locator(LOGO_THUMB))).toBeVisible();
    await expect(page.locator(LOGO_PREVIEW)).toBeVisible();
    await expect(page.getByText(SEM_LOGO_HINT)).toHaveCount(0);

    // Com logo: os dois CTAs liberam.
    await expect(gerarLayout).toBeEnabled();
    await expect(gerarLayoutIa).toBeEnabled();

    // As seleções anteriores continuam visíveis (estado, não só o body).
    await expect(page.getByRole("button", { name: "Remover produto selecionado" })).toBeVisible();
    await expect(visivel(page.getByText(produto, { exact: true })).first()).toBeVisible();
    await expect(visivel(page.getByTestId("mockup-technique-select-trigger"))).toContainText(
      tecnica,
    );
  });

  test("generates the mockup through the mocked IA route and shows the result card", async ({
    page,
  }) => {
    await preencherComLogo(page);

    await page.route(ROTA_GENERATE_MOCKUP, async (route) => {
      // Atraso para o overlay de geração ser observável.
      await new Promise((resolve) => setTimeout(resolve, ATRASO_GERACAO_MS));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, mockupUrl: MOCKUP_URL, mockup_url: MOCKUP_URL }),
      });
    });
    // A imagem do resultado vem de uma URL fictícia: serve a PNG versionada para o <img> ter
    // caixa de verdade e o teste não depender de example.com.
    await page.route(MOCKUP_URL, (route) => route.fulfill({ path: LOGO }));

    await page.getByRole("button", { name: BOTAO_LAYOUT_IA }).click();

    await expect(page.getByTestId("generating-overlay")).toBeVisible();

    const card = page.getByTestId("mockup-result-card");
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card.locator(`img[src="${MOCKUP_URL}"]`)).toBeVisible();
    // Por CSS e não por getByRole: o diálogo modal "Aprovação de Layout" abre depois da geração e
    // deixa o resto da página com aria-hidden.
    await expect(card.locator("button", { hasText: "Baixar" })).toBeVisible();
  });

  test("art-file dropzone rejects a non-vector file without attaching it", async ({ page }) => {
    const dropzone = visivel(page.getByTestId("mockup-art-file-dropzone"));
    await expect(dropzone).toBeVisible();

    // PNG não é vetorial: ArtFileUpload recusa por extensão antes de subir ao storage.
    await dropzone.locator('input[type="file"]').setInputFiles(LOGO);

    await expect(page.getByText(/formato não suportado/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Remover arquivo/ })).toHaveCount(0);
  });
});
