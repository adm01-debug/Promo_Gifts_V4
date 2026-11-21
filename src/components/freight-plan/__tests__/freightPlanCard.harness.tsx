/**
 * Apoio dos testes do card do plano de volumes: cliente Supabase simulado com
 * as caixas padrão, os parâmetros de frete e os produtos reais da fixture, e um
 * hospedeiro que guarda o estado do orçamento como a página faz.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CAIXAS_PADRAO } from '@/lib/freight/__tests__/fixtures/boxes';
import { ALL_PRODUCT_FIXTURES } from '@/lib/freight/__tests__/fixtures/products';
import type { MixMode } from '@/lib/freight';
import { FreightPlanCard, type FreightPlanCardItem } from '../FreightPlanCard';

/** O que o banco devolve para `shipping_boxes`, a partir das caixas da fixture. */
export function shippingBoxRows() {
  return CAIXAS_PADRAO.map((box, index) => ({
    id: box.id,
    code: box.code,
    name: box.name,
    inner_height_cm: box.inner.heightCm,
    inner_width_cm: box.inner.widthCm,
    inner_length_cm: box.inner.lengthCm,
    outer_height_cm: box.outer.heightCm,
    outer_width_cm: box.outer.widthCm,
    outer_length_cm: box.outer.lengthCm,
    empty_weight_g: box.emptyWeightG,
    max_weight_g: box.maxWeightG,
    fill_factor: box.fillFactor,
    is_active: true,
    sort_order: index,
    deleted_at: null,
    updated_at: simulacao.caixasAtualizadasEm,
  }));
}

export const FREIGHT_SETTINGS_ROW = {
  id: true,
  origin_cep: '13015-000',
  cubic_divisor_correios: 6000,
  cubic_divisor_rodoviario: 3333,
  default_fill_factor: 0.9,
  internal_buffer_days: 0,
  multi_personalization_rule: 'max',
};

interface Resultado {
  data: unknown;
  error: null;
}

/** Monta o encadeamento do PostgREST: cada método devolve o próprio objeto e `await` entrega o resultado. */
function consulta(resolve: (ids: readonly string[] | null) => unknown) {
  let ids: readonly string[] | null = null;
  const builder = {
    select: () => builder,
    is: () => builder,
    eq: () => builder,
    order: () => builder,
    overrideTypes: () => builder,
    in: (_coluna: string, valores: readonly string[]) => {
      ids = valores;
      return builder;
    },
    maybeSingle: () => Promise.resolve<Resultado>({ data: resolve(ids), error: null }),
    then: (
      ok: (valor: Resultado) => unknown,
      falha: (motivo: unknown) => unknown,
    ): Promise<unknown> =>
      Promise.resolve<Resultado>({ data: resolve(ids), error: null }).then(ok, falha),
  };
  return builder;
}

/** Última atualização das caixas, simulada pelo harness; o card a usa no banner stale. */
export const simulacao = {
  semCaixas: false,
  separados: new Set<string>(),
  caixasAtualizadasEm: '2026-11-01T00:00:00.000Z',
};

/** Registro dos inserts de telemetria para os testes espiarem (etapa 59). */
export const telemetriaInserts: Array<Record<string, unknown>> = [];

export function reiniciarSimulacao() {
  simulacao.semCaixas = false;
  simulacao.separados.clear();
  simulacao.caixasAtualizadasEm = '2026-11-01T00:00:00.000Z';
  telemetriaInserts.length = 0;
}

/** `supabase.from(tabela)` da simulação. Tabela desconhecida devolve lista vazia. */
export function fromSimulado(tabela: string) {
  if (tabela === 'shipping_boxes')
    return consulta(() => (simulacao.semCaixas ? [] : shippingBoxRows()));
  if (tabela === 'freight_settings') return consulta(() => FREIGHT_SETTINGS_ROW);
  if (tabela === 'products') {
    return consulta((ids) =>
      ALL_PRODUCT_FIXTURES.filter((row) => ids?.includes(row.id)).map((row) => ({
        ...row,
        ships_separately: simulacao.separados.has(row.id),
      })),
    );
  }
  if (tabela === 'frontend_telemetry') {
    const builder = consulta(() => []) as {
      insert?: (row: Record<string, unknown>) => Promise<{ data: null; error: null }>;
    };
    builder.insert = (row: Record<string, unknown>) => {
      telemetriaInserts.push(row);
      return Promise.resolve({ data: null, error: null });
    };
    return builder;
  }
  return consulta(() => []);
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

/** Hospedeiro: guarda itens, modo, switch e o plano salvo como o `useQuoteBuilderState` faz. */
export function CardHost({
  initialItems,
  initialShow = false,
  initialSavedPlan = null,
}: {
  initialItems: FreightPlanCardItem[];
  initialShow?: boolean;
  initialSavedPlan?: FreightPlan | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [observacoes, setObservacoes] = useState('');
  const [mixMode, setMixMode] = useState<MixMode>('misturar');
  const [show, setShow] = useState(initialShow);
  const [savedPlan, setSavedPlan] = useState<FreightPlan | null>(initialSavedPlan);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setItems((atuais) =>
            atuais.map((item, index) =>
              index === 0 ? { ...item, quantity: item.quantity * 2 } : item,
            ),
          )
        }
      >
        Dobrar quantidade
      </button>
      <input
        aria-label="Observações"
        value={observacoes}
        onChange={(event) => setObservacoes(event.target.value)}
      />
      <FreightPlanCard
        items={items}
        mixMode={mixMode}
        onMixModeChange={setMixMode}
        showToClient={show}
        onShowToClientChange={setShow}
        onPlanChange={setSavedPlan}
        savedPlan={savedPlan}
      />
    </>
  );
}
