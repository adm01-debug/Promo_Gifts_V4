/**
 * Destrava o kit cujo catálogo ainda não informou preço: consulta o catálogo de
 * novo e substitui `price`/`priceKnown` SÓ nas linhas desconhecidas, preservando
 * o restante do snapshot (quantidade, variante, personalização) e o passo do
 * wizard. Vive em módulo próprio porque `useKitBuilderPageState.ts` já está no
 * teto de `.file-size-baseline.json`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { hasKnownKitPrice } from '@/lib/kit-builder/pricing-availability';
import type {
  KitBox,
  KitBuilderFlow,
  KitBuilderStep,
  KitIdentity,
  KitItem,
  KitPersonalization,
  KitState,
  KitType,
} from '@/lib/kit-builder';

/** Mesma forma do retorno de `refetch` do react-query, sem acoplar ao tipo dele. */
interface CatalogResult<T> {
  data?: T[];
  error?: unknown;
}

/** Idêntico ao parâmetro de `useKitBuilder().loadKit`. */
interface LoadKitInput {
  name: string;
  kitType: KitType;
  box: KitBox | null;
  items: KitItem[];
  personalization: KitPersonalization;
  kitQuantity: number;
  identity?: KitIdentity;
  notes?: string;
  flow?: KitBuilderFlow;
}

interface CatalogRefreshDeps {
  refetchBoxes: () => Promise<CatalogResult<KitBox>>;
  refetchItems: () => Promise<CatalogResult<KitItem>>;
  loadKit: (data: LoadKitInput) => void;
  goToStep: (step: KitBuilderStep) => void;
}

/** Lido só quando a resposta do catálogo chega — nunca capturado na closure. */
interface CatalogRefreshLiveState {
  kitState: KitState;
  kitQuantity: number;
  flow: KitBuilderFlow;
  step: KitBuilderStep;
}

export interface KitPriceRefresh {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useKitCatalogPriceRefresh(
  /** Identidade usuário+kit: ao mudar, a resposta em voo é descartada. */
  scope: string,
  deps: CatalogRefreshDeps,
  live: CatalogRefreshLiveState,
): KitPriceRefresh {
  const [isRefreshing, setIsRefreshing] = useState(false);
  // GUARDA 1: contador de requisição — só a última consulta disparada escreve.
  const requestRef = useRef(0);
  // GUARDA 2: montagem — resposta que chega após o desmonte não escreve nada.
  const mountedRef = useRef(true);
  // GUARDA 3: escopo — trocar de kit/usuário invalida a consulta em voo.
  const scopeRef = useRef(scope);
  /**
   * Id da consulta em voo (0 = nenhuma). Guarda o ID, e nao um booleano, por
   * dois motivos achados na revisao:
   *  - trocar de kit com consulta em voo tem de LIBERAR o botao de verdade.
   *    Com booleano, `isRefreshing` virava false (botao habilitado) e o clique
   *    caia no `return` — botao vivo na tela e morto no clique, que e
   *    exatamente o beco sem saida que esta acao existe para resolver;
   *  - e o `finally` da consulta velha nao pode liberar a consulta NOVA, senao
   *    abriria caminho para duas em paralelo. Comparar o id resolve os dois.
   */
  const inFlightRef = useRef(0);
  const depsRef = useRef(deps);
  const liveRef = useRef(live);
  depsRef.current = deps;
  liveRef.current = live;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      inFlightRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (scopeRef.current === scope) return;
    scopeRef.current = scope;
    requestRef.current += 1;
    // A consulta velha ja esta invalidada por requestRef/scopeAtStart: ela nao
    // escreve mais nada. Liberar o slot aqui deixa o kit novo pedir preco na
    // hora, em vez de esperar a resposta velha chegar.
    inFlightRef.current = 0;
    setIsRefreshing(false);
  }, [scope]);

  const refresh = useCallback(async () => {
    if (inFlightRef.current !== 0) return;
    const request = ++requestRef.current;
    inFlightRef.current = request;
    const scopeAtStart = scopeRef.current;
    setIsRefreshing(true);
    const isCurrent = () =>
      mountedRef.current && request === requestRef.current && scopeAtStart === scopeRef.current;
    try {
      const [itemResult, boxResult] = await Promise.all([
        depsRef.current.refetchItems(),
        depsRef.current.refetchBoxes(),
      ]);
      if (!isCurrent()) return;
      // Falha de consulta nunca promove fato em cache a preço conhecido.
      if (itemResult.error || boxResult.error) {
        throw new Error('Não foi possível consultar os preços do catálogo. Tente novamente.');
      }
      const current = liveRef.current;
      let updated = 0;
      const items = current.kitState.items.map((item) => {
        const fact = itemResult.data?.find((candidate) => candidate.id === item.id);
        if (item.priceKnown !== false || !fact || !hasKnownKitPrice(fact)) return item;
        updated += 1;
        return { ...item, price: fact.price, priceKnown: true };
      });
      let box = current.kitState.box;
      const boxFact = boxResult.data?.find((candidate) => candidate.id === box?.id);
      if (box?.priceKnown === false && boxFact && hasKnownKitPrice(boxFact)) {
        box = { ...box, price: boxFact.price, priceKnown: true };
        updated += 1;
      }
      if (!updated) {
        toast.info('O catálogo ainda não informa um preço válido para os produtos pendentes.');
        return;
      }
      depsRef.current.loadKit({
        ...current.kitState,
        box,
        items,
        kitQuantity: current.kitQuantity,
        flow: current.flow,
      });
      // `loadKit` força o passo "summary"; o usuário volta para onde estava.
      depsRef.current.goToStep(current.step);
      toast.success('Preços atualizados com os valores confirmados no catálogo.');
    } catch (error) {
      if (isCurrent()) {
        toast.error(
          error instanceof Error ? error.message : 'Não foi possível atualizar os preços.',
        );
      }
    } finally {
      // So quem ainda detem o slot o libera: o finally de uma consulta
      // descartada nao pode soltar a consulta que a substituiu.
      if (inFlightRef.current === request) inFlightRef.current = 0;
      if (isCurrent()) setIsRefreshing(false);
    }
  }, []);

  return useMemo(() => ({ refresh, isRefreshing }), [refresh, isRefreshing]);
}
