import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const artifacts = fs.mkdtempSync(join(tmpdir(), 'magazine-browser-results-'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1672, height: 941 }, serviceWorkers: 'block' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().includes('Failed to load resource: net::ERR_FAILED')) {
    errors.push(`console.error: ${message.text()}`);
  }
});
await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const results = [];
try {
  await page.goto('http://127.0.0.1:8098/magazine/templates');
  await page.getByTestId('template-preview-editorial-vogue').waitFor();
  const dimensions = await page.getByTestId('template-card-editorial-vogue').locator('.mag-page').evaluate(el => [el.clientWidth, el.clientHeight, Boolean(el.closest('.mag-scope'))]);
  assert.deepEqual(dimensions, [1920, 2716, true]);
  results.push('Galeria fria: A4 e escopo CSS');
  await page.getByTestId('template-use-editorial-mono').click();
  await page.getByTestId('page-title-magazine-editor').waitFor();
  assert.equal(await page.evaluate(() => window.__stored().templateId), 'editorial-mono');
  assert.equal(await page.evaluate(() => window.__calls.filter(c => c.method === 'create').length), 1);
  results.push('Criação real no contrato simulado com template selecionado');

  await page.evaluate(() => {
    window.__service.list = async () => [{ ...window.__stored(), id: 'published-fixture', status: 'published', publicToken: 'fixture-token' }];
    window.__navigate('/magazine');
  });
  const card = page.getByTestId('magazine-card-published-fixture');
  await card.waitFor();
  assert.equal(await card.getByRole('link', { name: 'Abrir revista', exact: true }).getAttribute('href'), '/revista-publica/fixture-token');
  assert.equal(await card.getByRole('button', { name: 'Opções da revista' }).isVisible(), true);
  results.push('Card publicado: CTA canônico e menu visível');

  await page.goto('http://127.0.0.1:8098/magazine/audit-magazine');
  await page.getByTestId('page-title-magazine-editor').waitFor();
  await page.waitForTimeout(200);
  const fit = await page.getByTestId('magazine-preview-aside').locator('.pg-stage').evaluate(stage => {
    const page = stage.querySelector('.mag-preview-wrapper').getBoundingClientRect();
    const outer = stage.getBoundingClientRect();
    return { pageHeight: page.height, available: stage.clientHeight, inside: page.top >= outer.top && page.bottom <= outer.bottom };
  });
  assert.equal(fit.inside, true, JSON.stringify(fit));
  results.push('Fit considera altura: página inteira dentro do stage');
  await page.getByTestId('magazine-title-input').fill('Atalho confirmado');
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => window.__stored().title === 'Atalho confirmado');
  results.push('Ctrl+S grava antes do debounce');

  await page.getByTestId('magazine-step-layout').click();
  await page.getByRole('button', { name: 'Estruturar páginas' }).click();
  await page.getByLabel('Título da página 2').fill('Nossa história');
  await page.getByLabel('Texto da página 2').fill('Conteúdo institucional renderizado.');
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => window.__stored().pageOrder?.version === 2);
  await page.getByRole('button', { name: /Ir para página 2: Nossa história/ }).click();
  await page.getByTestId('magazine-preview-aside').getByText('Conteúdo institucional renderizado.').waitFor();
  const structured = await page.evaluate(() => ({
    version: window.__stored().pageOrder.version,
    kinds: window.__stored().pageOrder.pages.map(page => page.kind),
  }));
  assert.equal(structured.version, 2);
  assert.equal(structured.kinds[0], 'cover');
  assert.equal(structured.kinds.at(-1), 'contact');
  results.push('Páginas estruturadas persistem e renderizam institucional/contato');

  await page.evaluate(() => { window.__service.update = async () => null; });
  await page.getByTestId('magazine-step-identity').click();
  await page.getByTestId('magazine-title-input').fill('Não persistido');
  await page.getByText('Falha ao salvar — tentar novamente').waitFor();
  assert.equal(await page.getByText('Salvo automaticamente', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => window.__stored().title), 'Atalho confirmado');
  results.push('Falha mantém edição pendente sem falso salvo');
  assert.deepEqual(errors, []);
  fs.writeFileSync(join(artifacts, 'verified-results.json'), JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length, artifacts, results, errors }, null, 2));
} finally {
  await browser.close();
}
