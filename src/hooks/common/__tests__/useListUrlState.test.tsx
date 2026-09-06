/**
 * Testes unitários — `useListUrlState`.
 *
 * Cobre os contratos consumidos por `/carrinhos` (CartsListPage) e
 * `/orcamentos` (useQuotesListPage):
 *  - `clearAll()` remove TODOS os params gerenciados da URL (deadline/sort/q
 *    para carrinhos; status/sort/q para orçamentos).
 *  - Estado limpo sobrevive a reload (remontar o hook com URL limpa).
 *  - Deep-link com `q` na URL restaura o input imediatamente e o valor
 *    debounced (250ms) chega ao `values.q` após o debounce.
 *  - Digitação não polui a URL antes de ~250ms.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import React, { type ReactNode } from 'react';

import { useListUrlState } from '@/hooks/common/useListUrlState';

// Config idêntica à usada em CartsListPage.
const CARTS_KEYS = { status: 'all', deadline: 'all', sort: 'recent', q: '' } as const;

function makeWrapper(initialUrl: string) {
  let currentSearch = '';
  const LocationProbe = () => {
    const loc = useLocation();
    currentSearch = loc.search;
    return null;
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>
      <LocationProbe />
      {children}
    </MemoryRouter>
  );
  return { wrapper, getSearch: () => currentSearch };
}

describe('useListUrlState — contrato de /carrinhos (deadline/sort/q)', () => {
  it('clearAll remove deadline, sort e q da URL', async () => {
    const { wrapper, getSearch } = makeWrapper(
      '/carrinhos?deadline=overdue&sort=deadline-asc&q=abc&status=em_separacao',
    );
    const { result } = renderHook(
      () => useListUrlState({ keys: CARTS_KEYS, searchKey: 'q', debounceMs: 250 }),
      { wrapper },
    );

    // Precondição.
    expect(getSearch()).toMatch(/deadline=overdue/);
    expect(getSearch()).toMatch(/sort=deadline-asc/);
    expect(getSearch()).toMatch(/q=abc/);
    expect(getSearch()).toMatch(/status=em_separacao/);

    act(() => result.current.clearAll());

    await waitFor(() => {
      expect(getSearch()).not.toMatch(/deadline=/);
      expect(getSearch()).not.toMatch(/sort=/);
      expect(getSearch()).not.toMatch(/q=/);
      expect(getSearch()).not.toMatch(/status=/);
    });

    // Estado interno em defaults.
    expect(result.current.values.deadline).toBe('all');
    expect(result.current.values.sort).toBe('recent');
    expect(result.current.values.q).toBe('');
    expect(result.current.values.status).toBe('all');
    expect(result.current.searchInput).toBe('');
  });

  it('após clearAll, remontar (simula reload) mantém URL limpa', () => {
    const { wrapper, getSearch } = makeWrapper('/carrinhos');
    const { result } = renderHook(() => useListUrlState({ keys: CARTS_KEYS, searchKey: 'q' }), {
      wrapper,
    });
    expect(getSearch()).toBe('');
    expect(result.current.values.deadline).toBe('all');
    expect(result.current.values.sort).toBe('recent');
    expect(result.current.values.q).toBe('');
  });

  it('preserva params NÃO gerenciados quando clearAll é chamado', async () => {
    // Só limpa as chaves declaradas em `keys`. Params externos (paginação,
    // rastreio, etc.) devem permanecer intactos.
    const { wrapper, getSearch } = makeWrapper('/carrinhos?deadline=overdue&page=2&utm=email');
    const { result } = renderHook(() => useListUrlState({ keys: CARTS_KEYS, searchKey: 'q' }), {
      wrapper,
    });

    act(() => result.current.clearAll());
    await waitFor(() => {
      expect(getSearch()).not.toMatch(/deadline=/);
    });
    expect(getSearch()).toMatch(/page=2/);
    expect(getSearch()).toMatch(/utm=email/);
  });
});

describe('useListUrlState — debounce da busca (`q`, 250ms)', () => {
  it('deep-link com q na URL restaura o input imediatamente', () => {
    const { wrapper } = makeWrapper('/carrinhos?q=acme');
    const { result } = renderHook(
      () => useListUrlState({ keys: CARTS_KEYS, searchKey: 'q', debounceMs: 250 }),
      { wrapper },
    );
    // Input controlado reflete a URL sem esperar debounce (initial state).
    expect(result.current.searchInput).toBe('acme');
    expect(result.current.values.q).toBe('acme');
  });

  it('digitação só grava na URL após ~250ms (não polui durante digitação)', async () => {
    const { wrapper, getSearch } = makeWrapper('/carrinhos');
    const { result } = renderHook(
      () => useListUrlState({ keys: CARTS_KEYS, searchKey: 'q', debounceMs: 250 }),
      { wrapper },
    );

    act(() => result.current.setSearchInput('xy'));
    // Imediatamente após: URL AINDA não deve ter `q=xy`.
    expect(getSearch()).not.toMatch(/q=xy/);

    // Após o debounce: URL reflete.
    await waitFor(() => expect(getSearch()).toMatch(/q=xy/), { timeout: 1500 });
  });

  it('remontar (simula reload) com q na URL — valor restaura e values.q reflete', async () => {
    // Simula reload: nova montagem do hook com a mesma URL persistida.
    const { wrapper } = makeWrapper('/carrinhos?q=abc&deadline=overdue');
    const { result } = renderHook(
      () => useListUrlState({ keys: CARTS_KEYS, searchKey: 'q', debounceMs: 250 }),
      { wrapper },
    );

    // Input reidratado imediatamente.
    expect(result.current.searchInput).toBe('abc');
    // `values.q` (usado pelo filtro/lista) também.
    expect(result.current.values.q).toBe('abc');
    // Deadline preservado.
    expect(result.current.values.deadline).toBe('overdue');

    // Após o debounce, valor permanece consistente (não sobrescreveu com '').
    await waitFor(
      () => {
        expect(result.current.values.q).toBe('abc');
        expect(result.current.searchInput).toBe('abc');
      },
      { timeout: 1500 },
    );
  });
});

describe('useListUrlState — keys inline (regressão do loop de replaceState)', () => {
  // Cenário real: CartsListPage e ComparePage passam `keys` como objeto literal
  // (nova identidade a cada render). Antes do fix, o efeito de sync dependia de
  // `keys` → replaceState em todo render → nova location → re-render → loop
  // infinito ("Throttling navigation to prevent the browser from hanging").
  it('não entra em loop de navegação quando keys é um objeto novo a cada render (com escrita real na URL)', async () => {
    // Regressão anterior deste teste NÃO forçava nenhuma escrita real na URL
    // (a URL de teste não tinha nenhuma chave gerenciada, então o guard de
    // idempotência batia no primeiro render e `updateParam` nunca era
    // chamado — o teste passaria mesmo com o fix revertido). Este teste
    // força o ciclo completo do bug original: setSearchParams → nova
    // location → re-render → `keys` inline ganha NOVA identidade → efeito
    // de sync roda de novo com deps inalteradas → confirma que NÃO reabre
    // o loop.
    let locationChanges = 0;
    const Probe = () => {
      useLocation();
      locationChanges += 1;
      return null;
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/carrinhos?__bare=2&__bart=1']}>
        <Probe />
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(
      () =>
        useListUrlState({
          // Objeto literal inline — nova identidade em TODO render, inclusive
          // no re-render disparado pela escrita real abaixo.
          keys: { status: 'all', deadline: 'all', sort: 'recent', q: '' },
          searchKey: 'q',
          debounceMs: 250,
        }),
      { wrapper },
    );

    const changesAfterMount = locationChanges;

    // Gatilho real do bug original: digita um valor de busca que diverge do
    // default. Após o debounce, o efeito de sync chama `setSearchParams`,
    // a location muda, o hook re-renderiza e `keys` (inline) ganha nova
    // identidade — exatamente a condição que causava o loop pré-fix.
    act(() => result.current.setSearchInput('acme'));

    await waitFor(() => expect(result.current.values.q).toBe('acme'), { timeout: 1500 });

    // Tempo para qualquer disparo adicional do efeito assentar.
    await new Promise<void>((r) => {
      setTimeout(r, 400);
    });

    expect(result.current.values.q).toBe('acme');
    // A escrita real (1) + no máximo 1-2 re-renders de assentamento; um loop
    // produziria dezenas/centenas de mudanças de location.
    expect(locationChanges - changesAfterMount).toBeLessThanOrEqual(3);
  });

  it('não navega no mount quando a URL já reflete o estado (evita replaceState redundante)', async () => {
    let locationChanges = 0;
    const Probe = () => {
      useLocation();
      locationChanges += 1;
      return null;
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/carrinhos?q=abc&status=draft']}>
        <Probe />
        {children}
      </MemoryRouter>
    );

    renderHook(() => useListUrlState({ keys: CARTS_KEYS, searchKey: 'q', debounceMs: 250 }), {
      wrapper,
    });

    await new Promise<void>((r) => {
      setTimeout(r, 400);
    });
    expect(locationChanges).toBe(1);
  });
});
