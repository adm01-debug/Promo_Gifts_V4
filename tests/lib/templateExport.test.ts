/**
 * `src/utils/templateExport.ts` não tinha NENHUM teste na main
 * (`git grep -l templateExport origin/main -- tests` voltava vazio), apesar de
 * ser o arquivo que o vendedor baixa e manda para fora da empresa.
 *
 * A única asserção de que o JSON exportado não vaza `id`/`seller_id` existia em
 * `tests/components/QuoteTemplatePreservation.test.tsx` de
 * `salvo/codex-fix-gate1-kit-pdf-types-261109-2252`, misturada num teste de
 * componente — e nunca rodou contra a main. Aqui ela vira teste próprio do
 * módulo, com os outros contratos do arquivo junto.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exportSingleTemplate,
  exportTemplatesToJson,
  validateImportedTemplates,
} from '@/utils/templateExport';
import type { QuoteTemplate } from '@/hooks/quotes/useQuoteTemplates';

let blobsGerados: Blob[] = [];
let nomesDeArquivo: string[] = [];

beforeEach(() => {
  blobsGerados = [];
  nomesDeArquivo = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
    blobsGerados.push(blob);
    return 'blob:fake';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    nomesDeArquivo.push(this.download);
  });
});
afterEach(() => vi.restoreAllMocks());

async function jsonExportado(): Promise<Record<string, unknown>> {
  expect(blobsGerados).toHaveLength(1);
  return JSON.parse(await blobsGerados[0].text()) as Record<string, unknown>;
}

function template(over: Record<string, unknown> = {}): QuoteTemplate {
  return {
    id: 'id-interno-da-linha',
    seller_id: 'uuid-da-vendedora',
    created_by: 'uuid-de-quem-criou',
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-11T00:00:00Z',
    name: 'Kit Boas-vindas',
    description: 'Para cliente novo',
    is_default: false,
    template_data: {},
    items: [{ productId: 'p1', productName: 'Caneca', quantity: 2, unitPrice: 25 }],
    discount_percent: 5,
    discount_amount: 0,
    notes: 'Observação para o cliente',
    internal_notes: 'Margem apertada, não dar mais desconto',
    payment_terms: '30 dias',
    delivery_time: '15 dias úteis',
    validity_days: 30,
    ...over,
  } as unknown as QuoteTemplate;
}

describe('exportTemplatesToJson não vaza identificador interno', () => {
  it.each(['id', 'seller_id', 'created_by', 'created_at', 'updated_at'])(
    'o campo %s não aparece no arquivo exportado',
    async (campo) => {
      exportTemplatesToJson([template()]);
      const dados = await jsonExportado();
      const exportado = (dados.templates as Record<string, unknown>[])[0];
      expect(exportado).not.toHaveProperty(campo);
    },
  );

  it('o conteúdo útil do template continua inteiro', async () => {
    exportTemplatesToJson([template()]);
    const dados = await jsonExportado();
    const exportado = (dados.templates as Record<string, unknown>[])[0];

    expect(exportado.name).toBe('Kit Boas-vindas');
    expect(exportado.items).toHaveLength(1);
    expect(exportado.discount_percent).toBe(5);
    expect(exportado.payment_terms).toBe('30 dias');
    expect(dados.version).toBe('1.0');
    expect(typeof dados.exportedAt).toBe('string');
  });

  it('nenhum uuid da linha sobrevive em lugar nenhum do arquivo', async () => {
    exportTemplatesToJson([template()]);
    const bruto = await blobsGerados[0].text();
    for (const segredo of [
      'id-interno-da-linha',
      'uuid-da-vendedora',
      'uuid-de-quem-criou',
    ]) {
      expect(bruto).not.toContain(segredo);
    }
  });
});

describe('exportSingleTemplate', () => {
  it('monta o nome do arquivo a partir do nome do template', () => {
    exportSingleTemplate(template({ name: 'Kit  Boas-Vindas / Cliente Novo!' }));
    expect(nomesDeArquivo).toEqual(['template-kit-boas-vindas-cliente-novo.json']);
  });

  it('nome só com símbolo não gera hífen solto no arquivo', () => {
    exportSingleTemplate(template({ name: '***' }));
    expect(nomesDeArquivo[0]).toBe('template-.json');
  });
});

describe('validateImportedTemplates: o arquivo vem do disco do vendedor', () => {
  it('aceita um arquivo bem formado', () => {
    const ok = { version: '1.0', exportedAt: 'x', templates: [{ name: 'Kit' }] };
    expect(validateImportedTemplates(ok)).toBe(ok);
  });

  it.each([
    ['nulo', null],
    ['string', 'nada disso'],
    ['array no lugar do objeto', []],
    ['sem version', { templates: [{ name: 'Kit' }] }],
    ['version vazia', { version: '', templates: [{ name: 'Kit' }] }],
    ['templates ausente', { version: '1.0' }],
    ['templates não é array', { version: '1.0', templates: {} }],
    ['template sem name', { version: '1.0', templates: [{ description: 'x' }] }],
    ['template com name vazio', { version: '1.0', templates: [{ name: '' }] }],
    ['template não é objeto', { version: '1.0', templates: ['Kit'] }],
  ])('recusa %s', (_rotulo, valor) => {
    expect(validateImportedTemplates(valor)).toBeNull();
  });
});
