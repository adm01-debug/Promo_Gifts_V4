/**
 * Corridas de `useKitCatalogPriceRefresh`, o resgate que tira o kit do beco sem
 * saída quando o catálogo ainda não informou preço.
 *
 * O caso central aqui foi achado por revisão adversarial, não por mim: com o
 * controle de "em voo" guardado como booleano, trocar de kit no meio de uma
 * consulta deixava `isRefreshing` em false — botão habilitado na tela — mas o
 * clique caía no `return` da guarda. Botão vivo e morto ao mesmo tempo, que é
 * exatamente o defeito que esta ação existe para resolver.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKitCatalogPriceRefresh } from '@/hooks/kit-builder/useKitCatalogPriceRefresh';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/** Promessa que só resolve quando o teste mandar. */
function controlavel<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((r) => {
    resolver = r;
  });
  return { promessa, resolver };
}

const kitVazio = {
  name: 'Kit',
  kitType: 'custom',
  box: null,
  items: [],
  personalization: {},
} as unknown as Parameters<typeof useKitCatalogPriceRefresh>[2]['kitState'];

function montar(scope: string, refetchItems: () => Promise<{ data?: unknown[] }>) {
  const loadKit = vi.fn();
  const goToStep = vi.fn();
  const deps = {
    refetchItems,
    refetchBoxes: async () => ({ data: [] }),
    loadKit,
    goToStep,
  } as unknown as Parameters<typeof useKitCatalogPriceRefresh>[1];
  const live = {
    kitState: kitVazio,
    kitQuantity: 1,
    step: 'items',
  } as unknown as Parameters<typeof useKitCatalogPriceRefresh>[2];

  const r = renderHook(
    ({ s }: { s: string }) => useKitCatalogPriceRefresh(s, deps, live),
    { initialProps: { s: scope } },
  );
  return { ...r, loadKit, goToStep };
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('useKitCatalogPriceRefresh — corridas', () => {
  it('trocar de kit com consulta em voo LIBERA o botão de verdade', async () => {
    const primeira = controlavel<{ data?: unknown[] }>();
    const chamadas: string[] = [];
    const refetchItems = vi.fn(async () => {
      chamadas.push('pedido');
      return chamadas.length === 1 ? primeira.promessa : { data: [] };
    });

    const { result, rerender } = montar('user-1:kit-A', refetchItems);

    // 1) dispara e deixa pendurado
    act(() => {
      void result.current.refresh();
    });
    expect(result.current.isRefreshing).toBe(true);
    expect(refetchItems).toHaveBeenCalledTimes(1);

    // 2) troca de kit ANTES de a consulta velha responder
    rerender({ s: 'user-1:kit-B' });
    expect(result.current.isRefreshing).toBe(false);

    // 3) o botão aparece habilitado — e tem de FUNCIONAR, não só parecer
    await act(async () => {
      await result.current.refresh();
    });
    expect(refetchItems).toHaveBeenCalledTimes(2);

    // 4) a resposta velha chega depois e não escreve nada
    await act(async () => {
      primeira.resolver({ data: [] });
      await primeira.promessa;
    });
  });

  it('dois cliques seguidos no mesmo kit disparam uma consulta só', async () => {
    const pendente = controlavel<{ data?: unknown[] }>();
    const refetchItems = vi.fn(async () => pendente.promessa);
    const { result } = montar('user-1:kit-A', refetchItems);

    act(() => {
      void result.current.refresh();
      void result.current.refresh();
    });

    expect(refetchItems).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendente.resolver({ data: [] });
      await pendente.promessa;
    });
  });

  it('depois que a consulta termina, o botão volta a funcionar', async () => {
    const refetchItems = vi.fn(async () => ({ data: [] }));
    const { result } = montar('user-1:kit-A', refetchItems);

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.refresh();
    });

    expect(refetchItems).toHaveBeenCalledTimes(2);
    expect(result.current.isRefreshing).toBe(false);
  });
});
