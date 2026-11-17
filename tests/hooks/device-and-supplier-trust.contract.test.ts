/**
 * Resgatado de `importado`/`codex/fix-gate1-kit-pdf-types-261109-2252` (11/11/2026),
 * branch de outro agente que nunca foi mergeada. A `main` não tinha NENHUM teste de
 * `trustDevice` nem de `useSupplierTrust`:
 *   grep -rln "trustDevice\|is_trusted" tests/ src/ --include=*.test.* → vazio
 *
 * Adaptações feitas no resgate (o original não rodaria na `main`):
 *  - `@/hooks/useDeviceDetection`  → `@/hooks/admin/useDeviceDetection` (a main moveu)
 *  - `@/hooks/useSupplierTrust`    → `@/hooks/products/useSupplierTrust` (a main moveu)
 *  - o mock de `@/lib/external-db/bridge` virou mock de `@/lib/db/postgrest` (`dbInvoke`),
 *    que é o que o hook da main realmente usa (`useSupplierTrust.ts:6`)
 *  - removido o bloco que dependia de `tests/fixtures/supplier-trust-demo.ts`: era a
 *    ressurreição do mock `getMockSupplierTrust`, que a main apagou de propósito
 *    (PR #2963) e que o AGENTS.md proíbe
 *
 * Os dois contratos que isto protege:
 *  1. marcar um aparelho como confiável só pode responder "salvo" se o UPDATE atingiu
 *     uma linha DO PRÓPRIO usuário — senão o sistema diz "confiável" sem ter gravado;
 *  2. a vitrine de fornecedor mostra dado real ou "desconhecido", nunca valor inventado.
 */
import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string },
  untypedFrom: vi.fn(),
  dbInvoke: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/lib/supabase-untyped', () => ({ untypedFrom: mocks.untypedFrom }));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: mocks.dbInvoke }));
vi.mock('@/lib/edge/safeInvokeCall', () => ({ invokeEdge: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useDeviceDetection } from '@/hooks/admin/useDeviceDetection';
import { useSupplierTrust } from '@/hooks/products/useSupplierTrust';

const OWNER = '11111111-1111-4111-8111-111111111111';
const DEVICE = '00000000-0000-4000-8000-000000000001';

const chain = {
  update: mocks.update,
  eq: mocks.eq,
  select: mocks.select,
  maybeSingle: mocks.maybeSingle,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: OWNER };
  mocks.untypedFrom.mockReturnValue(chain);
  mocks.update.mockReturnValue(chain);
  mocks.eq.mockReturnValue(chain);
  mocks.select.mockReturnValue(chain);
});

const responses = [
  { name: 'uma linha atingida', data: { id: DEVICE }, error: null, expected: true },
  { name: 'nenhuma linha atingida', data: null, error: null, expected: false },
  { name: 'data ausente', data: undefined, error: null, expected: false },
  {
    name: 'coluna inexistente (42703)',
    data: null,
    error: { code: '42703', message: 'column missing' },
    expected: false,
  },
  {
    name: 'negado por RLS (42501)',
    data: null,
    error: { code: '42501', message: 'permission denied' },
    expected: false,
  },
  {
    name: 'mais de uma linha (PGRST116)',
    data: null,
    error: { code: 'PGRST116', message: 'multiple rows' },
    expected: false,
  },
];

const deviceCases = responses.flatMap((response) =>
  ['current', 'explicit', 'anonymous'].map((auth) => ({
    name: `${response.name} — ${auth}`,
    response,
    auth,
  })),
);

describe('confiar em dispositivo nunca responde sucesso sem gravar linha', () => {
  it.each(deviceCases)('$name', async ({ response, auth }) => {
    mocks.user = auth === 'anonymous' ? null : { id: OWNER };
    mocks.maybeSingle.mockResolvedValue(response);

    const { result, unmount } = renderHook(() =>
      useDeviceDetection(auth === 'explicit' ? OWNER : undefined),
    );

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.trustDevice(DEVICE);
    });

    expect(saved).toBe(auth === 'anonymous' ? false : response.expected);

    if (auth === 'anonymous') {
      // Sem usuário não pode nem tentar o UPDATE (useDeviceDetection.ts:174).
      expect(mocks.update).not.toHaveBeenCalled();
    } else {
      expect(mocks.update).toHaveBeenCalledWith({ is_trusted: true });
      // O escopo por user_id é o que impede confiar no aparelho de outra pessoa.
      expect(mocks.eq.mock.calls).toEqual([
        ['id', DEVICE],
        ['user_id', OWNER],
      ]);
      expect(mocks.select).toHaveBeenCalledWith('id');
      expect(mocks.maybeSingle).toHaveBeenCalledTimes(1);
    }

    unmount();
  });
});

const noTrust = { isVerified: false, deliveryDays: null, avgRating: null };

const preferredSource = {
  records: [
    {
      id: 'source',
      supplier_id: 'supplier',
      lead_time_days: 3,
      is_preferred: true,
      is_active: true,
    },
  ],
};

const supplierCases: {
  name: string;
  responses: unknown[];
  failure?: boolean;
  expected: { isVerified: boolean; deliveryDays: number | null; avgRating: number | null };
}[] = [
  { name: 'produto sem variante', responses: [{ records: [] }], expected: noTrust },
  {
    name: 'variante sem fornecedor',
    responses: [{ records: [{ id: 'variant' }] }, { records: [] }],
    expected: noTrust,
  },
  {
    name: 'fornecedor ativo',
    responses: [
      { records: [{ id: 'variant' }] },
      preferredSource,
      { records: [{ id: 'supplier', name: 'Real', active: true }] },
    ],
    expected: { isVerified: true, deliveryDays: 3, avgRating: null },
  },
  {
    name: 'fornecedor inativo',
    responses: [
      { records: [{ id: 'variant' }] },
      preferredSource,
      { records: [{ id: 'supplier', name: 'Real', active: false }] },
    ],
    expected: { isVerified: false, deliveryDays: 3, avgRating: null },
  },
  {
    // suppliers.active é nullable em produção (information_schema: is_nullable=YES,
    // default true). Sem coerção, `active: null` vazava como null para a tela em vez
    // de "não verificado" — era o que este caso pegava.
    name: 'fornecedor com status indefinido vale como não verificado',
    responses: [
      { records: [{ id: 'variant' }] },
      preferredSource,
      { records: [{ id: 'supplier', name: 'Real', active: null }] },
    ],
    expected: { isVerified: false, deliveryDays: 3, avgRating: null },
  },
  { name: 'consulta falhou', responses: [], failure: true, expected: noTrust },
];

describe('vitrine de fornecedor usa dado real ou desconhecido', () => {
  it.each(supplierCases)('$name', async ({ responses: rs, expected, failure }) => {
    if (failure) mocks.dbInvoke.mockRejectedValue(new Error('unavailable'));
    else for (const response of rs) mocks.dbInvoke.mockResolvedValueOnce(response);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    const { result, unmount } = renderHook(() => useSupplierTrust('product'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expected);
    // A ordem das três consultas é o contrato: variante → fonte → fornecedor.
    expect(
      mocks.dbInvoke.mock.calls.map((call) => (call[0] as { table: string }).table),
    ).toEqual(
      ['product_variants', 'variant_supplier_sources', 'suppliers'].slice(
        0,
        mocks.dbInvoke.mock.calls.length,
      ),
    );

    unmount();
    client.clear();
  });
});
