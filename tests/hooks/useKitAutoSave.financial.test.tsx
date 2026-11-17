/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/hooks/useKitAutoSave.financial.test.tsx
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 2 · neste arquivo: 2
 * Casos em runtime: 2 de 2 (omitidos: 0)
 *
 * DRIFT ADAPTADO:
 * 3 desvios reais, todos adaptados sem perder cobertura:
 *
 * 1) CAMINHO DO HOOK. O teste importava `@/hooks/useKitAutoSave`; hoje o arquivo vive
 * em `src/hooks/kit-builder/useKitAutoSave.ts` (confirmado por `ls
 * src/hooks/kit-builder/`). Import ajustado para `@/hooks/kit-builder/useKitAutoSave`.
 *
 * 2) ASSINATURA DO HOOK. O teste chamava `useKitAutoSave(state, 1, undefined)` (3
 * args). A assinatura atual tem 7 parâmetros e `currentRevision: number | null` é o 4º
 * obrigatório — src/hooks/kit-builder/useKitAutoSave.ts:73-81:
 *    `useKitAutoSave(kitState, kitQuantity, currentKitId, currentRevision,
 * onKitIdCreated?, enabled = true, context = {})`
 *    Chamada atualizada para `useKitAutoSave(state, 1, undefined, null)` (kit novo,
 * sem revisão).
 *
 * 3) CAMINHO DE GRAVAÇÃO (insert/update -> RPC atômica). O teste mockava
 * `supabase.from(...).insert/.update` e afirmava sobre `m.insert`/`m.update`. O hook
 * não grava mais assim: src/hooks/kit-builder/useKitAutoSave.ts:181-186 chama
 * `persistCustomKitAtomically(...)`, que em src/lib/kit-builder/persistence.ts:199 faz
 * `supabase.rpc('save_custom_kit_atomic', { p_request_id, p_kit_id,
 * p_expected_revision, p_payload })`. Mock trocado por `supabase: { rpc: m.rpc }` e as
 * asserções passaram a olhar a RPC. Mantive `buildKitPersistencePayload` REAL (não
 * mockei `@/lib/kit-builder/persistence`), para que a fronteira financeira sob teste
 * continue sendo o código de produção — é exatamente o padrão já adotado em main por
 * tests/hooks/useCustomKitPersistence.financial.test.tsx:17-30.
 *    Equivalência das asserções: "não chamou insert nem update" -> "não chamou rpc";
 * "insert chamado uma vez" -> "rpc chamada uma vez com `save_custom_kit_atomic` e
 * `p_kit_id: null`" (p_kit_id nulo é o caminho de criação, equivalente ao antigo
 * insert); "insert.mock.calls[0][0].items_data[0].price" ->
 * "rpc.mock.calls[0][1].p_payload.items_data[0].price".
 *
 * Não vacuoso: o caso 2 prova que o pipeline realmente dispara a RPC com o mesmo
 * estado; a única diferença no caso 1 é `priceKnown: false`.
 *
 * O comportamento testado continua existindo em produção:
 * src/lib/kit-builder/persistence.ts:107 (`if (!hasKnownKitPrices(kitState)) throw new
 * Error(KIT_UNKNOWN_PRICE_MESSAGE)`) +
 * src/lib/kit-builder/pricing-availability.ts:7-13 (`priceKnown !== false`), e o throw
 * é capturado em src/hooks/kit-builder/useKitAutoSave.ts:209-217 antes de qualquer ida
 * ao banco.
 *
 * Verificações extras: `npx eslint tests/hooks/useKitAutoSave.financial.test.tsx` sem
 * saída (limpo) e `npx tsc --noEmit -p tsconfig.eslint.json` sem nenhum erro apontando
 * este arquivo.
 *
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { KitState } from '@/lib/kit-builder';
const m = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rpc: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }));
// O main persiste pela RPC atômica `save_custom_kit_atomic`
// (src/lib/kit-builder/persistence.ts:199), não mais por insert/update direto
// em `supabase.from('custom_kits')`. A fronteira financeira é a mesma: nenhum
// payload com preço desconhecido pode chegar ao banco.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: m.rpc },
}));
import { useKitAutoSave } from '@/hooks/kit-builder/useKitAutoSave';
const kit: KitState = {
  name: 'Inicial',
  kitType: 'simples',
  box: null,
  items: [
    {
      id: 'p1',
      name: 'Caneta',
      sku: 'PEN',
      imageUrl: null,
      price: 5,
      width: 1,
      height: 1,
      depth: 1,
      volume: 1,
      quantity: 1,
    },
  ],
  personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 1,
  availableVolume: 0,
  volumeUsagePercent: 0,
  totalWeight: 0,
  boxPrice: 0,
  itemsPrice: 5,
  personalizationPrice: 0,
  totalPrice: 5,
  isValid: false,
  validationErrors: ['Selecione uma caixa'],
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  m.user = { id: 'u1' };
  m.rpc.mockResolvedValue({ data: { id: 'created', revision: 1 }, error: null });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function tick(ms = 5000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('Legacy autosave respects explicit financial availability', () => {
  it('never writes a tagged unknown price even after a real edit and elapsed debounce', async () => {
    const state = {
      ...kit,
      items: kit.items.map((item) => ({ ...item, price: 0, priceKnown: false })),
    };
    const { rerender } = renderHook(({ state }) => useKitAutoSave(state, 1, undefined, null), {
      initialProps: { state },
    });
    rerender({ state: { ...state, name: 'Edited missing price' } });
    await tick();
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('persists a genuine zero after an edit without changing the original undefined-flag contract', async () => {
    const state = { ...kit, items: kit.items.map((item) => ({ ...item, price: 0 })) };
    const { rerender } = renderHook(({ state }) => useKitAutoSave(state, 1, undefined, null), {
      initialProps: { state },
    });
    rerender({ state: { ...state, name: 'Edited factual zero' } });
    await tick();
    expect(m.rpc).toHaveBeenCalledOnce();
    expect(m.rpc.mock.calls[0][0]).toBe('save_custom_kit_atomic');
    // Kit novo: a RPC recebe p_kit_id null (equivalente ao antigo `insert`).
    expect(m.rpc.mock.calls[0][1].p_kit_id).toBeNull();
    expect(m.rpc.mock.calls[0][1].p_payload.items_data[0].price).toBe(0);
  });
});
