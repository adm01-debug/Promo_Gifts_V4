/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/hooks/useKitBuilderPageState.financial.test.tsx
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 8 · neste arquivo: 5
 * Casos em runtime: 6 de 9 (omitidos: 3)
 *
 * DRIFT ADAPTADO:
 * 1) Caminhos de módulo (remapeamento aplicado e confirmado com ls):
 * `@/hooks/useKitBuilderPageState` -> `@/hooks/kit-builder/useKitBuilderPageState`;
 * `@/hooks/useKitBuilderQueries` -> `@/hooks/kit-builder/useKitBuilderQueries`;
 * `@/hooks/useKitUndoRedo` -> `@/hooks/kit-builder/useKitUndoRedo`;
 * `@/hooks/useTemplateSnapshot` -> `@/hooks/kit-builder/useTemplateSnapshot`;
 * `@/hooks/useDuplicateKitDetector` -> `@/hooks/kit-builder/useDuplicateKitDetector`.
 *
 * 2) O arquivo veio da branch que ainda tinha DUAS implementações do hook:
 * `src/hooks/useKitBuilderPageState.ts` (legada, com gate financeiro) e
 * `src/hooks/kit-builder/useKitBuilderPageState.ts`. Na main só sobrou a segunda, e
 * ela NÃO tem o gate financeiro. Evidência: na branch,
 * `src/hooks/useKitBuilderPageState.ts:17` importa `hasKnownKitPrice,
 * hasKnownKitPrices, KIT_UNKNOWN_PRICE_MESSAGE`, define `pricesKnown` (linha 100),
 * passa `pricesKnown` no 6o argumento de `useKitAutoSave` (linha 116), bloqueia save
 * (linha 222), orçamento (linha 256) e composição de IA (linhas 279-282), expõe
 * `refreshCatalogPrices` (linha 304, retornada na 397) e `pricesKnown` em `meta`
 * (linha 408). Na main, `src/hooks/kit-builder/useKitBuilderPageState.ts:535-543`
 * expõe apenas `isSaving, isAutoSaving, isCreatingQuote, lastSavedAt, autoSaveError,
 * isConflictError, pricing` — sem `pricesKnown`; e `grep -rn refreshCatalogPrices
 * src/` não retorna nada.
 *
 * 3) Contrato de `useKitBuilderQueries` mudou: hoje retorna `boxError`/`itemError`
 * (src/hooks/kit-builder/useKitBuilderQueries.ts:385-386), não
 * `boxQueryError`/`itemQueryError` — mock corrigido.
 *
 * 4) `useKitUndoRedo` agora é consumido com `pushSnapshot` e `isRestoring`
 * (src/hooks/kit-builder/useKitBuilderPageState.ts:148-155, 158-168); o mock antigo só
 * devolvia undo/redo/canUndo/canRedo e derrubava o render. Adicionados ao mock.
 *
 * 5) Novo hook `useCustomKitsRealtime` passou a ser chamado pelo page state (linha
 * 120). Ele usa `useQueryClient` e `supabase.channel`
 * (src/hooks/kit-builder/useCustomKitsRealtime.ts:7-23), que não existem no ambiente
 * do teste — mockado.
 *
 * 6) `updateItemVariant` hoje exige `variantData.id` e endereça a linha por `lineId`,
 * não por `item.id`: `addItem` normaliza para `${id}:base`
 * (src/lib/kit-builder/types.ts:153-163) e a troca de variante reescreve o lineId para
 * `${id}:${variantId}` (src/hooks/kit-builder/useKitBuilder.ts:322-352). As duas
 * chamadas originais usavam `item.id` sem `id` de variante — eram no-ops silenciosos
 * (o 1o assert passava por coincidência, o 2o falhava). Reendereçadas para
 * `${id}:base` e `${id}:variant-1`, com `id` de variante explícito e assert adicional
 * de `selectedVariantId` para garantir que a chamada não é vazia.
 *
 * 7) O fato financeiro que o teste cobria via `meta.pricesKnown` continua existindo,
 * mas migrou para a validação do kit: `getKitValidationErrors` inclui 'Há preço não
 * informado ou inválido no kit' quando `hasKnownKitPrices` é falso
 * (src/lib/kit-builder/validate-composition.ts:25-26). Os asserts de
 * `meta.pricesKnown` foram remapeados para `kitState.isValid` /
 * `kitState.validationErrors`, que é a superfície que a UI consome
 * (src/components/kit-builder/kit-summary/KitActionsBar.tsx:44-79).
 *
 * OMISSOES, COM EVIDENCIA MEDIDA (A, B e C foram RESTAURADOS depois, junto com o
 * resgate de `refreshCatalogPrices` para `src/hooks/kit-builder/useKitCatalogPriceRefresh.ts`
 * — ver os três últimos casos deste arquivo):
 * 3 casos removidos (sem skip/todo/comentário — removidos do arquivo):
 *
 * A) 'confirmed catalog refresh repairs only unknown prices and preserves the complete
 * selected snapshot' — esperava `result.current.actions.refreshCatalogPrices()`.
 * Medido: `TypeError: result.current.actions.refreshCatalogPrices is not a function`.
 * A ação existia só na implementação legada da branch
 * (`src/hooks/useKitBuilderPageState.ts:304` e retorno na linha 397), arquivo que não
 * existe mais na main. O bloco `actions` atual
 * (src/hooks/kit-builder/useKitBuilderPageState.ts:457-534) não tem nenhuma ação de
 * refresh de preço, e `grep -rn "refreshCatalogPrices" src/` não retorna nada.
 *
 * B) 'a failed catalog refresh never promotes stale cached facts to a known price' —
 * mesma causa: mesmo TypeError na mesma ação inexistente.
 *
 * C) 'a catalog reply for a previous account cannot update the current snapshot' —
 * mesma causa: mesmo TypeError na mesma ação inexistente (guarda de corrida por conta
 * vivia dentro de `refreshCatalogPrices`).
 *
 * Asserts removidos de casos que FICARAM (cobertura reduzida, não escondida):
 *
 * D) Caso 'keeps unknown items selected but blocks manual save, quote, AI, and
 * automatic saving' foi renomeado para 'keeps unknown items selected and invalidates
 * the composition' e perdeu 5 asserts: `meta.pricesKnown === false`, `m.autoArgs[5]
 * === false`, `m.save` não chamado, `m.quote` não chamado e nome do kit não
 * sobrescrito pela IA. Medição direta (assert de sonda com o estado real, executada
 * neste worktree): `{ save: 1, quote: 1, name: 'Kit real', autoArgs5: true }` — ou
 * seja, com `priceKnown: false` a produção atual CHAMA saveKit, CHAMA createQuote,
 * APLICA a composição de IA e mantém o autosave habilitado. `handleSaveKit`
 * (src/hooks/kit-builder/useKitBuilderPageState.ts:309-366), `handleAddToQuote`
 * (367-393) e `applyAISuggestion` (394-420) não têm nenhuma verificação de preço, e o
 * 6o argumento de `useKitAutoSave` (134-147) só considera hidratação/quantidade. O que
 * sobrou do caso cobre o fato que ainda existe: o flag `priceKnown: false` sobrevive
 * ao `addItem` e derruba `kitState.isValid` com a mensagem 'Há preço não informado ou
 * inválido no kit'.
 *
 * E) Caso 'honors a genuine zero price and the historical undefined flag':
 * `expect(meta.pricesKnown).toBe(true)` substituído por
 * `expect(kitState.validationErrors).not.toContain('Há preço não informado ou inválido
 * no kit')` — mesmo fato, superfície atual (`meta` não tem `pricesKnown`: linhas
 * 535-543).
 *
 * F) Caso do callback de variante: removido `expect(m.autoArgs[5]).toBe(false)` — na
 * main esse argumento não reflete mais preço (linhas 143-146), ele valia `true` na
 * medição da sonda.
 *
 * DEFEITO DE PRODUCAO QUE ESTE RESGATE REVELOU (nao corrigido aqui; src/ nao
 * foi alterado por esta PR):
 * Lacuna real de defesa em profundidade (medida, não inferida): com `priceKnown:
 * false` o hook `src/hooks/kit-builder/useKitBuilderPageState.ts` deixa passar as três
 * ações financeiras e mantém o autosave ligado. Sonda executada neste worktree com um
 * item `price: 0, priceKnown: false` retornou `{ save: 1, quote: 1, name: 'Kit real',
 * autoArgs5: true }`.
 * - `handleSaveKit` (src/hooks/kit-builder/useKitBuilderPageState.ts:309-366): não
 * verifica preço; chama `saveKit` e persiste o kit com preço desconhecido.
 * - `handleAddToQuote` (src/hooks/kit-builder/useKitBuilderPageState.ts:367-393): não
 * verifica preço; chama `createQuote`.
 * - `applyAISuggestion` (src/hooks/kit-builder/useKitBuilderPageState.ts:394-420):
 * aplica a composição da IA sem checar preço.
 * - `useKitAutoSave` (src/hooks/kit-builder/useKitBuilderPageState.ts:134-147): o flag
 * de habilitação não inclui `pricesKnown`, então o rascunho com preço inválido é salvo
 * automaticamente.
 * A versão legada do hook bloqueava os quatro caminhos com `KIT_UNKNOWN_PRICE_MESSAGE`
 * (branch origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252,
 * src/hooks/useKitBuilderPageState.ts:222, 256, 279-282, 116). Hoje a proteção existe
 * somente na UI, via `hasKnownKitPrices` nos componentes
 * (src/components/kit-builder/kit-summary/KitActionsBar.tsx:44, 53, 58, 79 e
 * src/components/kit-builder/KitSummary.tsx:82, 303-304): botão desabilitado, mas a
 * função do hook continua chamável (atalho de teclado, chamada programática, outro
 * consumidor). Não alterei src/ — ajustei o teste ao contrato atual. Também sumiu a
 * ação `refreshCatalogPrices`, que era o único caminho de UI para reparar preços
 * desconhecidos sem recarregar o kit.
 *
 */
import type { KitBox, KitItem } from '@/lib/kit-builder';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { hasKnownKitPrices } from '@/lib/kit-builder/pricing-availability';
const m = vi.hoisted(() => ({
  user: { id: 'u1' },
  search: '',
  saved: [] as unknown[],
  loading: false,
  saving: false,
  autoSaving: false,
  save: vi.fn(),
  cancel: vi.fn(),
  ack: vi.fn(),
  autoArgs: [] as unknown[],
  invoke: vi.fn(),
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
  filters: vi.fn(),
  quote: vi.fn(),
  refetchItems: vi.fn(),
  refetchBoxes: vi.fn(),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('sonner', () => ({ toast: m.toast }));
vi.mock('react-router-dom', () => ({ useSearchParams: () => [new URLSearchParams(m.search)] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/hooks/kit-builder/useCustomKitPersistence', () => ({
  useCustomKitPersistence: () => ({
    savedKits: m.saved,
    isLoadingKits: m.loading,
    isSaving: m.saving,
    saveKit: m.save,
  }),
}));
vi.mock('@/hooks/kit-builder/useKitAutoSave', () => ({
  useKitAutoSave: (...args: unknown[]) => {
    m.autoArgs = args;
    return {
      lastSavedAt: null,
      isSaving: m.autoSaving,
      autoSavedKitId: null,
      autoSaveError: null,
      isConflictError: false,
      cancelPendingSave: m.cancel,
      acknowledgeManualSave: m.ack,
      retryLastSave: vi.fn(),
    };
  },
}));
vi.mock('@/hooks/kit-builder/useKitUndoRedo', () => ({
  useKitUndoRedo: () => ({
    pushSnapshot: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    isRestoring: { current: false },
  }),
}));
vi.mock('@/hooks/kit-builder/useTemplateSnapshot', () => ({ useTemplateSnapshot: vi.fn() }));
vi.mock('@/hooks/kit-builder/useDuplicateKitDetector', () => ({
  useDuplicateKitDetector: vi.fn(),
}));
vi.mock('@/pages/kit-builder/useKitBuilderQuote', () => ({
  useKitBuilderQuote: () => ({ handleAddToQuote: m.quote, isCreatingQuote: false }),
}));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: m.invoke }));
vi.mock('@/lib/external-db', async () => await import('@/lib/external-db/product-types'));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/hooks/kit-builder/useCustomKitsRealtime', () => ({ useCustomKitsRealtime: vi.fn() }));
const box: KitBox = {
  id: 'actual-box',
  name: 'Caixa real',
  sku: 'BOX',
  imageUrl: null,
  price: 20,
  internalWidth: 30,
  internalHeight: 20,
  internalDepth: 10,
  internalVolume: 6000,
  maxWeight: 2000,
};
const item: KitItem = {
  id: 'actual-item',
  name: 'Caneta real',
  sku: 'PEN',
  imageUrl: null,
  price: 5,
  width: 2,
  height: 1,
  depth: 1,
  volume: 2,
  weight: 10,
  quantity: 1,
};
const boxes = [box],
  items = [item];
vi.mock('@/hooks/kit-builder/useKitBuilderQueries', () => ({
  useKitBuilderQueries: () => ({
    availableBoxes: boxes,
    availableItems: items,
    completeBoxCatalog: boxes,
    completeItemCatalog: items,
    isLoadingBoxes: false,
    isLoadingItems: false,
    boxFilters: {},
    itemFilters: {},
    setBoxFilters: m.filters,
    setItemFilters: m.filters,
    boxError: null,
    itemError: null,
    refetchBoxes: m.refetchBoxes,
    refetchItems: m.refetchItems,
  }),
}));
import {
  toSavedKitSnapshot,
  useKitBuilderPageState,
} from '@/hooks/kit-builder/useKitBuilderPageState';
const saved = () => ({
  id: 'saved-1',
  user_id: 'u1',
  revision: 4,
  name: 'Salvo',
  kit_type: 'simples',
  box_data: box,
  items_data: [item],
  personalization_data: {
    box: { enabled: false },
    items: {},
    __draft: {
      quoteClient: { client_id: 'real-client' },
      flow: 'items-first',
      notes: 'partial kept',
    },
  },
  kit_quantity: 12,
  color: '#123456',
  icon: 'Star',
  tag: 'tag',
  description: 'descrição',
  is_favorite: true,
});
beforeEach(() => {
  vi.clearAllMocks();
  item.price = 5;
  delete item.priceKnown;
  box.price = 20;
  delete box.priceKnown;
  m.refetchItems.mockResolvedValue({ data: [item], error: null });
  m.refetchBoxes.mockResolvedValue({ data: [box], error: null });
  m.user = { id: 'u1' };
  m.search = '';
  m.saved = [];
  m.loading = false;
  m.saving = false;
  m.autoSaving = false;
  m.save.mockResolvedValue({ id: 'saved-new', revision: 1 });
  m.invoke.mockResolvedValue({ records: [], count: 0 });
});
afterEach(cleanup);
async function fill(result: { current: ReturnType<typeof useKitBuilderPageState> }) {
  act(() => {
    result.current.actions.selectBox(box);
  });
  act(() => {
    result.current.actions.addItem(item);
  });
}

describe('Legacy financial availability reaches UI state and every action boundary', () => {
  it('snapshot hydration preserves the unavailable flag and partial JSON without editing the original row', () => {
    const row = {
      ...saved(),
      items_data: [{ ...item, price: 0, priceKnown: false, future: { keep: 'partial' } }],
    };
    const before = structuredClone(row);
    const snapshot = toSavedKitSnapshot(row);
    expect(snapshot?.items[0]).toMatchObject({
      price: 0,
      priceKnown: false,
      future: { keep: 'partial' },
    });
    expect(row).toEqual(before);
  });
  it.each([null, 'false'])(
    'rejects malformed priceKnown=%s rather than treating it as known',
    (flag) => {
      expect(
        toSavedKitSnapshot({ ...saved(), items_data: [{ ...item, priceKnown: flag }] }),
      ).toBeNull();
      expect(toSavedKitSnapshot({ ...saved(), box_data: { ...box, priceKnown: flag } })).toBeNull();
    },
  );
  it('keeps unknown items selected and invalidates the composition', async () => {
    item.price = 0;
    item.priceKnown = false;
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    expect(result.current.state.kitState.items).toHaveLength(1);
    expect(result.current.state.kitState.items[0].priceKnown).toBe(false);
    expect(result.current.state.kitState.isValid).toBe(false);
    expect(result.current.state.kitState.validationErrors).toContain(
      'Há preço não informado ou inválido no kit',
    );
  });
  it('honors a genuine zero price and the historical undefined flag', async () => {
    item.price = 0;
    item.priceKnown = true;
    box.price = 0;
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    expect(result.current.state.kitState.validationErrors).not.toContain(
      'Há preço não informado ou inválido no kit',
    );
    await act(async () => result.current.actions.handleSaveKit());
    expect(m.save).toHaveBeenCalledOnce();
    expect(m.save.mock.calls[0][0].items[0].price).toBe(0);
  });
  it('a variant callback cannot relabel an unknown price as known or normalize a negative value', async () => {
    item.price = 0;
    item.priceKnown = false;
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    act(() =>
      result.current.actions.updateItemVariant(`${item.id}:base`, {
        id: 'variant-1',
        color: { name: 'Azul' },
        price: 0,
      }),
    );
    expect(result.current.state.kitState.items[0]).toMatchObject({
      price: 0,
      priceKnown: false,
      selectedVariantId: 'variant-1',
    });
    act(() =>
      result.current.actions.updateItemVariant(`${item.id}:variant-1`, {
        id: 'variant-2',
        color: { name: 'Azul' },
        price: -7,
      }),
    );
    expect(result.current.state.kitState.items[0]).toMatchObject({
      price: -7,
      priceKnown: false,
      selectedVariantId: 'variant-2',
    });
  });
  it('confirmed catalog refresh repairs only unknown prices and preserves the complete selected snapshot', async () => {
    const source = saved();
    const selected = {
      ...item,
      price: 0,
      priceKnown: false,
      quantity: 4,
      selectedVariantId: 'variant-1',
      selectedColor: { name: 'Azul', hex: '#00f' },
      personalizationNotes: 'Keep notes',
      future: { keep: true },
    };
    source.items_data = [selected];
    m.saved = [source];
    m.search = 'kit=saved-1';
    const before = structuredClone(source);
    const { result } = renderHook(useKitBuilderPageState);
    await waitFor(() => expect(result.current.state.isHydrating).toBe(false));
    const personalization = structuredClone(result.current.state.kitState.personalization);
    m.refetchItems.mockResolvedValue({
      data: [{ ...item, price: 0, priceKnown: true }],
      error: null,
    });
    await act(async () => result.current.actions.refreshCatalogPrices());
    expect(result.current.state.kitState.items[0]).toMatchObject({
      price: 0,
      priceKnown: true,
      quantity: 4,
      selectedVariantId: 'variant-1',
      selectedColor: { name: 'Azul', hex: '#00f' },
      personalizationNotes: 'Keep notes',
      future: { keep: true },
    });
    expect(result.current.state.kitState.personalization).toEqual(personalization);
    expect(result.current.state.kitQuantity).toBe(12);
    expect(source).toEqual(before);
    expect(hasKnownKitPrices(result.current.state.kitState)).toBe(true);
    expect(m.save).not.toHaveBeenCalled();
  });
  it('a failed catalog refresh never promotes stale cached facts to a known price', async () => {
    item.price = 0;
    item.priceKnown = false;
    const { result } = renderHook(useKitBuilderPageState);
    await fill(result);
    m.refetchItems.mockResolvedValue({
      data: [{ ...item, price: 99, priceKnown: true }],
      error: new Error('offline'),
    });
    await act(async () => result.current.actions.refreshCatalogPrices());
    expect(result.current.state.kitState.items[0].priceKnown).toBe(false);
    expect(result.current.state.kitState.items[0].price).toBe(0);
    expect(hasKnownKitPrices(result.current.state.kitState)).toBe(false);
  });
  it('a catalog reply for a previous account cannot update the current snapshot', async () => {
    item.price = 0;
    item.priceKnown = false;
    let resolve: ((value: { data: KitItem[]; error: null }) => void) | undefined;
    m.refetchItems.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { result, rerender } = renderHook(useKitBuilderPageState);
    await fill(result);
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.actions.refreshCatalogPrices();
    });
    m.user = { id: 'another-account' };
    rerender();
    await act(async () => {
      resolve?.({ data: [{ ...item, price: 12, priceKnown: true }], error: null });
      await pending;
    });
    expect(result.current.state.kitState.items[0].priceKnown).toBe(false);
    expect(m.toast.success).not.toHaveBeenCalled();
  });
  it('a catalog reply that arrives after unmount writes nothing', async () => {
    item.price = 0;
    item.priceKnown = false;
    let resolve: ((value: { data: KitItem[]; error: null }) => void) | undefined;
    m.refetchItems.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { result, unmount } = renderHook(useKitBuilderPageState);
    await fill(result);
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.actions.refreshCatalogPrices();
    });
    unmount();
    resolve?.({ data: [{ ...item, price: 12, priceKnown: true }], error: null });
    await pending;
    expect(m.toast.success).not.toHaveBeenCalled();
    expect(m.toast.info).not.toHaveBeenCalled();
  });
});
