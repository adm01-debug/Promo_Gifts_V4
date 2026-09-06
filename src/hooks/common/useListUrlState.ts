/**
 * useListUrlState — SSOT para páginas de lista que sincronizam filtros/ordem/busca
 * com a query string.
 *
 * Contrato:
 *  - `keys` é o mapa `chave → valor default`. Valores default são REMOVIDOS
 *    da URL para não poluir deep-links (`?status=all` fora, `?status=draft` dentro).
 *  - `searchKey` (opcional) marca a chave textual que precisa de debounce.
 *    Para essa chave: `searchInput` reflete a digitação imediata; `values[searchKey]`
 *    é o valor debounced que já foi para a URL.
 *  - `setValue(key, value)` grava direto (replaceState).
 *  - `setSearchInput(value)` atualiza só o input local; o debounce escreve na URL.
 *  - `clearAll()` volta tudo pro default → URL sem params.
 *
 * Consumidores: /orcamentos (useQuotesListPage) e /carrinhos (CartsListPage).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/common/useDebounce';

export interface UseListUrlStateConfig<K extends string> {
  keys: Record<K, string>;
  searchKey?: NoInfer<K>;
  debounceMs?: number;
}

export interface UseListUrlStateReturn<K extends string> {
  values: Record<K, string>;
  setValue: (key: K, value: string) => void;
  searchInput: string;
  setSearchInput: (value: string) => void;
  clearAll: () => void;
}

export function useListUrlState<K extends string>(
  config: UseListUrlStateConfig<K>,
): UseListUrlStateReturn<K> {
  const { keys, searchKey, debounceMs = 250 } = config;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigationType = useNavigationType();
  const locationKey = useLocation().key;

  // Snapshot ESTÁVEL POR CONTEÚDO de `keys` — não só por render. `keys`
  // costuma chegar inline (CartsListPage, ComparePage: nova identidade a
  // cada render), mas o mapa chave→default em si raramente muda de
  // conteúdo. Memoizar por `keysSignature` (não por `keys` em si) mantém
  // `keyList`/`values`/`setValue`/`clearAll` com identidade estável entre
  // renders com conteúdo igual — generaliza a proteção do efeito de sync
  // abaixo para qualquer consumidor futuro que venha a usar esses valores
  // em deps de outro efeito (achado da auditoria 2026-09: antes disso,
  // esses 4 dependiam de `keys` bruto e eram recriados a cada render).
  const keysSignature = JSON.stringify(keys);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keysSignature é o proxy de conteúdo; `keys` é reatribuído a cada render de propósito.
  const stableKeys = useMemo(() => keys, [keysSignature]);

  const keyList = useMemo(() => Object.keys(stableKeys) as K[], [stableKeys]);

  // Refs lidas pelo efeito de sync. `keys` costuma chegar inline (CartsListPage,
  // ComparePage) e `setSearchParams` muda de identidade a cada navegação; se
  // qualquer um deles fosse dependência do efeito, cada render dispararia
  // replaceState → nova location → re-render → efeito → loop infinito
  // ("Throttling navigation to prevent the browser from hanging", crbug 1038223).
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  // Estado local do input textual (digitação fluida antes do debounce).
  const initialSearch = searchKey ? (searchParams.get(searchKey) ?? keys[searchKey]) : '';
  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const debouncedSearch = useDebounce(searchInput, debounceMs);

  const updateParam = useCallback(
    (key: string, value: string, defaultValue: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!value || value === defaultValue) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Ref para `updateParam`, pela MESMA razão de `keysRef`/`searchParamsRef`:
  // `setSearchParams` do React Router (`useSearchParams`) é recriado a cada
  // navegação — QUALQUER navegação, não só as desta própria página — porque
  // sua própria implementação depende de `[navigate, searchParams]` (ver
  // node_modules/react-router: `useCallback(..., [navigate, searchParams])`
  // dentro de `useSearchParams`). Logo `updateParam` (que depende de
  // `setSearchParams`) TAMBÉM muda de identidade a cada navegação.
  //
  // ACHADO DA AUDITORIA (2026-09, confirmado empiricamente com teste): com
  // `updateParam` no array de deps do efeito de sync abaixo, QUALQUER
  // navegação externa (clearAll, botão voltar) fazia o efeito refirar e
  // reescrever a URL com o `debouncedSearch` ATUAL — mesmo que este não
  // tivesse mudado — porque a única coisa que mudou foi a identidade de
  // `updateParam`. Como o debounce de uma digitação anterior podia ainda
  // não ter assentado, isso reescrevia a navegação externa com um valor
  // obsoleto. Fix: ler `updateParam` via ref; o efeito só deve reagir a
  // mudanças REAIS de `debouncedSearch`/`searchKey`, nunca a identidade de
  // `updateParam`.
  const updateParamRef = useRef(updateParam);
  updateParamRef.current = updateParam;

  const setValue = useCallback(
    (key: K, value: string) => {
      updateParam(key, value, stableKeys[key]);
      if (key === searchKey) setSearchInput(value);
    },
    [updateParam, stableKeys, searchKey],
  );

  // Sincroniza busca debounced → URL. Idempotente: só navega se a URL ainda
  // não reflete o valor (evita replaceState redundante no mount e corta o loop).
  useEffect(() => {
    if (!searchKey) return;
    const defaultValue = keysRef.current[searchKey];
    const target = !debouncedSearch || debouncedSearch === defaultValue ? null : debouncedSearch;
    if (searchParamsRef.current.get(searchKey) === target) return;
    updateParamRef.current(searchKey, debouncedSearch, defaultValue);
  }, [debouncedSearch, searchKey]);

  // Resync quando a navegação foi por HISTÓRICO (POP: botão voltar/avançar
  // do navegador) — nunca para PUSH/REPLACE (navegações desta própria
  // aplicação, incluindo as escritas do efeito acima, sempre REPLACE).
  //
  // Gatilho é `location.key` (única por navegação, inclusive entre dois
  // POPs consecutivos), NÃO `navigationType` sozinho: `navigationType` é
  // uma string ('POP'|'PUSH'|'REPLACE') que pode permanecer 'POP' entre
  // duas navegações distintas (ex.: o mount inicial de qualquer Router já
  // é 'POP' por padrão; se o usuário volta de novo logo em seguida, o
  // valor não "muda" de 'POP' para 'POP' aos olhos do array de deps, e o
  // efeito nunca re-executa para o 2º evento). Usar `location.key` como
  // gatilho e checar `navigationType` dentro do corpo resolve isso — a
  // combinação foi validada empiricamente (o teste de regressão abaixo
  // falhava silenciosamente com `navigationType` sozinho no array de deps).
  //
  // Sem este resync: digitar → digitar de novo (debounce ainda pendente) →
  // clicar voltar antes do debounce disparar fazia o valor obsoleto
  // sobrescrever a navegação do usuário quando o debounce enfim rodava
  // (achado da auditoria 2026-09, cenário D3).
  useEffect(() => {
    if (!searchKey) return;
    if (navigationType !== 'POP') return;
    const urlValue = searchParamsRef.current.get(searchKey);
    setSearchInput(urlValue ?? keysRef.current[searchKey]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigationType/searchParamsRef/keysRef lidos frescos no corpo; locationKey é o gatilho real (ver comentário acima).
  }, [locationKey, searchKey]);

  const clearAll = useCallback(() => {
    if (searchKey) setSearchInput(stableKeys[searchKey]);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of keyList) next.delete(k);
        return next;
      },
      { replace: true },
    );
  }, [keyList, stableKeys, searchKey, setSearchParams]);

  const values = useMemo(() => {
    const out = {} as Record<K, string>;
    for (const k of keyList) {
      out[k] = searchParams.get(k) ?? stableKeys[k];
    }
    return out;
  }, [keyList, stableKeys, searchParams]);

  return { values, setValue, searchInput, setSearchInput, clearAll };
}
