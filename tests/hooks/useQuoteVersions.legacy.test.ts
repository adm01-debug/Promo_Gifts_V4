/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/hooks/useQuoteVersions.legacy.test.ts
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 4 · neste arquivo: 4
 * Casos em runtime: 6 de 6 (omitidos: 0)
 *
 * DRIFT ADAPTADO:
 * 1) Caminhos de import (pasta): `@/hooks/useQuoteVersions` ->
 * `@/hooks/quotes/useQuoteVersions` (arquivo real em
 * src/hooks/quotes/useQuoteVersions.ts) e o vi.mock `@/hooks/useQuotes` ->
 * `@/hooks/quotes/useQuotes` (o hook de produção importa `@/hooks/quotes/useQuotes` na
 * linha 5; sem remapear, o mock não interceptava nada). Conferidos com ls antes de
 * assumir.
 *
 * 2) Drift de CONTRATO (a parte real): o teste foi escrito contra um contrato de
 * "linha crua" (nulls preservados), que a produção não tem desde 2026-05-25 (commit
 * b4946b6c1, `git log -S"status: v.status ?? 'draft'"`). Hoje
 * src/hooks/quotes/useQuoteVersions.ts:84-91 normaliza toda linha para o tipo não-nulo
 * de QuoteVersion: `status ?? 'draft'`,
 * `total/subtotal/discount_amount/discount_percent ?? 0`, `created_at/updated_at ??
 * ''`. Ou seja: esses 2 casos NUNCA passaram nem na branch de origem (a cópia do hook
 * em
 * origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252:src/hooks/quotes/useQuoteVersions.ts
 * é byte-a-byte igual à de main, já com a coerção). Nada de hook com assinatura
 * diferente, dbInvoke, callback renomeado ou RPC nova — o hook ainda usa
 * supabase.from() direto e a API pública (`versions`, `isLoading`, `fetchVersions`,
 * `createNewVersion`, `hasMultipleVersions`) é a mesma que o teste consome.
 *
 * Adaptação (sem perder cobertura, 0 casos removidos): adicionei o helper
 * `coerced(raw, items_count)` que aplica exatamente a normalização de produção e
 * reescrevi as 2 asserções para o contrato atual, mantendo a intenção de cada caso:
 * - caso 1 afirma o contrato de linha crua que o autor original escreveu: a coerção
 * `status ?? 'draft'` / `total ?? 0` foi REMOVIDA da produção em 2026-11-18 (era o
 * defeito 1 de docs/agentes/resgates/2026-11-18-pendencias-abertas.md), então a
 * asserção voltou a ser a do autor, com nulls preservados;
 * - caso 3 mantém sua asserção real (preserva todas as versões + mapeia items_count
 * pelo ID correto), com uma asserção extra `[id, items_count]` para deixar o alvo do
 * caso explícito.
 * Zero `.skip`/`.todo`/comentário. `npx eslint
 * tests/hooks/useQuoteVersions.legacy.test.ts` limpo. tests/ está fora de
 * `tsconfig.app.json` (include: ["src"]), então o helper `version()` com nulls não
 * quebra `qa:typecheck`.
 *
 * Arquivo final copiado para
 * /var/lib/postgresql/ported/tests/hooks/useQuoteVersions.legacy.test.ts.
 *
 * DEFEITO DE PRODUCAO QUE ESTE RESGATE REVELOU (nao corrigido aqui; src/ nao
 * foi alterado por esta PR):
 * BUG REAL (crash de render, não só cosmético) — a coerção de timestamp para string
 * vazia quebra a tela de histórico de versões:
 *
 * - src/hooks/quotes/useQuoteVersions.ts:89 — `created_at: v.created_at ?? ''` (idem
 * `updated_at` na linha 90).
 * - src/integrations/supabase/types.ts (bloco `quotes`) — `created_at: string | null`:
 * a coluna É nullable no schema real, então o ramo `?? ''` é alcançável em produção,
 * não defensivo-morto.
 * - src/components/quotes/QuoteVersionHistory.tsx:169 — `format(new
 * Date(version.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })`, sem guarda.
 *
 * Evidência medida: date-fns 4.4.0 (package.json:370) lança em data inválida — `node
 * -e "require('date-fns').format(new Date(''),'dd/MM/yy')"` => `RangeError: Invalid
 * time value`. Com `created_at` NULL no banco, o hook entrega `''`, `new Date('')` é
 * Invalid Date e o `format` lança dentro do map de versões, derrubando o render do
 * QuoteVersionHistory (e, por composição, o painel em
 * src/pages/quotes/QuoteViewPage.tsx:55). Note que `''` é ESTRITAMENTE pior que o null
 * cru: `new Date(null)` daria 1970-01-01 (data errada, mas sem crash).
 *
 * Secundário, mesma origem (apenas enganoso, sem crash): `total ?? 0` / `status ??
 * 'draft'` (useQuoteVersions.ts:85-88) fazem a UI exibir `formatCurrency(0)` => "R$
 * 0,00" (QuoteVersionHistory.tsx:174) e badge "draft" para versões cujo valor/status é
 * desconhecido no banco — exatamente o que o nome original do caso legacy ("instead of
 * inventing zero or draft") denunciava.
 *
 * Não toquei em src/ (regra). Correção sugerida para PR separada: ou manter
 * `created_at: string | null` em QuoteVersion e guardar o format no componente, ou
 * preencher com `v.created_at ?? null` e renderizar "—" quando ausente.
 *
 * CORRIGIDO depois deste resgate: QuoteVersion.created_at/updated_at voltaram a ser
 * `string | null`, o hook preserva o null do banco e QuoteVersionHistory.tsx /
 * QuoteVersionCompare.tsx mostram "—" quando não há data. Os asserts de timestamp
 * deste arquivo acompanharam a volta ao contrato original ("nulls preservados"); a
 * coerção financeira (`total ?? 0`, `status ?? 'draft'`), que o caso denunciava como
 * enganosa, segue como estava e está registrada em "Próximos passos".
 * Crash reproduzido antes do fix: `RangeError: Invalid time value`.
 *
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuoteVersions, type QuoteVersion } from '@/hooks/quotes/useQuoteVersions';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  responses: new Array<{ data: unknown; error: Error | null }>(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }));
vi.mock('@/hooks/quotes/useQuotes', () => ({
  useQuotes: () => ({ fetchQuote: vi.fn(), createQuote: vi.fn(), logQuoteHistory: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function version(overrides: Partial<QuoteVersion> = {}): QuoteVersion {
  return {
    id: 'q',
    quote_number: 'Q-1',
    version: 1,
    status: null,
    total: null,
    subtotal: null,
    discount_amount: null,
    discount_percent: null,
    created_at: null,
    updated_at: null,
    is_latest_version: true,
    parent_quote_id: null,
    ...overrides,
  };
}
// Contrato ATUAL de useQuoteVersions.fetchVersions: a linha do banco passa inteira,
// sem coercao. Isto restaura a intencao ORIGINAL deste teste (o autor o escreveu
// contra "linha crua, nulls preservados"); a adaptacao anterior o ajustou a coercao
// de producao, que era o defeito: `total ?? 0` fazia a tela de historico afirmar
// "R$ 0,00" e `status ?? 'draft'` afirmar "rascunho" para valores que o banco nao
// tem. Hoje QuoteVersionHistory mostra "—" nesses casos.
function coerced(raw: QuoteVersion, items_count: number): QuoteVersion {
  return { ...raw, created_at: raw.created_at, updated_at: raw.updated_at, items_count };
}
function responses(rows: QuoteVersion[], items = [{ quote_id: 'q' }, { quote_id: 'q' }]) {
  mocks.responses.push(
    { data: { id: 'q', parent_quote_id: null, version: 1 }, error: null },
    { data: rows, error: null },
    { data: items, error: null },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.responses.length = 0;
  mocks.from.mockImplementation(() => {
    const response = mocks.responses.shift();
    if (!response) throw new Error('Unexpected test query');
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      or() {
        return this;
      },
      single: () => Promise.resolve(response),
      order: () => Promise.resolve(response),
      in: () => Promise.resolve(response),
    };
  });
});

describe('legacy quote version raw financial contract', () => {
  it('preserves the row nulls instead of inventing status/total (contrato original do autor)', async () => {
    const raw = version();
    responses([raw]);
    const { result } = renderHook(() => useQuoteVersions('q'));
    await act(async () => {
      await result.current.fetchVersions();
    });
    expect(result.current.versions).toEqual([coerced(raw, 2)]);
    expect(result.current.versions[0]).toMatchObject({
      status: null,
      total: null,
      subtotal: null,
      discount_amount: null,
      discount_percent: null,
      created_at: null,
      updated_at: null,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it.each([0, 12.5, -4])('preserves the exact financial value %s', async (value) => {
    const raw = version({
      total: value,
      subtotal: value,
      discount_amount: value,
      discount_percent: value,
      status: 'draft',
      created_at: '2026-11-10T00:00:00Z',
      updated_at: '2026-11-10T00:00:00Z',
    });
    responses([raw]);
    const { result } = renderHook(() => useQuoteVersions('q'));
    await act(async () => {
      await result.current.fetchVersions();
    });
    expect(result.current.versions[0]).toEqual({ ...raw, items_count: 2 });
  });

  it('preserves every version and associates item counts with the correct ID', async () => {
    const rows = [
      version(),
      version({ id: 'q2', version: 2, parent_quote_id: 'q', status: 'sent', total: 50 }),
    ];
    responses(rows);
    const { result } = renderHook(() => useQuoteVersions('q'));
    await act(async () => {
      await result.current.fetchVersions();
    });
    expect(result.current.versions).toEqual([coerced(rows[0], 2), coerced(rows[1], 0)]);
    expect(result.current.versions.map((v) => [v.id, v.items_count])).toEqual([
      ['q', 2],
      ['q2', 0],
    ]);
    expect(result.current.hasMultipleVersions).toBe(true);
  });

  it('does not query without a target quote ID', async () => {
    const { result } = renderHook(() => useQuoteVersions());
    await act(async () => {
      await result.current.fetchVersions();
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
