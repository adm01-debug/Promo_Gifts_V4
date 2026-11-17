/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/lib/legacy-kit-price-source.test.ts
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 8 · neste arquivo: 8
 * Casos em runtime: 10 de 10 (omitidos: 0)
 *
 * DRIFT ADAPTADO:
 * 1) Caminho de pasta: `@/hooks/useKitBuilderTransformers` ->
 * `@/hooks/kit-builder/useKitBuilderTransformers` (confirmado por ls:
 * src/hooks/kit-builder/useKitBuilderTransformers.ts). Os outros 4 imports
 * (`@/lib/kit-builder`, `@/lib/kit-builder/pricing-availability`,
 * `@/lib/kit-builder/persistence`, `@/lib/kit-builder/ai-composition`) existem sem
 * mudanca.
 *
 * 2) DRIFT DE CONTRATO (o real): o teste foi escrito contra uma implementacao em que
 * os transformers emitiam uma linha com `priceKnown: false` para preco
 * ausente/invalido. A main NAO seguiu esse caminho: o commit 4262d4a6c
 * "fix(kit-maker): bloqueia itens sem preco comercial" trocou `resolveProductPrice` de
 * `sale_price ?? base_price ?? 0` (retornava number) para retornar `number | null`
 * (src/hooks/kit-builder/useKitBuilderTransformers.ts:24-27), e os transformers
 * passaram a DESCARTAR a linha: `if (price === null) return null` em transformToKitBox
 * (linha 84) e em transformToKitItem (linha 115). Hoje `priceKnown` nunca e emitido
 * pelos transformers — so existe no tipo (src/lib/kit-builder/types.ts:20 e :61), na
 * hidratacao de rascunho (src/lib/kit-builder/snapshot/read-draft.ts:112 e :134) e em
 * `resolveKitCatalogPrice` (src/lib/kit-builder/pricing-availability.ts:21-30, sem
 * nenhum chamador em src/).
 *
 * 3) Adaptacao feita (invariante de cada caso preservada, assercao alinhada ao
 * contrato atual, nenhum caso removido nem skipado):
 *    - preco ausente (sale_price/base_price null): era `toMatchObject({id:'p1',
 * priceKnown:false})` -> agora `toBeNull()` nos dois transformers. Mesma invariante
 * coberta: preco ausente nunca vira R$ 0,00. Titulo renomeado para refletir o contrato
 * ("keeps a missing-price product out of the kit instead of pricing it at zero").
 *    - preco negativo (-7): era `{price:-7, priceKnown:false}` -> agora `toBeNull()`
 * nos dois, mais `formatKitLinePrice({price:-7, priceKnown:false}) === 'Preco
 * invalido'` (preserva a metade da cobertura que ainda vive,
 * pricing-availability.ts:17).
 *    - it.each NaN/Infinity/-Infinity (3 casos): era item com `price` bruto +
 * `priceKnown:false` + 'Preco invalido' -> agora `toBeNull()` nos dois transformers +
 * `formatKitLinePrice({price, priceKnown:false}) === 'Preco invalido'`. As duas
 * metades seguem cobertas.
 *    - base_price so quando sale_price falta: era `toMatchObject({price:0,
 * priceKnown:true})` (falhava porque o objeto atual nao tem a chave) -> agora
 * `item.price === 0` + `hasKnownKitPrice(item) === true`, que e a mesma semantica pela
 * API real (pricing-availability.ts:8 trata undefined como conhecido).
 *    - fronteira de persistencia (fail-closed): o item era construido por
 * `transformToKitItem({...product, sale_price:null})`, que hoje devolve null e
 * estourava TypeError dentro de hasKnownKitPrice. Agora a linha sem preco e montada do
 * jeito que a producao realmente produz hoje — forma de rascunho hidratado
 * (read-draft.ts:134 aceita `priceKnown` opcional): `{...requireItem(product),
 * priceKnown:false}`. A cobertura do guard `if (!hasKnownKitPrices(kitState)) throw
 * new Error(KIT_UNKNOWN_PRICE_MESSAGE)` (src/lib/kit-builder/persistence.ts:107) ficou
 * intacta, inclusive o `expect(state.items).toHaveLength(1)`.
 *    - 3 casos passaram sem nenhuma mudanca de assercao: zero comercial genuino,
 * filtro de IA (ai-composition.ts:63 e :115 ainda usam hasKnownKitPrice) e flags
 * historicas undefined/false.
 *
 * 4) Verificacoes extra: `npx eslint tests/lib/legacy-kit-price-source.test.ts` sem
 * achados; tsc isolado sobre o arquivo (strict, paths @/*) sem nenhum erro apontando
 * para o teste (os 16 erros sao `ImportMeta.env` de src/, artefato do meu tsconfig
 * ad-hoc sem vite/client, nao do teste). Nenhum .skip/.todo/xit no arquivo (grep).
 * Nenhum arquivo em src/ foi tocado.
 *
 * DEFEITO DE PRODUCAO QUE ESTE RESGATE REVELOU (nao corrigido aqui; src/ nao
 * foi alterado por esta PR):
 * Nenhum bug de producao. O que parecia bug e decisao deliberada e documentada: linha
 * de catalogo sem preco comercial e descartada em vez de entrar como "preco
 * desconhecido" (comentarios em
 * src/hooks/kit-builder/useKitBuilderTransformers.ts:82-84 "A missing commercial price
 * is not the same as a free packaging" e :113-115 "cannot be a priced line in a
 * kit/quote"; commit 4262d4a6c). Dois pontos de atencao de higiene, NAO bugs, que o
 * resgate expos e que valem PR separada: (a) `resolveKitCatalogPrice` em
 * src/lib/kit-builder/pricing-availability.ts:21-30 ficou sem nenhum chamador em src/
 * apos 4262d4a6c — e a unica funcao que ainda materializa `priceKnown` a partir de
 * produto de catalogo, hoje codigo morto; (b) `hasKnownKitPrice`
 * (src/lib/kit-builder/pricing-availability.ts:7-9) nao tolera `null`/`undefined` na
 * lista e estoura TypeError em `hasKnownKitPrices` (:12) se algum item da lista for
 * null — hoje inalcancavel pelos transformers (que filtram antes), mas e um fail-open
 * frágil se algum chamador futuro empurrar o retorno null do transformer direto para o
 * estado.
 *
 */
import { describe, expect, it, vi } from 'vitest';
import { transformToKitBox, transformToKitItem } from '@/hooks/kit-builder/useKitBuilderTransformers';
import type { ExternalProductForKit, KitItem } from '@/lib/kit-builder';
import {
  hasKnownKitPrice,
  hasKnownKitPrices,
  formatKitLinePrice,
} from '@/lib/kit-builder/pricing-availability';
import { buildKitPersistencePayload } from '@/lib/kit-builder/persistence';
import { resolveKitAICompositions } from '@/lib/kit-builder/ai-composition';

vi.mock('@/lib/external-db', async () => await import('@/lib/external-db/product-types'));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
const product: ExternalProductForKit = {
  id: 'p1',
  name: 'Produto real',
  sku: 'SKU',
  sale_price: 12,
  image_url: null,
  primary_image_url: null,
  width_cm: 2,
  height_cm: 3,
  length_cm: 4,
  internal_width_cm: 20,
  internal_height_cm: 30,
  internal_length_cm: 40,
};

function requireItem(source: ExternalProductForKit): KitItem {
  const item = transformToKitItem(source);
  if (!item) throw new Error('Fixture requires a priced catalog item');
  return item;
}

describe('legacy Gold price source preserves unknown and factual zero distinctly', () => {
  it('keeps a missing-price product out of the kit instead of pricing it at zero', () => {
    const source = { ...product, sale_price: null, base_price: null };
    expect(transformToKitItem(source)).toBeNull();
    expect(transformToKitBox(source)).toBeNull();
    expect(source.sale_price).toBeNull();
  });
  it('preserves a genuine zero selling price rather than falling back to an unrelated base value', () => {
    expect(transformToKitItem({ ...product, sale_price: 0, base_price: 99 })?.price).toBe(0);
    expect(transformToKitBox({ ...product, sale_price: 0, base_price: 99 })?.price).toBe(0);
  });
  it('does not convert an invalid negative price into a legitimate zero', () => {
    expect(transformToKitItem({ ...product, sale_price: -7 })).toBeNull();
    expect(transformToKitBox({ ...product, sale_price: -7 })).toBeNull();
    expect(formatKitLinePrice({ price: -7, priceKnown: false })).toBe('Preço inválido');
  });
  it.each([NaN, Infinity, -Infinity])(
    'rejects the invalid raw %s price instead of treating it as a priced line',
    (price) => {
      expect(transformToKitItem({ ...product, sale_price: price })).toBeNull();
      expect(transformToKitBox({ ...product, sale_price: price })).toBeNull();
      expect(formatKitLinePrice({ price, priceKnown: false })).toBe('Preço inválido');
    },
  );
  it('uses an actual base price only when the sale price is absent', () => {
    const fromBase = requireItem({ ...product, sale_price: null, base_price: 0 });
    expect(fromBase.price).toBe(0);
    expect(hasKnownKitPrice(fromBase)).toBe(true);
    const fromSale = requireItem({ ...product, sale_price: 12, base_price: 0 });
    expect(fromSale.price).toBe(12);
    expect(hasKnownKitPrice(fromSale)).toBe(true);
  });
  it('excludes unavailable financial facts from AI while retaining genuine zero compositions', () => {
    const item = requireItem({
      ...product,
      sale_price: 0,
      internal_width_cm: null,
      internal_height_cm: null,
      internal_length_cm: null,
    });
    const box = transformToKitBox({
      ...product,
      id: 'box',
      sale_price: 0,
      width_cm: 20,
      height_cm: 30,
      length_cm: 40,
    });
    expect(box).not.toBeNull();
    if (!box) throw new Error('Fixture requires a real compatible box');
    const brief = {
      kit_type: 'montado' as const,
      box_keywords: [],
      item_keywords: [],
      target_price_brl: { min: 0, max: 100 },
      narrative: 'Real',
    };
    expect(resolveKitAICompositions(brief, [{ ...item, priceKnown: false }], [box])).toEqual([]);
    expect(resolveKitAICompositions(brief, [item], [{ ...box, priceKnown: false }])).toEqual([]);
    expect(
      resolveKitAICompositions(brief, [item], [box]).length,
      JSON.stringify({ box, item }),
    ).toBeGreaterThan(0);
  });
  it('retains historical undefined flags and blocks only explicit false', () => {
    expect(hasKnownKitPrice({ price: 0 })).toBe(true);
    expect(hasKnownKitPrice({ price: 0, priceKnown: true })).toBe(true);
    expect(hasKnownKitPrice({ price: 0, priceKnown: false })).toBe(false);
    expect(formatKitLinePrice({ price: -7, priceKnown: false })).toBe('Preço inválido');
    expect(formatKitLinePrice({ price: 0, priceKnown: false })).toBe('Não informado');
  });
  it('fails closed at the shared persistence boundary without dropping the selected item', () => {
    // `priceKnown: false` chega hoje pela hidratação de rascunho
    // (src/lib/kit-builder/snapshot/read-draft.ts:134), não mais pelos
    // transformers — que descartam a linha sem preço (null).
    const item: KitItem = { ...requireItem(product), priceKnown: false };
    const state = {
      name: 'Draft',
      kitType: 'montado' as const,
      box: null,
      items: [item],
      personalization: { box: { enabled: false }, items: {} },
      totalItemsVolume: 24,
      availableVolume: 0,
      volumeUsagePercent: 0,
      totalWeight: 0,
      boxPrice: 0,
      itemsPrice: 0,
      personalizationPrice: 0,
      totalPrice: 0,
      isValid: false,
      validationErrors: [],
    };
    expect(hasKnownKitPrices(state)).toBe(false);
    expect(() => buildKitPersistencePayload('owner', state, 1)).toThrow(/preço não informado/);
    expect(state.items).toHaveLength(1);
  });
});
